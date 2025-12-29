/**
 * AgentRegistry Contract Configuration
 *
 * Centralized contract configuration and deployment information
 */

import { type Address, type Chain } from 'viem'
import { anvil, cronosTestnet, cronos } from 'viem/chains'

/**
 * Contract deployment information per chain
 */
export interface ContractDeployment {
  address: Address
  deployedAt?: number // block number
  deployedBy?: Address
  verified?: boolean
}

/**
 * Chain configuration with contract deployments
 */
export interface ChainConfig {
  chainId: number
  name: string
  chain: Chain
  rpcUrl: string
  blockExplorer?: string
  contract?: ContractDeployment
  isTestnet: boolean
}

/**
 * All supported chain configurations
 */
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Anvil Local Development
  31337: {
    chainId: 31337,
    name: 'Anvil Local',
    chain: anvil,
    rpcUrl: 'http://localhost:8545',
    isTestnet: true,
    contract: {
      address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      verified: false,
    },
  },

  // Cronos Testnet
  338: {
    chainId: 338,
    name: 'Cronos Testnet',
    chain: cronosTestnet,
    rpcUrl: 'https://evm-t3.cronos.org',
    blockExplorer: 'https://cronos.org/explorer/testnet3',
    isTestnet: true,
    contract: {
      // Update after deployment
      address: '0x0000000000000000000000000000000000000000' as Address,
      verified: false,
    },
  },

  // Cronos Mainnet (future)
  25: {
    chainId: 25,
    name: 'Cronos',
    chain: cronos,
    rpcUrl: 'https://evm.cronos.org',
    blockExplorer: 'https://cronos.org/explorer',
    isTestnet: false,
    contract: undefined, // Not deployed yet
  },
}

/**
 * Default chain for development
 */
export const DEFAULT_CHAIN_ID = 31337

/**
 * Get chain configuration
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId]
}

/**
 * Get contract address for a chain
 */
export function getContractAddressForChain(chainId: number): Address | undefined {
  const config = CHAIN_CONFIGS[chainId]
  if (!config?.contract?.address || config.contract.address === '0x0000000000000000000000000000000000000000') {
    return undefined
  }
  return config.contract.address
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  const config = CHAIN_CONFIGS[chainId]
  return !!config?.contract?.address && config.contract.address !== '0x0000000000000000000000000000000000000000'
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(CHAIN_CONFIGS)
    .map(Number)
    .filter(isChainSupported)
}

/**
 * Get testnet chains
 */
export function getTestnetChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(c => c.isTestnet && isChainSupported(c.chainId))
}

/**
 * Get mainnet chains
 */
export function getMainnetChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(c => !c.isTestnet && isChainSupported(c.chainId))
}

/**
 * Format address for display (truncated)
 */
export function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string | undefined {
  const config = CHAIN_CONFIGS[chainId]
  if (!config?.blockExplorer) return undefined
  return `${config.blockExplorer}/tx/${txHash}`
}

/**
 * Get block explorer URL for address
 */
export function getExplorerAddressUrl(chainId: number, address: Address): string | undefined {
  const config = CHAIN_CONFIGS[chainId]
  if (!config?.blockExplorer) return undefined
  return `${config.blockExplorer}/address/${address}`
}

