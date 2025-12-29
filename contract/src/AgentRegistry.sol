// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title AgentRegistry
 * @notice Staking contract for AI agent registration and proof-of-action verification
 * @dev Manages agent registration with stake bonds, proof requests, and slashing mechanism
 */
contract AgentRegistry {
    // ============================================================================
    // State Variables
    // ============================================================================

    /// @notice Registry configuration
    struct Registry {
        address authority;
        uint256 bondAmount;
        uint256 slashPenalty;
        bool initialized;
    }

    /// @notice Agent information
    struct Agent {
        address authority;          // Owner wallet
        address agentWallet;        // Agent's operational wallet
        string name;                // Display name (max 32 chars)
        string url;                 // API endpoint (max 128 chars)
        string[] tags;              // Strategy tags (max 8 tags, 24 chars each)
        uint256 bondAmount;         // Staked amount
        uint256 requestCount;       // Total requests received
        bytes32 pendingRequest;     // Current active request ID
        bool active;                // Registration status
    }

    /// @notice Proof request details
    struct ProofRequest {
        address agent;              // Agent address
        address requester;          // Who requested the proof
        bytes32 marketId;           // Market/arena ID
        uint256 requestedAt;        // Request timestamp
        uint256 deadlineTs;         // Deadline for proof
        string proofUri;            // Submitted proof URI (IPFS/Arweave)
        bytes32 logRoot;            // Merkle root of logs
        bytes signature;            // Ed25519 signature (64 bytes)
        bool fulfilled;             // Whether proof was submitted
        bool slashable;             // Whether can be slashed
    }

    /// @notice Main registry configuration
    Registry public registry;

    /// @notice Mapping from agent address to Agent data
    mapping(address => Agent) public agents;

    /// @notice Mapping from request ID to ProofRequest data
    mapping(bytes32 => ProofRequest) public proofRequests;

    /// @notice Mapping from agent to their vault balance
    mapping(address => uint256) public vaults;

    // ============================================================================
    // Events
    // ============================================================================

    event RegistryInitialized(
        address indexed authority,
        uint256 bondAmount,
        uint256 slashPenalty
    );

    event AgentRegistered(
        address indexed agent,
        address indexed authority,
        string name,
        string url,
        string[] tags,
        uint256 bondAmount
    );

    event MetadataUpdated(
        address indexed agent,
        string name,
        string url,
        string[] tags
    );

    event ProofRequested(
        address indexed agent,
        bytes32 indexed requestId,
        bytes32 marketId,
        uint256 deadlineTs
    );

    event ProofSubmitted(
        address indexed agent,
        bytes32 indexed requestId,
        bytes32 marketId,
        string proofUri,
        bytes32 logRoot
    );

    event AgentSlashed(
        address indexed agent,
        bytes32 indexed requestId,
        uint256 slashAmount
    );

    event BondWithdrawn(
        address indexed agent,
        address indexed authority,
        uint256 amount
    );

    event BondToppedUp(
        address indexed agent,
        uint256 amount,
        uint256 newTotal
    );

    event RegistryUpdated(
        uint256 bondAmount,
        uint256 slashPenalty
    );

    // ============================================================================
    // Errors
    // ============================================================================

    error AlreadyInitialized();
    error NotInitialized();
    error NotAuthorized();
    error InvalidBondAmount();
    error InvalidSlashAmount();
    error NameTooLong();
    error UrlTooLong();
    error TooManyTags();
    error TagTooLong();
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error InvalidDeadline();
    error PendingRequestExists();
    error AlreadyFulfilled();
    error MarketIdMismatch();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error NotSlashable();
    error ProofUriTooLong();
    error InsufficientBond();

    // ============================================================================
    // Modifiers
    // ============================================================================

    modifier onlyAuthority() {
        _onlyAuthority();
        _;
    }

    function _onlyAuthority() internal view {
        if (msg.sender != registry.authority) revert NotAuthorized();
    }

    modifier onlyAgentOwner(address agentAddress) {
        _onlyAgentOwner(agentAddress);
        _;
    }

    function _onlyAgentOwner(address agentAddress) internal view {
        if (msg.sender != agents[agentAddress].authority) revert NotAuthorized();
    }

    modifier registryInitialized() {
        _registryInitialized();
        _;
    }

    function _registryInitialized() internal view {
        if (!registry.initialized) revert NotInitialized();
    }

    // ============================================================================
    // Core Functions
    // ============================================================================

    /**
     * @notice Initialize the registry (one-time setup by admin)
     * @param bondAmount Required stake amount in wei
     * @param slashPenalty Penalty amount when agent misbehaves
     */
    function initializeRegistry(
        uint256 bondAmount,
        uint256 slashPenalty
    ) external {
        if (registry.initialized) revert AlreadyInitialized();
        if (bondAmount == 0) revert InvalidBondAmount();
        if (slashPenalty == 0) revert InvalidSlashAmount();

        registry = Registry({
            authority: msg.sender,
            bondAmount: bondAmount,
            slashPenalty: slashPenalty,
            initialized: true
        });

        emit RegistryInitialized(msg.sender, bondAmount, slashPenalty);
    }

    /**
     * @notice Register a new AI agent with stake bond
     * @param agentAddress The agent's address (used as unique ID)
     * @param agentWallet Agent's operational wallet
     * @param name Agent codename (max 32 chars)
     * @param url Agent API endpoint (max 128 chars)
     * @param tags Strategy tags (max 8 tags, 24 chars each)
     */
    function registerAgent(
        address agentAddress,
        address agentWallet,
        string calldata name,
        string calldata url,
        string[] calldata tags
    ) external payable registryInitialized {
        if (bytes(name).length > 32) revert NameTooLong();
        if (bytes(url).length > 128) revert UrlTooLong();
        if (tags.length > 8) revert TooManyTags();
        for (uint256 i = 0; i < tags.length; i++) {
            if (bytes(tags[i]).length > 24) revert TagTooLong();
        }
        if (agents[agentAddress].active) revert AgentAlreadyRegistered();
        if (msg.value < registry.bondAmount) revert InsufficientBond();

        agents[agentAddress] = Agent({
            authority: msg.sender,
            agentWallet: agentWallet,
            name: name,
            url: url,
            tags: tags,
            bondAmount: msg.value,
            requestCount: 0,
            pendingRequest: bytes32(0),
            active: true
        });

        vaults[agentAddress] = msg.value;

        emit AgentRegistered(agentAddress, msg.sender, name, url, tags, msg.value);
    }

    /**
     * @notice Update agent metadata (name, URL, tags)
     * @param agentAddress The agent's address
     * @param name Updated agent name
     * @param url Updated endpoint URL
     * @param tags Updated strategy tags
     */
    function updateMetadata(
        address agentAddress,
        string calldata name,
        string calldata url,
        string[] calldata tags
    ) external onlyAgentOwner(agentAddress) {
        if (bytes(name).length > 32) revert NameTooLong();
        if (bytes(url).length > 128) revert UrlTooLong();
        if (tags.length > 8) revert TooManyTags();
        for (uint256 i = 0; i < tags.length; i++) {
            if (bytes(tags[i]).length > 24) revert TagTooLong();
        }

        Agent storage agent = agents[agentAddress];
        agent.name = name;
        agent.url = url;
        agent.tags = tags;

        emit MetadataUpdated(agentAddress, name, url, tags);
    }

    /**
     * @notice Request proof of action from an agent
     * @param agentAddress The agent to request proof from
     * @param marketId Unique market/arena identifier
     * @param deadlineTs Unix timestamp deadline for proof submission
     */
    function requestProof(
        address agentAddress,
        bytes32 marketId,
        uint256 deadlineTs
    ) external registryInitialized {
        if (!agents[agentAddress].active) revert AgentNotRegistered();
        if (deadlineTs <= block.timestamp) revert InvalidDeadline();
        if (agents[agentAddress].pendingRequest != bytes32(0)) revert PendingRequestExists();

        bytes32 requestId;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, agentAddress)
            mstore(add(ptr, 0x20), marketId)
            mstore(add(ptr, 0x40), timestamp())
            requestId := keccak256(ptr, 0x60)
        }

        proofRequests[requestId] = ProofRequest({
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

        agents[agentAddress].pendingRequest = requestId;
        agents[agentAddress].requestCount++;

        emit ProofRequested(agentAddress, requestId, marketId, deadlineTs);
    }

    /**
     * @notice Submit proof of action
     * @param requestId The proof request ID
     * @param marketId Market identifier (must match request)
     * @param logRoot Merkle root of chain-of-thought logs
     * @param proofUri IPFS/Arweave URI to full proof data
     * @param signature Ed25519 signature for verification
     */
    function submitProof(
        bytes32 requestId,
        bytes32 marketId,
        bytes32 logRoot,
        string calldata proofUri,
        bytes calldata signature
    ) external {
        ProofRequest storage request = proofRequests[requestId];
        
        if (request.fulfilled) revert AlreadyFulfilled();
        if (request.marketId != marketId) revert MarketIdMismatch();
        if (block.timestamp > request.deadlineTs) revert DeadlinePassed();
        if (bytes(proofUri).length > 256) revert ProofUriTooLong();
        if (msg.sender != agents[request.agent].authority) revert NotAuthorized();

        request.logRoot = logRoot;
        request.proofUri = proofUri;
        request.signature = signature;
        request.fulfilled = true;
        request.slashable = false;

        agents[request.agent].pendingRequest = bytes32(0);

        emit ProofSubmitted(request.agent, requestId, marketId, proofUri, logRoot);
    }

    /**
     * @notice Slash agent for missing proof deadline
     * @param requestId The proof request ID to slash
     */
    function slashAgent(bytes32 requestId) external registryInitialized {
        ProofRequest storage request = proofRequests[requestId];
        
        if (request.fulfilled) revert AlreadyFulfilled();
        if (!request.slashable) revert NotSlashable();
        if (block.timestamp <= request.deadlineTs) revert DeadlineNotPassed();

        uint256 slashAmount = registry.slashPenalty;
        address agentAddress = request.agent;

        if (vaults[agentAddress] < slashAmount) {
            slashAmount = vaults[agentAddress];
        }

        vaults[agentAddress] -= slashAmount;
        request.slashable = false;
        agents[agentAddress].pendingRequest = bytes32(0);

        // Transfer slash penalty to registry authority
        (bool success, ) = registry.authority.call{value: slashAmount}("");
        require(success, "Transfer failed");

        emit AgentSlashed(agentAddress, requestId, slashAmount);
    }

    /**
     * @notice Withdraw bond and exit
     * @param agentAddress The agent's address
     */
    function withdrawBond(address agentAddress) external onlyAgentOwner(agentAddress) {
        Agent storage agent = agents[agentAddress];
        
        if (agent.pendingRequest != bytes32(0)) revert PendingRequestExists();

        uint256 amount = vaults[agentAddress];
        vaults[agentAddress] = 0;
        agent.active = false;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit BondWithdrawn(agentAddress, msg.sender, amount);
    }

    /**
     * @notice Top up existing bond
     * @param agentAddress The agent's address
     */
    function topUpBond(address agentAddress) external payable onlyAgentOwner(agentAddress) {
        if (!agents[agentAddress].active) revert AgentNotRegistered();

        vaults[agentAddress] += msg.value;
        agents[agentAddress].bondAmount += msg.value;

        emit BondToppedUp(agentAddress, msg.value, agents[agentAddress].bondAmount);
    }

    /**
     * @notice Update registry parameters (admin only)
     * @param newBondAmount New bond requirement (0 = no change)
     * @param newSlashPenalty New slash penalty (0 = no change)
     */
    function updateRegistry(
        uint256 newBondAmount,
        uint256 newSlashPenalty
    ) external onlyAuthority {
        if (newBondAmount > 0) {
            registry.bondAmount = newBondAmount;
        }
        if (newSlashPenalty > 0) {
            registry.slashPenalty = newSlashPenalty;
        }

        emit RegistryUpdated(registry.bondAmount, registry.slashPenalty);
    }

    // ============================================================================
    // View Functions
    // ============================================================================

    /**
     * @notice Get agent information
     * @param agentAddress The agent's address
     */
    function getAgent(address agentAddress) external view returns (Agent memory) {
        return agents[agentAddress];
    }

    /**
     * @notice Get proof request information
     * @param requestId The request ID
     */
    function getProofRequest(bytes32 requestId) external view returns (ProofRequest memory) {
        return proofRequests[requestId];
    }

    /**
     * @notice Get agent's vault balance
     * @param agentAddress The agent's address
     */
    function getVaultBalance(address agentAddress) external view returns (uint256) {
        return vaults[agentAddress];
    }

    /**
     * @notice Get registry configuration
     */
    function getRegistry() external view returns (Registry memory) {
        return registry;
    }

    /**
     * @notice Check if agent has pending request
     * @param agentAddress The agent's address
     */
    function hasPendingRequest(address agentAddress) external view returns (bool) {
        return agents[agentAddress].pendingRequest != bytes32(0);
    }
}
