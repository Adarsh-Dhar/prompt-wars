// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    
    address public admin = address(0x1);
    address public agentOwner = address(0x2);
    address public agentWallet = address(0x3);
    address public requester = address(0x4);
    address public otherUser = address(0x5);
    
    uint256 constant BOND_AMOUNT = 0.05 ether;
    uint256 constant SLASH_PENALTY = 0.01 ether;
    
    bytes32 constant MARKET_ID = keccak256("MARKET_1");
    
    function setUp() public {
        registry = new AgentRegistry();
        
        // Fund test accounts
        vm.deal(admin, 10 ether);
        vm.deal(agentOwner, 10 ether);
        vm.deal(requester, 10 ether);
        vm.deal(otherUser, 10 ether);
    }
    
    // ============================================================================
    // Initialize Registry Tests
    // ============================================================================
    
    function testInitializeRegistry() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        AgentRegistry.Registry memory reg = registry.getRegistry();
        assertEq(reg.authority, admin);
        assertEq(reg.bondAmount, BOND_AMOUNT);
        assertEq(reg.slashPenalty, SLASH_PENALTY);
        assertTrue(reg.initialized);
    }
    
    function testCannotInitializeTwice() public {
        vm.startPrank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        vm.expectRevert(AgentRegistry.AlreadyInitialized.selector);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        vm.stopPrank();
    }
    
    function testCannotInitializeWithZeroBond() public {
        vm.prank(admin);
        vm.expectRevert(AgentRegistry.InvalidBondAmount.selector);
        registry.initializeRegistry(0, SLASH_PENALTY);
    }
    
    function testCannotInitializeWithZeroSlash() public {
        vm.prank(admin);
        vm.expectRevert(AgentRegistry.InvalidSlashAmount.selector);
        registry.initializeRegistry(BOND_AMOUNT, 0);
    }
    
    // ============================================================================
    // Register Agent Tests
    // ============================================================================
    
    function testRegisterAgent() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](2);
        tags[0] = "DEGEN_SNIPER";
        tags[1] = "HIGH_RISK";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "DegenSniper",
            "https://api.agent.com",
            tags
        );
        
        AgentRegistry.Agent memory agent = registry.getAgent(address(0x100));
        assertEq(agent.authority, agentOwner);
        assertEq(agent.agentWallet, agentWallet);
        assertEq(agent.name, "DegenSniper");
        assertEq(agent.url, "https://api.agent.com");
        assertEq(agent.tags.length, 2);
        assertEq(agent.bondAmount, BOND_AMOUNT);
        assertTrue(agent.active);
    }
    
    function testCannotRegisterWithoutInitialization() public {
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        vm.expectRevert(AgentRegistry.NotInitialized.selector);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
    }
    
    function testCannotRegisterWithInsufficientBond() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        vm.expectRevert(AgentRegistry.InsufficientBond.selector);
        registry.registerAgent{value: 0.01 ether}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
    }
    
    function testCannotRegisterWithNameTooLong() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        vm.expectRevert(AgentRegistry.NameTooLong.selector);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "ThisNameIsWayTooLongAndExceeds32Characters",
            "https://test.com",
            tags
        );
    }
    
    function testCannotRegisterTwice() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.startPrank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        vm.expectRevert(AgentRegistry.AgentAlreadyRegistered.selector);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test2",
            "https://test2.com",
            tags
        );
        vm.stopPrank();
    }
    
    // ============================================================================
    // Update Metadata Tests
    // ============================================================================
    
    function testUpdateMetadata() public {
        // Setup
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "OldName",
            "https://old.com",
            tags
        );
        
        // Update
        string[] memory newTags = new string[](2);
        newTags[0] = "UPDATED";
        newTags[1] = "NEW";
        
        vm.prank(agentOwner);
        registry.updateMetadata(
            address(0x100),
            "NewName",
            "https://new.com",
            newTags
        );
        
        AgentRegistry.Agent memory agent = registry.getAgent(address(0x100));
        assertEq(agent.name, "NewName");
        assertEq(agent.url, "https://new.com");
        assertEq(agent.tags.length, 2);
    }
    
    function testCannotUpdateMetadataAsNonOwner() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        vm.prank(otherUser);
        vm.expectRevert(AgentRegistry.NotAuthorized.selector);
        registry.updateMetadata(address(0x100), "Hacked", "https://evil.com", tags);
    }
    
    // ============================================================================
    // Request Proof Tests
    // ============================================================================
    
    function testRequestProof() public {
        // Setup
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        // Request proof
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        AgentRegistry.Agent memory agent = registry.getAgent(address(0x100));
        assertEq(agent.requestCount, 1);
        assertTrue(agent.pendingRequest != bytes32(0));
    }
    
    function testCannotRequestProofWithPastDeadline() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        vm.prank(requester);
        vm.expectRevert(AgentRegistry.InvalidDeadline.selector);
        registry.requestProof(address(0x100), MARKET_ID, block.timestamp - 1);
    }
    
    function testCannotRequestProofWhenPending() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        vm.prank(requester);
        vm.expectRevert(AgentRegistry.PendingRequestExists.selector);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
    }
    
    // ============================================================================
    // Submit Proof Tests
    // ============================================================================
    
    function testSubmitProof() public {
        // Setup and request
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        bytes32 requestId = registry.getAgent(address(0x100)).pendingRequest;
        
        // Submit proof
        bytes32 logRoot = keccak256("log_data");
        string memory proofUri = "ipfs://QmTestHash";
        bytes memory signature = new bytes(64);
        
        vm.prank(agentOwner);
        registry.submitProof(requestId, MARKET_ID, logRoot, proofUri, signature);
        
        AgentRegistry.ProofRequest memory request = registry.getProofRequest(requestId);
        assertTrue(request.fulfilled);
        assertFalse(request.slashable);
        assertEq(request.proofUri, proofUri);
        
        AgentRegistry.Agent memory agent = registry.getAgent(address(0x100));
        assertEq(agent.pendingRequest, bytes32(0));
    }
    
    function testCannotSubmitProofTwice() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        bytes32 requestId = registry.getAgent(address(0x100)).pendingRequest;
        
        bytes32 logRoot = keccak256("log_data");
        string memory proofUri = "ipfs://QmTestHash";
        bytes memory signature = new bytes(64);
        
        vm.prank(agentOwner);
        registry.submitProof(requestId, MARKET_ID, logRoot, proofUri, signature);
        
        vm.prank(agentOwner);
        vm.expectRevert(AgentRegistry.AlreadyFulfilled.selector);
        registry.submitProof(requestId, MARKET_ID, logRoot, proofUri, signature);
    }
    
    function testCannotSubmitProofAfterDeadline() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        bytes32 requestId = registry.getAgent(address(0x100)).pendingRequest;
        
        // Warp past deadline
        vm.warp(deadline + 1);
        
        bytes32 logRoot = keccak256("log_data");
        string memory proofUri = "ipfs://QmTestHash";
        bytes memory signature = new bytes(64);
        
        vm.prank(agentOwner);
        vm.expectRevert(AgentRegistry.DeadlinePassed.selector);
        registry.submitProof(requestId, MARKET_ID, logRoot, proofUri, signature);
    }
    
    // ============================================================================
    // Slash Agent Tests
    // ============================================================================
    
    function testSlashAgent() public {
        // Setup
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        bytes32 requestId = registry.getAgent(address(0x100)).pendingRequest;
        
        // Warp past deadline
        vm.warp(deadline + 1);
        
        uint256 adminBalanceBefore = admin.balance;
        
        // Slash
        registry.slashAgent(requestId);
        
        uint256 adminBalanceAfter = admin.balance;
        assertEq(adminBalanceAfter - adminBalanceBefore, SLASH_PENALTY);
        
        uint256 vaultBalance = registry.getVaultBalance(address(0x100));
        assertEq(vaultBalance, BOND_AMOUNT - SLASH_PENALTY);
        
        AgentRegistry.ProofRequest memory request = registry.getProofRequest(requestId);
        assertFalse(request.slashable);
    }
    
    function testCannotSlashBeforeDeadline() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        bytes32 requestId = registry.getAgent(address(0x100)).pendingRequest;
        
        vm.expectRevert(AgentRegistry.DeadlineNotPassed.selector);
        registry.slashAgent(requestId);
    }
    
    function testCannotSlashFulfilledRequest() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        bytes32 requestId = registry.getAgent(address(0x100)).pendingRequest;
        
        // Submit proof
        bytes32 logRoot = keccak256("log_data");
        string memory proofUri = "ipfs://QmTestHash";
        bytes memory signature = new bytes(64);
        
        vm.prank(agentOwner);
        registry.submitProof(requestId, MARKET_ID, logRoot, proofUri, signature);
        
        // Try to slash
        vm.warp(deadline + 1);
        vm.expectRevert(AgentRegistry.AlreadyFulfilled.selector);
        registry.slashAgent(requestId);
    }
    
    // ============================================================================
    // Withdraw Bond Tests
    // ============================================================================
    
    function testWithdrawBond() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 balanceBefore = agentOwner.balance;
        
        vm.prank(agentOwner);
        registry.withdrawBond(address(0x100));
        
        uint256 balanceAfter = agentOwner.balance;
        assertEq(balanceAfter - balanceBefore, BOND_AMOUNT);
        
        AgentRegistry.Agent memory agent = registry.getAgent(address(0x100));
        assertFalse(agent.active);
    }
    
    function testCannotWithdrawWithPendingRequest() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 deadline = block.timestamp + 3600;
        
        vm.prank(requester);
        registry.requestProof(address(0x100), MARKET_ID, deadline);
        
        vm.prank(agentOwner);
        vm.expectRevert(AgentRegistry.PendingRequestExists.selector);
        registry.withdrawBond(address(0x100));
    }
    
    // ============================================================================
    // Top Up Bond Tests
    // ============================================================================
    
    function testTopUpBond() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        string[] memory tags = new string[](1);
        tags[0] = "TEST";
        
        vm.prank(agentOwner);
        registry.registerAgent{value: BOND_AMOUNT}(
            address(0x100),
            agentWallet,
            "Test",
            "https://test.com",
            tags
        );
        
        uint256 topUpAmount = 0.01 ether;
        
        vm.prank(agentOwner);
        registry.topUpBond{value: topUpAmount}(address(0x100));
        
        AgentRegistry.Agent memory agent = registry.getAgent(address(0x100));
        assertEq(agent.bondAmount, BOND_AMOUNT + topUpAmount);
        
        uint256 vaultBalance = registry.getVaultBalance(address(0x100));
        assertEq(vaultBalance, BOND_AMOUNT + topUpAmount);
    }
    
    // ============================================================================
    // Update Registry Tests
    // ============================================================================
    
    function testUpdateRegistry() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        uint256 newBond = 0.1 ether;
        uint256 newSlash = 0.02 ether;
        
        vm.prank(admin);
        registry.updateRegistry(newBond, newSlash);
        
        AgentRegistry.Registry memory reg = registry.getRegistry();
        assertEq(reg.bondAmount, newBond);
        assertEq(reg.slashPenalty, newSlash);
    }
    
    function testCannotUpdateRegistryAsNonAuthority() public {
        vm.prank(admin);
        registry.initializeRegistry(BOND_AMOUNT, SLASH_PENALTY);
        
        vm.prank(otherUser);
        vm.expectRevert(AgentRegistry.NotAuthorized.selector);
        registry.updateRegistry(0.1 ether, 0.02 ether);
    }
}
