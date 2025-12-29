// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Configuration
        uint256 bondAmount = 0.05 ether;      // 0.05 ETH
        uint256 slashPenalty = 0.01 ether;    // 0.01 ETH
        
        console.log("Deploying AgentRegistry...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Bond Amount:", bondAmount);
        console.log("Slash Penalty:", slashPenalty);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy contract
        AgentRegistry registry = new AgentRegistry();
        console.log("Contract deployed at:", address(registry));
        
        // Initialize registry
        registry.initializeRegistry(bondAmount, slashPenalty);
        console.log("Registry initialized");
        
        vm.stopBroadcast();
        
        // Verification info
        console.log("\n=== Deployment Summary ===");
        console.log("Network:", block.chainid);
        console.log("Contract:", address(registry));
        console.log("Authority:", vm.addr(deployerPrivateKey));
        console.log("Bond Required:", bondAmount / 1 ether, "ETH");
        console.log("Slash Penalty:", slashPenalty / 1 ether, "ETH");
        
        console.log("\n=== Verification Command ===");
        console.log("forge verify-contract", address(registry), "src/AgentRegistry.sol:AgentRegistry --chain-id", block.chainid);
    }
}
