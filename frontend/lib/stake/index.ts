/**
 * Stake Library - Multi-Chain Agent Registry
 *
 * Exports for both Solana and EVM chains
 */

// React hooks
export * from './hooks'
export { useEvmStake, SUPPORTED_CHAINS, type SupportedChainId, type UseEvmStakeReturn } from './hooks'

// Solana client
export * from './client'
export {
  getProgram,
  getRegistryPda,
  getAgentPda,
  getVaultPda,
  getProofRequestPda,
  fetchRegistry,
  fetchAgent,
  fetchProofRequest,
  initializeRegistry,
  registerAgent,
  updateMetadata,
  requestProof,
  submitProof,
  slashAgent,
  withdrawBond,
  checkProgramDeployed,
} from './client'

// EVM client
export * from './evm-client'
export {
  AGENT_REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  createEvmPublicClient,
  getContractAddress,
  getChainConfig as getEvmChainConfig,
  fetchEvmRegistry,
  fetchEvmAgent,
  fetchEvmProofRequest,
  fetchEvmVaultBalance,
  hasEvmPendingRequest,
  initializeEvmRegistry,
  registerEvmAgent,
  updateEvmMetadata,
  topUpEvmBond,
  requestEvmProof,
  submitEvmProof,
  slashEvmAgent,
  withdrawEvmBond,
  checkEvmContractDeployed,
  ethToWei,
  weiToEth,
} from './evm-client'

// Multi-chain adapter
export * from './multi-chain-adapter'
export {
  MultiChainAgentRegistry,
  createSolanaContext,
  createEvmContext,
  createMultiChainRegistry,
  type ChainType,
  type ChainContext,
  type SolanaContext,
  type EvmContext,
  type UnifiedRegistry,
  type UnifiedAgent,
  type UnifiedProofRequest,
} from './multi-chain-adapter'

// IDL
export { agentRegistryIdl, AGENT_REGISTRY_PROGRAM_ID } from './agent-registry-idl'

// Contract configuration
export * from './contract-config'
export {
  CHAIN_CONFIGS,
  DEFAULT_CHAIN_ID,
  getChainConfig,
  getContractAddressForChain,
  isChainSupported,
  getSupportedChainIds,
  getTestnetChains,
  getMainnetChains,
  formatAddress,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  type ChainConfig,
  type ContractDeployment,
} from './contract-config'

