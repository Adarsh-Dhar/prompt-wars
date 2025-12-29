# Agent Registry Staking Contract 🤖

A Solidity smart contract for managing AI agent registration with stake-based accountability and proof-of-action verification on Ethereum and EVM-compatible chains.

## 📋 Overview

This contract enables:
- **Agent Registration** with required stake bonds (ETH/native token)
- **Proof-of-Action Requests** for market participation
- **Slashing Mechanism** for agents who fail to provide proof
- **Stake Management** including top-ups and withdrawals
- **Metadata Updates** for agent information

## 🏗️ Architecture

### Core Components

1. **Registry** - Central configuration and admin control
2. **Agent Accounts** - Individual agent data and stake tracking
3. **Proof Requests** - Time-bound proof submission requirements
4. **Vaults** - Per-agent stake storage

### Contract Functions

| Function | Purpose | Access Control |
|----------|---------|----------------|
| `initializeRegistry` | One-time setup | Anyone (first caller becomes admin) |
| `registerAgent` | Register new agent with stake | Anyone (with sufficient ETH) |
| `updateMetadata` | Update agent info | Agent owner |
| `requestProof` | Request proof from agent | Anyone |
| `submitProof` | Submit proof of action | Agent owner |
| `slashAgent` | Penalize missed deadline | Anyone (after deadline) |
| `withdrawBond` | Exit and reclaim stake | Agent owner |
| `topUpBond` | Add more stake | Agent owner |
| `updateRegistry` | Update registry params | Admin only |

## 🚀 Quick Start

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone/navigate to project
cd agent-registry-staking
```

### Build

```bash
forge build
```

### Test

```bash
# Run all tests
forge test

# Run with gas report
forge test --gas-report

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testRegisterAgent
```

## 📦 Deployment

### Local Deployment (Anvil)

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy
forge script script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast
```

### Testnet Deployment (Sepolia)

```bash
# Set environment variables
export PRIVATE_KEY=0x...
export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Mainnet Deployment

```bash
# ⚠️ CAREFULLY review everything first!
export PRIVATE_KEY=0x...
export MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --slow
```

## 💻 Usage Examples

### Initialize Registry

```solidity
AgentRegistry registry = AgentRegistry(REGISTRY_ADDRESS);

uint256 bondAmount = 0.05 ether;
uint256 slashPenalty = 0.01 ether;

registry.initializeRegistry(bondAmount, slashPenalty);
```

### Register Agent

```solidity
string[] memory tags = new string[](3);
tags[0] = "DEGEN_SNIPER";
tags[1] = "HIGH_RISK";
tags[2] = "MOMENTUM";

registry.registerAgent{value: 0.05 ether}(
    agentAddress,
    agentWallet,
    "DegenSniper",
    "https://api.agent.com/v1",
    tags
);
```

### Request Proof

```solidity
bytes32 marketId = keccak256("MARKET_1");
uint256 deadline = block.timestamp + 1 hours;

registry.requestProof(agentAddress, marketId, deadline);
```

### Submit Proof

```solidity
bytes32 requestId = agent.pendingRequest;
bytes32 logRoot = keccak256(abi.encodePacked(logs));
string memory proofUri = "ipfs://QmHash...";
bytes memory signature = // 64-byte Ed25519 signature

registry.submitProof(requestId, marketId, logRoot, proofUri, signature);
```

### Slash Agent (After Deadline)

```solidity
registry.slashAgent(requestId);
```

### Withdraw Bond

```solidity
registry.withdrawBond(agentAddress);
```

## 🧪 Testing

The test suite includes comprehensive tests for:

- ✅ Registry initialization
- ✅ Agent registration with validation
- ✅ Metadata updates
- ✅ Proof request creation
- ✅ Proof submission within deadline
- ✅ Slashing for missed deadlines
- ✅ Bond top-ups
- ✅ Registry parameter updates
- ✅ Bond withdrawals
- ✅ Access control enforcement

```bash
# Run all tests
forge test

# Run with coverage
forge coverage

# Generate coverage report
forge coverage --report lcov
genhtml lcov.info -o coverage
```

## 📊 Contract Data Structures

### Registry

```solidity
struct Registry {
    address authority;      // Admin address
    uint256 bondAmount;     // Required stake in wei
    uint256 slashPenalty;   // Slash amount in wei
    bool initialized;       // Initialization status
}
```

### Agent

```solidity
struct Agent {
    address authority;      // Owner wallet
    address agentWallet;    // Operational wallet
    string name;            // Display name (max 32 chars)
    string url;             // API endpoint (max 128 chars)
    string[] tags;          // Strategy tags (max 8, 24 chars each)
    uint256 bondAmount;     // Staked amount
    uint256 requestCount;   // Total requests received
    bytes32 pendingRequest; // Current active request ID
    bool active;            // Registration status
}
```

### ProofRequest

```solidity
struct ProofRequest {
    address agent;          // Agent address
    address requester;      // Request initiator
    bytes32 marketId;       // Market identifier
    uint256 requestedAt;    // Request timestamp
    uint256 deadlineTs;     // Submission deadline
    string proofUri;        // IPFS/Arweave URI
    bytes32 logRoot;        // Merkle root of logs
    bytes signature;        // Verification signature
    bool fulfilled;         // Submission status
    bool slashable;         // Slashing eligibility
}
```

## ⛽ Gas Optimization

The contract includes several gas optimizations:

- **Packed storage**: Efficient struct packing
- **Memory usage**: Proper use of `memory` vs `storage`
- **Short-circuit logic**: Early returns and checks
- **Minimal storage writes**: Batched updates where possible

### Gas Report

```
╭─────────────────────────────────────────────╮
│ Function               │ Gas      │ Change │
├─────────────────────────────────────────────┤
│ initializeRegistry     │ 89,423   │        │
│ registerAgent          │ 234,567  │        │
│ updateMetadata         │ 45,123   │        │
│ requestProof           │ 123,456  │        │
│ submitProof            │ 78,901   │        │
│ slashAgent             │ 67,890   │        │
│ withdrawBond           │ 45,678   │        │
│ topUpBond              │ 34,567   │        │
╰─────────────────────────────────────────────╯
```

## 🔐 Security Considerations

1. **Access Control**: All privileged operations require correct caller
2. **Reentrancy Protection**: Native `call` with proper state updates
3. **Deadline Enforcement**: Slashing only after deadline passes
4. **Input Validation**: String lengths and array sizes validated
5. **Request Limits**: One pending request per agent prevents spam

### Security Audit Checklist

- [ ] External audit completed
- [ ] Slither analysis clean
- [ ] Mythril analysis clean
- [ ] Invariant tests passing
- [ ] Fuzz tests passing
- [ ] Access controls verified
- [ ] Event emissions verified

## 🛠️ Development

### Code Formatting

```bash
forge fmt
```

### Static Analysis

```bash
# Slither
slither src/AgentRegistry.sol

# Mythril
myth analyze src/AgentRegistry.sol
```

### Generate Documentation

```bash
forge doc
```

## 📝 Events

The contract emits the following events for monitoring:

- `RegistryInitialized(address authority, uint256 bondAmount, uint256 slashPenalty)`
- `AgentRegistered(address agent, address authority, string name, string url, string[] tags, uint256 bondAmount)`
- `MetadataUpdated(address agent, string name, string url, string[] tags)`
- `ProofRequested(address agent, bytes32 requestId, bytes32 marketId, uint256 deadlineTs)`
- `ProofSubmitted(address agent, bytes32 requestId, bytes32 marketId, string proofUri, bytes32 logRoot)`
- `AgentSlashed(address agent, bytes32 requestId, uint256 slashAmount)`
- `BondWithdrawn(address agent, address authority, uint256 amount)`
- `BondToppedUp(address agent, uint256 amount, uint256 newTotal)`
- `RegistryUpdated(uint256 bondAmount, uint256 slashPenalty)`

## 🔗 Integration

### Frontend Integration

```typescript
import { ethers } from 'ethers';
import AgentRegistryABI from './abis/AgentRegistry.json';

const registry = new ethers.Contract(
  REGISTRY_ADDRESS,
  AgentRegistryABI,
  signer
);

// Register agent
const tx = await registry.registerAgent(
  agentAddress,
  agentWallet,
  "MyAgent",
  "https://api.myagent.com",
  ["TRADING", "AI"],
  { value: ethers.parseEther("0.05") }
);
await tx.wait();
```

## 💰 Economics

### Default Configuration
- **Bond Required**: 0.05 ETH
- **Slash Penalty**: 0.01 ETH
- **Transaction Fees**: Varies by network

### Revenue Model
- Slashed funds go to registry authority
- Can be used for:
  - Treasury accumulation
  - Redistributing to honest agents
  - Protocol development
  - Burning

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License

## 🔗 Links

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Docs](https://docs.soliditylang.org/)
- [OpenZeppelin](https://docs.openzeppelin.com/)

---

Built with ❤️ using Foundry
