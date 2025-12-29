/**
 * EVM Client for AgentRegistry contract
 * Mirrors the Solana client API for cross-chain compatibility
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther, type Address, type Hash, type PublicClient, type WalletClient, type Chain } from 'viem'
import { anvil, cronosTestnet } from 'viem/chains'
import { CHAIN_CONFIGS, getContractAddressForChain, type ChainConfig } from './contract-config'

// Contract ABI - matches the Solidity AgentRegistry contract
export const AGENT_REGISTRY_ABI = [
  // Read functions
  {
    name: 'getRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'authority', type: 'address' },
          { name: 'bondAmount', type: 'uint256' },
          { name: 'slashPenalty', type: 'uint256' },
          { name: 'initialized', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'authority', type: 'address' },
          { name: 'agentWallet', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'url', type: 'string' },
          { name: 'tags', type: 'string[]' },
          { name: 'bondAmount', type: 'uint256' },
          { name: 'requestCount', type: 'uint256' },
          { name: 'pendingRequest', type: 'bytes32' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getProofRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'agent', type: 'address' },
          { name: 'requester', type: 'address' },
          { name: 'marketId', type: 'bytes32' },
          { name: 'requestedAt', type: 'uint256' },
          { name: 'deadlineTs', type: 'uint256' },
          { name: 'proofUri', type: 'string' },
          { name: 'logRoot', type: 'bytes32' },
          { name: 'signature', type: 'bytes' },
          { name: 'fulfilled', type: 'bool' },
          { name: 'slashable', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getVaultBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Write functions
  {
    name: 'initializeRegistry',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'bondAmount', type: 'uint256' },
      { name: 'slashPenalty', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'agentAddress', type: 'address' },
      { name: 'agentWallet', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'url', type: 'string' },
      { name: 'tags', type: 'string[]' },
    ],
    outputs: [],
  },
  {
    name: 'updateMetadata',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentAddress', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'url', type: 'string' },
      { name: 'tags', type: 'string[]' },
    ],
    outputs: [],
  },
  {
    name: 'topUpBond',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [],
  },
  {
    name: 'requestProof',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentAddress', type: 'address' },
      { name: 'marketId', type: 'bytes32' },
      { name: 'deadlineTs', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'submitProof',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'bytes32' },
      { name: 'marketId', type: 'bytes32' },
      { name: 'logRoot', type: 'bytes32' },
      { name: 'proofUri', type: 'string' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'slashAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'requestId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'withdrawBond',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [],
  },
  {
    name: 'updateRegistry',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'newBondAmount', type: 'uint256' },
      { name: 'newSlashPenalty', type: 'uint256' },
    ],
    outputs: [],
  },
  // Events
  {
    name: 'RegistryInitialized',
    type: 'event',
    inputs: [
      { name: 'authority', type: 'address', indexed: true },
      { name: 'bondAmount', type: 'uint256', indexed: false },
      { name: 'slashPenalty', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AgentRegistered',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'authority', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'url', type: 'string', indexed: false },
      { name: 'tags', type: 'string[]', indexed: false },
      { name: 'bondAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ProofRequested',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'marketId', type: 'bytes32', indexed: false },
      { name: 'deadlineTs', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ProofSubmitted',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'marketId', type: 'bytes32', indexed: false },
      { name: 'proofUri', type: 'string', indexed: false },
      { name: 'logRoot', type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'AgentSlashed',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'slashAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'MetadataUpdated',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'url', type: 'string', indexed: false },
      { name: 'tags', type: 'string[]', indexed: false },
    ],
  },
  {
    name: 'BondWithdrawn',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'authority', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'BondToppedUp',
    type: 'event',
    inputs: [
      { name: 'agent', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newTotal', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RegistryUpdated',
    type: 'event',
    inputs: [
      { name: 'bondAmount', type: 'uint256', indexed: false },
      { name: 'slashPenalty', type: 'uint256', indexed: false },
    ],
  },
  // Additional view function
  {
    name: 'hasPendingRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// Re-export CONTRACT_ADDRESSES for backward compatibility (uses contract-config.ts as source of truth)
export const CONTRACT_ADDRESSES: Record<number, Address> = Object.fromEntries(
  Object.entries(CHAIN_CONFIGS)
    .filter(([_, config]) => config.contract?.address)
    .map(([chainId, config]) => [Number(chainId), config.contract!.address])
)

// Get the appropriate chain config
export function getChainConfig(chainId: number): Chain {
  const config = CHAIN_CONFIGS[chainId]
  if (!config) {
    return anvil // Default fallback
  }
  return config.chain
}

// Types matching the contract structs
export interface RegistryData {
  authority: Address
  bondAmount: bigint
  slashPenalty: bigint
  initialized: boolean
}

export interface AgentData {
  authority: Address
  agentWallet: Address
  name: string
  url: string
  tags: string[]
  bondAmount: bigint
  requestCount: bigint
  pendingRequest: `0x${string}`
  active: boolean
}

export interface ProofRequestData {
  agent: Address
  requester: Address
  marketId: `0x${string}`
  requestedAt: bigint
  deadlineTs: bigint
  proofUri: string
  logRoot: `0x${string}`
  signature: `0x${string}`
  fulfilled: boolean
  slashable: boolean
}

/**
 * Create a public client for reading contract state
 */
export function createEvmPublicClient(chainId: number = 31337, rpcUrl?: string): PublicClient {
  const chain = getChainConfig(chainId)
  return createPublicClient({
    chain,
    transport: http(rpcUrl || chain.rpcUrls.default.http[0]),
  })
}

/**
 * Get contract address for the current chain
 */
export function getContractAddress(chainId: number): Address {
  const address = CONTRACT_ADDRESSES[chainId]
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Contract not deployed on chain ${chainId}`)
  }
  return address
}

/**
 * Fetch registry configuration
 */
export async function fetchEvmRegistry(
  publicClient: PublicClient,
  contractAddress?: Address
): Promise<RegistryData | null> {
  try {
    const chainId = await publicClient.getChainId()
    const address = contractAddress || getContractAddress(chainId)

    const result = await publicClient.readContract({
      address,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'getRegistry',
    })

    return result as RegistryData
  } catch (error) {
    console.error('Error fetching EVM registry:', error)
    return null
  }
}

/**
 * Fetch agent data
 */
export async function fetchEvmAgent(
  publicClient: PublicClient,
  agentAddress: Address,
  contractAddress?: Address
): Promise<AgentData | null> {
  try {
    const chainId = await publicClient.getChainId()
    const address = contractAddress || getContractAddress(chainId)

    const result = await publicClient.readContract({
      address,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [agentAddress],
    })

    const agent = result as AgentData
    // Check if agent is registered (active or has authority set)
    if (agent.authority === '0x0000000000000000000000000000000000000000') {
      return null
    }

    return agent
  } catch (error) {
    console.error('Error fetching EVM agent:', error)
    return null
  }
}

/**
 * Fetch proof request data
 */
export async function fetchEvmProofRequest(
  publicClient: PublicClient,
  requestId: `0x${string}`,
  contractAddress?: Address
): Promise<ProofRequestData | null> {
  try {
    const chainId = await publicClient.getChainId()
    const address = contractAddress || getContractAddress(chainId)

    const result = await publicClient.readContract({
      address,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'getProofRequest',
      args: [requestId],
    })

    return result as ProofRequestData
  } catch (error) {
    console.error('Error fetching EVM proof request:', error)
    return null
  }
}

/**
 * Fetch vault balance for an agent
 */
export async function fetchEvmVaultBalance(
  publicClient: PublicClient,
  agentAddress: Address,
  contractAddress?: Address
): Promise<bigint> {
  try {
    const chainId = await publicClient.getChainId()
    const address = contractAddress || getContractAddress(chainId)

    const result = await publicClient.readContract({
      address,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'getVaultBalance',
      args: [agentAddress],
    })

    return result as bigint
  } catch (error) {
    console.error('Error fetching EVM vault balance:', error)
    return BigInt(0)
  }
}

/**
 * Check if agent has a pending proof request
 */
export async function hasEvmPendingRequest(
  publicClient: PublicClient,
  agentAddress: Address,
  contractAddress?: Address
): Promise<boolean> {
  try {
    const chainId = await publicClient.getChainId()
    const address = contractAddress || getContractAddress(chainId)

    const result = await publicClient.readContract({
      address,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'hasPendingRequest',
      args: [agentAddress],
    })

    return result as boolean
  } catch (error) {
    console.error('Error checking EVM pending request:', error)
    return false
  }
}

/**
 * Initialize registry (admin only)
 */
export async function initializeEvmRegistry(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  bondAmount: bigint
  slashPenalty: bigint
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, bondAmount, slashPenalty, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'initializeRegistry',
    args: [bondAmount, slashPenalty],
    account,
    chain,
  })

  return hash
}

/**
 * Register a new agent
 */
export async function registerEvmAgent(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  agentAddress: Address
  agentWallet: Address
  name: string
  url: string
  tags: string[]
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, agentAddress, agentWallet, name, url, tags, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  // Get required bond amount
  const registry = await fetchEvmRegistry(publicClient, address)
  if (!registry) {
    throw new Error('Registry not initialized')
  }

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'registerAgent',
    args: [agentAddress, agentWallet, name, url, tags],
    value: registry.bondAmount,
    account,
    chain,
  })

  return hash
}

/**
 * Update agent metadata
 */
export async function updateEvmMetadata(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  agentAddress: Address
  name: string
  url: string
  tags: string[]
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, agentAddress, name, url, tags, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'updateMetadata',
    args: [agentAddress, name, url, tags],
    account,
    chain,
  })

  return hash
}

/**
 * Top up agent bond
 */
export async function topUpEvmBond(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  agentAddress: Address
  amount: bigint
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, agentAddress, amount, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'topUpBond',
    args: [agentAddress],
    value: amount,
    account,
    chain,
  })

  return hash
}

/**
 * Request proof from an agent
 */
export async function requestEvmProof(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  agentAddress: Address
  marketId: `0x${string}`
  deadlineTs: bigint
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, agentAddress, marketId, deadlineTs, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'requestProof',
    args: [agentAddress, marketId, deadlineTs],
    account,
    chain,
  })

  return hash
}

/**
 * Submit proof for a request
 */
export async function submitEvmProof(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  requestId: `0x${string}`
  marketId: `0x${string}`
  logRoot: `0x${string}`
  proofUri: string
  signature: `0x${string}`
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, requestId, marketId, logRoot, proofUri, signature, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'submitProof',
    args: [requestId, marketId, logRoot, proofUri, signature],
    account,
    chain,
  })

  return hash
}

/**
 * Slash an agent for missing proof deadline
 */
export async function slashEvmAgent(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  requestId: `0x${string}`
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, requestId, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'slashAgent',
    args: [requestId],
    account,
    chain,
  })

  return hash
}

/**
 * Withdraw agent bond
 */
export async function withdrawEvmBond(params: {
  walletClient: WalletClient
  publicClient: PublicClient
  agentAddress: Address
  contractAddress?: Address
}): Promise<Hash> {
  const { walletClient, publicClient, agentAddress, contractAddress } = params

  const chainId = await publicClient.getChainId()
  const address = contractAddress || getContractAddress(chainId)
  const chain = getChainConfig(chainId)
  const [account] = await walletClient.getAddresses()

  const hash = await walletClient.writeContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'withdrawBond',
    args: [agentAddress],
    account,
    chain,
  })

  return hash
}

/**
 * Check if contract is deployed
 */
export async function checkEvmContractDeployed(
  publicClient: PublicClient,
  contractAddress?: Address
): Promise<boolean> {
  try {
    const chainId = await publicClient.getChainId()
    const address = contractAddress || CONTRACT_ADDRESSES[chainId]

    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return false
    }

    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== '0x'
  } catch (error) {
    return false
  }
}

/**
 * Utility: Convert ETH string to wei
 */
export function ethToWei(eth: string): bigint {
  return parseEther(eth)
}

/**
 * Utility: Convert wei to ETH string
 */
export function weiToEth(wei: bigint): string {
  return formatEther(wei)
}

