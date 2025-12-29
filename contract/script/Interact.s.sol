// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract InteractScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        
        AgentRegistry registry = AgentRegistry(registryAddress);
        
        console.log("===========================================");
        console.log("   AgentRegistry Interaction Test Suite");
        console.log("===========================================");
        console.log("Registry Address:", registryAddress);
        console.log("Using account:", vm.addr(deployerPrivateKey));
        console.log("");

        vm.startBroadcast(deployerPrivateKey);
        
        // =========================================
        // 1. REGISTER AGENT
        // =========================================
        console.log("--- TEST 1: Register Agent ---");

        string[] memory tags = new string[](3);
        tags[0] = "DEGEN_SNIPER";
        tags[1] = "HIGH_RISK";
        tags[2] = "MOMENTUM";
        
        // Generate a unique agent address using block timestamp
        address agentAddress = address(uint160(uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao)))));
        address agentWallet = vm.addr(deployerPrivateKey);

        AgentRegistry.Registry memory reg = registry.getRegistry();
        console.log("Required bond:", reg.bondAmount);

        registry.registerAgent{value: reg.bondAmount}(
            agentAddress,
            agentWallet,
            "TestAgent",
            "https://api.testagent.io/v1",
            tags
        );
        
        console.log("[PASS] Agent registered successfully!");
        console.log("Agent Address:", agentAddress);
        
        // =========================================
        // 2. GET AGENT INFO
        // =========================================
        console.log("");
        console.log("--- TEST 2: Get Agent Info ---");

        AgentRegistry.Agent memory agent = registry.getAgent(agentAddress);
        console.log("Name:", agent.name);
        console.log("URL:", agent.url);
        console.log("Bond Amount:", agent.bondAmount);
        console.log("Active:", agent.active);
        console.log("Request Count:", agent.requestCount);
        console.log("[PASS] Agent info retrieved!");

        // =========================================
        // 3. UPDATE METADATA
        // =========================================
        console.log("");
        console.log("--- TEST 3: Update Metadata ---");

        string[] memory newTags = new string[](2);
        newTags[0] = "UPDATED_TAG";
        newTags[1] = "NEW_STRATEGY";

        registry.updateMetadata(
            agentAddress,
            "UpdatedTestAgent",
            "https://api.updated.io/v2",
            newTags
        );

        agent = registry.getAgent(agentAddress);
        console.log("New Name:", agent.name);
        console.log("New URL:", agent.url);
        console.log("[PASS] Metadata updated!");

        // =========================================
        // 4. TOP UP BOND
        // =========================================
        console.log("");
        console.log("--- TEST 4: Top Up Bond ---");

        uint256 topUpAmount = 0.01 ether;
        uint256 bondBefore = registry.getVaultBalance(agentAddress);

        registry.topUpBond{value: topUpAmount}(agentAddress);

        uint256 bondAfter = registry.getVaultBalance(agentAddress);
        console.log("Bond before:", bondBefore);
        console.log("Bond after:", bondAfter);
        console.log("[PASS] Bond topped up!");

        // =========================================
        // 5. REQUEST PROOF
        // =========================================
        console.log("");
        console.log("--- TEST 5: Request Proof ---");

        bytes32 marketId = keccak256("TEST_MARKET_1");
        uint256 deadline = block.timestamp + 3600; // 1 hour from now

        registry.requestProof(agentAddress, marketId, deadline);

        agent = registry.getAgent(agentAddress);
        bytes32 requestId = agent.pendingRequest;
        console.log("Request ID:", vm.toString(requestId));
        console.log("Request Count:", agent.requestCount);
        console.log("[PASS] Proof requested!");

        // =========================================
        // 6. GET PROOF REQUEST
        // =========================================
        console.log("");
        console.log("--- TEST 6: Get Proof Request ---");

        AgentRegistry.ProofRequest memory proofReq = registry.getProofRequest(requestId);
        console.log("Agent:", proofReq.agent);
        console.log("Requester:", proofReq.requester);
        console.log("Deadline:", proofReq.deadlineTs);
        console.log("Fulfilled:", proofReq.fulfilled);
        console.log("Slashable:", proofReq.slashable);
        console.log("[PASS] Proof request retrieved!");

        // =========================================
        // 7. SUBMIT PROOF
        // =========================================
        console.log("");
        console.log("--- TEST 7: Submit Proof ---");

        bytes32 logRoot = keccak256("test_log_data");
        string memory proofUri = "ipfs://QmTestProofHash123";
        bytes memory signature = new bytes(64);

        registry.submitProof(requestId, marketId, logRoot, proofUri, signature);

        proofReq = registry.getProofRequest(requestId);
        console.log("Fulfilled:", proofReq.fulfilled);
        console.log("Proof URI:", proofReq.proofUri);
        console.log("[PASS] Proof submitted!");

        // =========================================
        // 8. GET REGISTRY INFO
        // =========================================
        console.log("");
        console.log("--- TEST 8: Get Registry Info ---");

        reg = registry.getRegistry();
        console.log("Authority:", reg.authority);
        console.log("Bond Amount:", reg.bondAmount);
        console.log("Slash Penalty:", reg.slashPenalty);
        console.log("Initialized:", reg.initialized);
        console.log("[PASS] Registry info retrieved!");

        // =========================================
        // 9. WITHDRAW BOND (Final Test)
        // =========================================
        console.log("");
        console.log("--- TEST 9: Withdraw Bond ---");

        uint256 vaultBefore = registry.getVaultBalance(agentAddress);
        console.log("Vault balance before:", vaultBefore);

        registry.withdrawBond(agentAddress);

        uint256 vaultAfter = registry.getVaultBalance(agentAddress);
        agent = registry.getAgent(agentAddress);
        console.log("Vault balance after:", vaultAfter);
        console.log("Agent active:", agent.active);
        console.log("[PASS] Bond withdrawn!");

        vm.stopBroadcast();

        // =========================================
        // SUMMARY
        // =========================================
        console.log("");
        console.log("===========================================");
        console.log("   ALL TESTS PASSED SUCCESSFULLY!");
        console.log("===========================================");
    }
}
