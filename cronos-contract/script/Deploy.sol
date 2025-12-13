// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";
import "../src/AgentRegistry.sol";

// Mock ERC20 for testing collateral
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint 1 million USDC (6 decimals) to deployer
        _mint(msg.sender, 1_000_000 * 10**6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DeployScript is Script {
    function run() external {
        // Get the default Anvil account (first account)
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("====================================");
        console.log("Deploying contracts to Anvil...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "ETH");
        console.log("====================================\n");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock USDC for testing
        console.log("1. Deploying Mock USDC...");
        MockUSDC usdc = new MockUSDC();
        console.log("   Mock USDC deployed at:", address(usdc));
        console.log("   Deployer USDC balance:", usdc.balanceOf(deployer) / 10**6, "USDC\n");

        // 2. Deploy PredictionMarket
        console.log("2. Deploying PredictionMarket...");
        PredictionMarket market = new PredictionMarket();
        console.log("   PredictionMarket deployed at:", address(market));
        console.log("   Next Market ID:", market.nextMarketId(), "\n");

        // 3. Deploy AgentRegistry
        console.log("3. Deploying AgentRegistry...");
        AgentRegistry registry = new AgentRegistry(deployer);
        console.log("   AgentRegistry deployed at:", address(registry));
        console.log("   Registry owner:", registry.owner(), "\n");

        // 4. Initialize AgentRegistry
        console.log("4. Initializing AgentRegistry...");
        uint256 bondAmount = 0.1 ether;
        uint256 slashPenalty = 0.05 ether;
        registry.initializeRegistry(bondAmount, slashPenalty);
        console.log("   Bond Amount:", bondAmount / 1e18, "ETH");
        console.log("   Slash Penalty:", slashPenalty / 1e18, "ETH\n");

        // 5. Create a sample prediction market
        console.log("5. Creating sample prediction market...");
        uint64 marketId = market.initializeMarket(
            "Will ETH reach $5000 by end of 2025?",
            block.timestamp + 365 days,
            address(usdc)
        );
        console.log("   Market ID:", marketId);
        PredictionMarket.Market memory mkt = market.getMarket(marketId);
        console.log("   Question:", mkt.question);
        console.log("   End Time:", mkt.endTime);
        console.log("   YES Token:", mkt.yesToken);
        console.log("   NO Token:", mkt.noToken, "\n");

        // 6. Register a sample agent
        console.log("6. Registering sample agent...");
        address agentAddress = address(0x1234567890123456789012345678901234567890);
        address agentWallet = deployer;
        
        string[] memory tags = new string[](3);
        tags[0] = "AI";
        tags[1] = "Prediction";
        tags[2] = "Oracle";
        
        registry.registerAgent{value: bondAmount}(
            agentAddress,
            agentWallet,
            "Sample Oracle Agent",
            "https://oracle.example.com",
            tags
        );
        console.log("   Agent registered at:", agentAddress);
        console.log("   Agent vault balance:", registry.getVaultBalance(agentAddress) / 1e18, "ETH");
        console.log("   Total agents:", registry.totalAgents(), "\n");

        vm.stopBroadcast();

        // Print summary
        console.log("====================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("====================================");
        console.log("Network: Anvil Local Testnet");
        console.log("Chain ID: 31337");
        console.log("Deployer:", deployer);
        console.log("");
        console.log("Deployed Contracts:");
        console.log("-------------------");
        console.log("MockUSDC:", address(usdc));
        console.log("PredictionMarket:", address(market));
        console.log("AgentRegistry:", address(registry));
        console.log("");
        console.log("Sample Data Created:");
        console.log("-------------------");
        console.log("Market ID:", marketId);
        console.log("Agent Address:", agentAddress);
        console.log("");
        console.log("Test Accounts (Anvil defaults):");
        console.log("-------------------");
        console.log("Account 0:", deployer, "(Deployer)");
        console.log("Account 1:", vm.addr(0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d));
        console.log("Account 2:", vm.addr(0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a));
        console.log("====================================\n");

        // Save addresses to file for easy access
        string memory addressesJson = string(abi.encodePacked(
            '{\n',
            '  "network": "anvil",\n',
            '  "chainId": 31337,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "contracts": {\n',
            '    "mockUSDC": "', vm.toString(address(usdc)), '",\n',
            '    "predictionMarket": "', vm.toString(address(market)), '",\n',
            '    "agentRegistry": "', vm.toString(address(registry)), '"\n',
            '  },\n',
            '  "sampleData": {\n',
            '    "marketId": ', vm.toString(marketId), ',\n',
            '    "agentAddress": "', vm.toString(agentAddress), '"\n',
            '  }\n',
            '}'
        ));

        vm.writeFile("deployments/anvil-latest.json", addressesJson);
        console.log("Deployment info saved to: deployments/anvil-latest.json");
    }
}