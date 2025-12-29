# EVM Contract Integration

This folder contains the integration between the Solana Anchor program and the Solidity EVM contract.

## Contract Addresses

### Anvil Local (Chain ID: 31337)
- **Contract Address**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- **Authority**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

### Cronos Testnet (Chain ID: 338)
- **Contract Address**: TBD (deploy with same script)

## Files

- `client.ts` - Solana Anchor program client
- `evm-client.ts` - EVM/Solidity contract client
- `multi-chain-adapter.ts` - Unified interface for both chains
- `contract-config.ts` - Chain configurations and contract addresses
- `agent-registry-idl.ts` - Solana program IDL
- `hooks/use-evm-stake.ts` - React hook for EVM staking
- `hooks/index.ts` - Hook exports
- `index.ts` - Exports all functions

## React Hook Usage

### useEvmStake Hook

The `useEvmStake` hook provides a convenient way to interact with the EVM AgentRegistry contract from React components:

```typescript
import { useEvmStake } from '@/lib/stake'

function AgentRegistration() {
  const {
    // State
    isConnected,
    chainId,
    address,
    isDeployed,
    registry,
    error,
    isRegistering,
    
    // Actions
    connect,
    disconnect,
    registerAgent,
    fetchRegistry,
    withdrawBond,
  } = useEvmStake(31337) // Default to Anvil

  const handleRegister = async () => {
    try {
      const { txHash, agentId } = await registerAgent({
        name: 'MyAgent',
        url: 'https://api.myagent.com',
        tags: ['DEGEN', 'HIGH_RISK'],
      })
      console.log('Registered:', agentId)
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }

  return (
    <div>
      {!isConnected ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <>
          <p>Connected: {address}</p>
          <p>Bond Amount: {registry?.bondAmount} ETH</p>
          <button onClick={handleRegister} disabled={isRegistering}>
            {isRegistering ? 'Registering...' : 'Register Agent'}
          </button>
        </>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

## Usage

### Solana

```typescript
import { createSolanaContext, createMultiChainRegistry } from './lib/stake'
import { Connection } from '@solana/web3.js'

const connection = new Connection('https://api.devnet.solana.com')
const context = createSolanaContext(connection, wallet)
const registry = createMultiChainRegistry(context)

// Fetch registry info
const registryInfo = await registry.fetchRegistry()

// Register agent
const result = await registry.registerAgent({
  name: 'MyAgent',
  url: 'https://api.myagent.com',
  tags: ['DEGEN', 'HIGH_RISK']
})
```

### EVM

```typescript
import { createEvmContext, createMultiChainRegistry, createEvmPublicClient } from './lib/stake'
import { createWalletClient, custom } from 'viem'

const publicClient = createEvmPublicClient(31337) // Anvil
const walletClient = createWalletClient({
  chain: anvil,
  transport: custom(window.ethereum)
})
const context = createEvmContext(publicClient, walletClient, 31337)
const registry = createMultiChainRegistry(context)

// Same API as Solana!
const registryInfo = await registry.fetchRegistry()

const result = await registry.registerAgent({
  agentAddress: '0x...', // EVM requires explicit agent address
  name: 'MyAgent',
  url: 'https://api.myagent.com',
  tags: ['DEGEN', 'HIGH_RISK']
})
```

## API Parity

Both chains support the same operations:

| Function | Solana | EVM |
|----------|--------|-----|
| `fetchRegistry()` | ✅ | ✅ |
| `fetchAgent(id)` | ✅ | ✅ |
| `initializeRegistry(params)` | ✅ | ✅ |
| `registerAgent(params)` | ✅ | ✅ |
| `updateMetadata(params)` | ✅ | ✅ |
| `requestProof(params)` | ✅ | ✅ |
| `submitProof(params)` | ✅ | ✅ |
| `slashAgent(params)` | ✅ | ✅ |
| `withdrawBond(params)` | ✅ | ✅ |
| `getVaultBalance(id)` | ✅ | ✅ |

## Deploying to New Chains

### EVM Deployment

1. Navigate to the contract directory:
   ```bash
   cd contract
   ```

2. Deploy to Anvil local:
   ```bash
   PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
   ```

3. Deploy to Cronos Testnet:
   ```bash
   PRIVATE_KEY=<your-private-key> \
   forge script script/Deploy.s.sol --rpc-url https://evm-t3.cronos.org --broadcast
   ```

4. Update `CONTRACT_ADDRESSES` in `evm-client.ts` with the new address.

### Solana Deployment

1. Navigate to stake directory:
   ```bash
   cd stake
   ```

2. Build and deploy:
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

3. Update `AGENT_REGISTRY_PROGRAM_ID` in `agent-registry-idl.ts`.

## Testing

### EVM Integration Tests

Run the comprehensive EVM integration tests:

```bash
# 1. Start Anvil in one terminal
anvil

# 2. Deploy the contract
cd contract
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 3. Run the tests from frontend directory
cd ../frontend
npx ts-node --esm lib/stake/test-evm-integration.ts
```

The test suite covers:
- Contract deployment verification
- Registry initialization
- Agent registration
- Metadata updates
- Proof request/submit flow
- Bond withdrawal

## Contract Configuration

The `contract-config.ts` file provides centralized chain configuration:

```typescript
import { CHAIN_CONFIGS, getChainConfig, isChainSupported } from '@/lib/stake'

// Get config for a specific chain
const anvilConfig = getChainConfig(31337)
console.log(anvilConfig.name) // 'Anvil Local'
console.log(anvilConfig.contract.address) // '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'

// Check if a chain is supported
if (isChainSupported(338)) {
  console.log('Cronos Testnet is supported!')
}
```
