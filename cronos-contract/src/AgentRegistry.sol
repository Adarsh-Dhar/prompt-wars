// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @notice A registry for AI agents that provides proof-of-work verification with bond staking
 * @dev Agents must post a bond to register and can be slashed for failing to fulfill requests
 */
contract AgentRegistry is Ownable, ReentrancyGuard {
    // Constants for max lengths
    uint256 public constant MAX_NAME = 32;
    uint256 public constant MAX_URL = 128;
    uint256 public constant MAX_TAGS = 8;
    uint256 public constant MAX_TAG_LEN = 24;
    uint256 public constant MAX_PROOF_URI = 256;

    // Registry configuration
    uint256 public bondAmount;
    uint256 public slashPenalty;

    // Structs
    struct Agent {
        address authority;
        address agentWallet;
        string name;
        string url;
        string[] tags;
        uint256 bondAmount;
        uint256 requestCount;
        bytes32 pendingRequest; // 0x0 if none
        bool active;
    }

    struct ProofRequest {
        bytes32 requestId;
        address agent;
        address requester;
        bytes32 marketId;
        uint256 requestedAt;
        uint256 deadlineTs;
        string proofUri;
        bytes32 logRoot;
        bytes signature; // 64 bytes
        bool fulfilled;
        bool slashable;
    }

    // State variables
    mapping(address => Agent) public agents; // agent address => Agent
    mapping(address => uint256) public agentVaults; // agent address => staked bond
    mapping(bytes32 => ProofRequest) public proofRequests; // requestId => ProofRequest
    mapping(address => bytes32[]) public agentRequests; // agent => request IDs

    // Counters
    uint256 public totalAgents;
    uint256 public totalRequests;

    // Events
    event RegistryInitialized(
        uint256 bondAmount,
        uint256 slashPenalty
    );

    event AgentRegistered(
        address indexed agentAddress,
        address indexed authority,
        address indexed agentWallet,
        string name,
        uint256 bondAmount
    );

    event MetadataUpdated(
        address indexed agentAddress,
        string name,
        string url
    );

    event RequestProofEvent(
        address indexed agent,
        bytes32 indexed marketId,
        uint256 deadlineTs,
        bytes32 indexed requestId
    );

    event ProofSubmitted(
        address indexed agent,
        bytes32 indexed marketId,
        bytes32 indexed requestId,
        string proofUri,
        bytes32 logRoot
    );

    event AgentSlashed(
        address indexed agent,
        bytes32 indexed requestId,
        bytes32 marketId,
        uint256 penalty
    );

    event BondWithdrawn(
        address indexed agent,
        address indexed authority,
        uint256 amount
    );

    // Errors
    error NameTooLong();
    error NameEmpty();
    error UrlTooLong();
    error UrlEmpty();
    error TooManyTags();
    error TagTooLong();
    error TagEmpty();
    error Unauthorized();
    error DeadlineInPast();
    error RequestAlreadyFulfilled();
    error InvalidRequest();
    error NotSlashable();
    error DeadlineNotReached();
    error ActiveRequestPresent();
    error InsufficientVaultBalance();
    error ProofUriTooLong();
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error InsufficientBond();
    error InvalidSlashPenalty();

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Initialize the registry with bond and slash penalty amounts
     * @param _bondAmount Amount required to register an agent (in wei)
     * @param _slashPenalty Amount slashed for failing to fulfill requests (in wei)
     */
    function initializeRegistry(
        uint256 _bondAmount,
        uint256 _slashPenalty
    ) external onlyOwner {
        require(bondAmount == 0, "Already initialized");
        require(_slashPenalty <= _bondAmount, "Slash penalty too high");
        
        bondAmount = _bondAmount;
        slashPenalty = _slashPenalty;

        emit RegistryInitialized(_bondAmount, _slashPenalty);
    }

    /**
     * @notice Update registry parameters
     * @param _bondAmount New bond amount
     * @param _slashPenalty New slash penalty
     */
    function updateRegistryParams(
        uint256 _bondAmount,
        uint256 _slashPenalty
    ) external onlyOwner {
        if (_slashPenalty > _bondAmount) revert InvalidSlashPenalty();
        
        bondAmount = _bondAmount;
        slashPenalty = _slashPenalty;
    }

    /**
     * @notice Register a new agent by staking a bond
     * @param agentAddress The unique address for this agent
     * @param agentWallet The wallet where funds should be sent
     * @param name Agent name (max 32 chars)
     * @param url Agent URL (max 128 chars)
     * @param tags Agent tags (max 8 tags, each max 24 chars)
     */
    function registerAgent(
        address agentAddress,
        address agentWallet,
        string memory name,
        string memory url,
        string[] memory tags
    ) external payable nonReentrant {
        if (agents[agentAddress].active) revert AgentAlreadyRegistered();
        if (msg.value < bondAmount) revert InsufficientBond();
        
        _validateMetadata(name, url, tags);

        agents[agentAddress] = Agent({
            authority: msg.sender,
            agentWallet: agentWallet,
            name: name,
            url: url,
            tags: tags,
            bondAmount: bondAmount,
            requestCount: 0,
            pendingRequest: bytes32(0),
            active: true
        });

        agentVaults[agentAddress] = msg.value;
        totalAgents++;

        emit AgentRegistered(
            agentAddress,
            msg.sender,
            agentWallet,
            name,
            msg.value
        );
    }

    /**
     * @notice Update agent metadata
     * @param agentAddress The agent's address
     * @param name New name
     * @param url New URL
     * @param tags New tags
     */
    function updateMetadata(
        address agentAddress,
        string memory name,
        string memory url,
        string[] memory tags
    ) external {
        Agent storage agent = agents[agentAddress];
        if (!agent.active) revert AgentNotRegistered();
        if (agent.authority != msg.sender) revert Unauthorized();
        
        _validateMetadata(name, url, tags);

        agent.name = name;
        agent.url = url;
        agent.tags = tags;

        emit MetadataUpdated(agentAddress, name, url);
    }

    /**
     * @notice Request proof from an agent
     * @param agentAddress The agent to request from
     * @param marketId The market ID requiring proof
     * @param deadlineTs Unix timestamp deadline
     */
    function requestProof(
        address agentAddress,
        bytes32 marketId,
        uint256 deadlineTs
    ) external nonReentrant returns (bytes32 requestId) {
        if (deadlineTs <= block.timestamp) revert DeadlineInPast();
        
        Agent storage agent = agents[agentAddress];
        if (!agent.active) revert AgentNotRegistered();
        if (agent.pendingRequest != bytes32(0)) revert ActiveRequestPresent();

        // Generate unique request ID
        requestId = keccak256(
            abi.encodePacked(
                agentAddress,
                marketId,
                msg.sender,
                block.timestamp,
                totalRequests
            )
        );

        proofRequests[requestId] = ProofRequest({
            requestId: requestId,
            agent: agentAddress,
            requester: msg.sender,
            marketId: marketId,
            requestedAt: block.timestamp,
            deadlineTs: deadlineTs,
            proofUri: "",
            logRoot: bytes32(0),
            signature: "",
            fulfilled: false,
            slashable: true
        });

        agent.requestCount++;
        agent.pendingRequest = requestId;
        agentRequests[agentAddress].push(requestId);
        totalRequests++;

        emit RequestProofEvent(
            agentAddress,
            marketId,
            deadlineTs,
            requestId
        );
    }

    /**
     * @notice Submit proof for a request
     * @param requestId The request ID
     * @param marketId The market ID (for verification)
     * @param logRoot The log root hash
     * @param proofUri URI to the proof
     * @param signature Agent signature (64 bytes)
     */
    function submitProof(
        bytes32 requestId,
        bytes32 marketId,
        bytes32 logRoot,
        string memory proofUri,
        bytes memory signature
    ) external nonReentrant {
        if (bytes(proofUri).length > MAX_PROOF_URI) revert ProofUriTooLong();
        
        ProofRequest storage request = proofRequests[requestId];
        if (request.requestId == bytes32(0)) revert InvalidRequest();
        if (request.fulfilled) revert RequestAlreadyFulfilled();
        if (request.marketId != marketId) revert InvalidRequest();

        Agent storage agent = agents[request.agent];
        if (agent.authority != msg.sender) revert Unauthorized();

        request.proofUri = proofUri;
        request.logRoot = logRoot;
        request.signature = signature;
        request.fulfilled = true;
        request.slashable = false;
        
        agent.pendingRequest = bytes32(0);

        emit ProofSubmitted(
            request.agent,
            marketId,
            requestId,
            proofUri,
            logRoot
        );
    }

    /**
     * @notice Slash an agent for failing to fulfill a request by the deadline
     * @param requestId The unfulfilled request ID
     */
    function slashAgent(bytes32 requestId) external nonReentrant {
        ProofRequest storage request = proofRequests[requestId];
        
        if (request.requestId == bytes32(0)) revert InvalidRequest();
        if (!request.slashable) revert NotSlashable();
        if (request.fulfilled) revert RequestAlreadyFulfilled();
        if (block.timestamp <= request.deadlineTs) revert DeadlineNotReached();

        Agent storage agent = agents[request.agent];
        uint256 vaultBalance = agentVaults[request.agent];
        
        if (vaultBalance < slashPenalty) revert InsufficientVaultBalance();

        // Transfer slash penalty to registry owner
        agentVaults[request.agent] -= slashPenalty;
        (bool success, ) = owner().call{value: slashPenalty}("");
        require(success, "Transfer failed");

        // Mark request as resolved
        request.slashable = false;
        request.fulfilled = true;
        agent.pendingRequest = bytes32(0);

        emit AgentSlashed(
            request.agent,
            requestId,
            request.marketId,
            slashPenalty
        );
    }

    /**
     * @notice Withdraw bond and deregister agent
     * @param agentAddress The agent address
     */
    function withdrawBond(address agentAddress) external nonReentrant {
        Agent storage agent = agents[agentAddress];
        
        if (!agent.active) revert AgentNotRegistered();
        if (agent.authority != msg.sender) revert Unauthorized();
        if (agent.pendingRequest != bytes32(0)) revert ActiveRequestPresent();

        uint256 vaultBalance = agentVaults[agentAddress];
        if (vaultBalance < agent.bondAmount) revert InsufficientVaultBalance();

        // Transfer all remaining funds back
        agentVaults[agentAddress] = 0;
        agent.active = false;
        totalAgents--;

        (bool success, ) = msg.sender.call{value: vaultBalance}("");
        require(success, "Transfer failed");

        emit BondWithdrawn(agentAddress, msg.sender, vaultBalance);
    }

    /**
     * @notice Top up an agent's vault (in case of slashing)
     * @param agentAddress The agent to top up
     */
    function topUpVault(address agentAddress) external payable {
        Agent storage agent = agents[agentAddress];
        if (!agent.active) revert AgentNotRegistered();
        
        agentVaults[agentAddress] += msg.value;
    }

    // View functions

    /**
     * @notice Get agent details
     * @param agentAddress The agent address
     */
    function getAgent(address agentAddress) external view returns (
        address authority,
        address agentWallet,
        string memory name,
        string memory url,
        string[] memory tags,
        uint256 _bondAmount,
        uint256 requestCount,
        bytes32 pendingRequest,
        bool active
    ) {
        Agent storage agent = agents[agentAddress];
        return (
            agent.authority,
            agent.agentWallet,
            agent.name,
            agent.url,
            agent.tags,
            agent.bondAmount,
            agent.requestCount,
            agent.pendingRequest,
            agent.active
        );
    }

    /**
     * @notice Get proof request details
     * @param requestId The request ID
     */
    function getProofRequest(bytes32 requestId) external view returns (
        address agent,
        address requester,
        bytes32 marketId,
        uint256 requestedAt,
        uint256 deadlineTs,
        string memory proofUri,
        bytes32 logRoot,
        bytes memory signature,
        bool fulfilled,
        bool slashable
    ) {
        ProofRequest storage request = proofRequests[requestId];
        return (
            request.agent,
            request.requester,
            request.marketId,
            request.requestedAt,
            request.deadlineTs,
            request.proofUri,
            request.logRoot,
            request.signature,
            request.fulfilled,
            request.slashable
        );
    }

    /**
     * @notice Get all request IDs for an agent
     * @param agentAddress The agent address
     */
    function getAgentRequests(address agentAddress) external view returns (bytes32[] memory) {
        return agentRequests[agentAddress];
    }

    /**
     * @notice Get agent vault balance
     * @param agentAddress The agent address
     */
    function getVaultBalance(address agentAddress) external view returns (uint256) {
        return agentVaults[agentAddress];
    }

    /**
     * @notice Check if an agent is slashable for a specific request
     * @param requestId The request ID
     */
    function isSlashable(bytes32 requestId) external view returns (bool) {
        ProofRequest storage request = proofRequests[requestId];
        return request.slashable 
            && !request.fulfilled 
            && block.timestamp > request.deadlineTs;
    }

    // Internal functions

    function _validateMetadata(
        string memory name,
        string memory url,
        string[] memory tags
    ) internal pure {
        if (bytes(name).length == 0) revert NameEmpty();
        if (bytes(name).length > MAX_NAME) revert NameTooLong();
        if (bytes(url).length == 0) revert UrlEmpty();
        if (bytes(url).length > MAX_URL) revert UrlTooLong();
        if (tags.length > MAX_TAGS) revert TooManyTags();
        
        for (uint256 i = 0; i < tags.length; i++) {
            if (bytes(tags[i]).length == 0) revert TagEmpty();
            if (bytes(tags[i]).length > MAX_TAG_LEN) revert TagTooLong();
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}