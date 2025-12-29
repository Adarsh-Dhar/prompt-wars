/**
 * Multi-Chain Agent Registry Adapter
 *
 * Provides a unified interface for interacting with the AgentRegistry
 * contract on both Solana and EVM chains.
 */

import type { Connection, PublicKey } from '@solana/web3.js'
import type { Wallet } from '@coral-xyz/anchor'
import type { PublicClient, WalletClient, Address, Hash } from 'viem'

// Solana imports
import * as solanaClient from './client'

// EVM imports
import * as evmClient from './evm-client'

// Chain types
export type ChainType = 'solana' | 'evm'

// Unified types that work across chains
export interface UnifiedRegistry {
  authority: string
  bondAmount: string // In native token units (SOL or ETH)
  slashPenalty: string
  initialized: boolean
  chain: ChainType
}

export interface UnifiedAgent {
  authority: string
  agentWallet: string
  name: string
  url: string
  tags: string[]
  bondAmount: string
  requestCount: number
  pendingRequest: string | null
  active: boolean
  chain: ChainType
}

export interface UnifiedProofRequest {
  agent: string
  requester: string
  marketId: string
  requestedAt: number
  deadlineTs: number
  proofUri: string
  logRoot: string
  signature: string
  fulfilled: boolean
  slashable: boolean
  chain: ChainType
}

// Solana adapter context
export interface SolanaContext {
  type: 'solana'
  connection: Connection
  wallet?: Wallet
}

// EVM adapter context
export interface EvmContext {
  type: 'evm'
  publicClient: PublicClient
  walletClient?: WalletClient
  chainId: number
  contractAddress?: Address
}

export type ChainContext = SolanaContext | EvmContext

/**
 * Multi-chain Agent Registry Adapter
 */
export class MultiChainAgentRegistry {
  private context: ChainContext

  constructor(context: ChainContext) {
    this.context = context
  }

  get chainType(): ChainType {
    return this.context.type
  }

  /**
   * Check if the contract/program is deployed
   */
  async isDeployed(): Promise<boolean> {
    if (this.context.type === 'solana') {
      return solanaClient.checkProgramDeployed(this.context.connection)
    } else {
      return evmClient.checkEvmContractDeployed(
        this.context.publicClient,
        this.context.contractAddress
      )
    }
  }

  /**
   * Fetch registry configuration
   */
  async fetchRegistry(): Promise<UnifiedRegistry | null> {
    if (this.context.type === 'solana') {
      const registry = await solanaClient.fetchRegistry(this.context.connection)
      if (!registry) return null

      return {
        authority: registry.authority.toBase58(),
        bondAmount: (registry.bondLamports.toNumber() / 1e9).toString(),
        slashPenalty: (registry.slashPenaltyLamports.toNumber() / 1e9).toString(),
        initialized: true,
        chain: 'solana',
      }
    } else {
      const registry = await evmClient.fetchEvmRegistry(
        this.context.publicClient,
        this.context.contractAddress
      )
      if (!registry) return null

      return {
        authority: registry.authority,
        bondAmount: evmClient.weiToEth(registry.bondAmount),
        slashPenalty: evmClient.weiToEth(registry.slashPenalty),
        initialized: registry.initialized,
        chain: 'evm',
      }
    }
  }

  /**
   * Fetch agent data
   */
  async fetchAgent(agentId: string): Promise<UnifiedAgent | null> {
    if (this.context.type === 'solana') {
      const { PublicKey } = await import('@solana/web3.js')
      const agentWallet = new PublicKey(agentId)
      const agent = await solanaClient.fetchAgent({
        connection: this.context.connection,
        agentWallet,
      })
      if (!agent) return null

      return {
        authority: agent.authority.toBase58(),
        agentWallet: agent.agentWallet.toBase58(),
        name: agent.name,
        url: agent.url,
        tags: agent.tags,
        bondAmount: (agent.bondLamports.toNumber() / 1e9).toString(),
        requestCount: agent.requestCount.toNumber(),
        pendingRequest: agent.pendingRequest?.toBase58() || null,
        active: true, // Solana doesn't have explicit active flag
        chain: 'solana',
      }
    } else {
      const agent = await evmClient.fetchEvmAgent(
        this.context.publicClient,
        agentId as Address,
        this.context.contractAddress
      )
      if (!agent) return null

      return {
        authority: agent.authority,
        agentWallet: agent.agentWallet,
        name: agent.name,
        url: agent.url,
        tags: agent.tags,
        bondAmount: evmClient.weiToEth(agent.bondAmount),
        requestCount: Number(agent.requestCount),
        pendingRequest: agent.pendingRequest === '0x0000000000000000000000000000000000000000000000000000000000000000'
          ? null
          : agent.pendingRequest,
        active: agent.active,
        chain: 'evm',
      }
    }
  }

  /**
   * Initialize registry (admin only)
   */
  async initializeRegistry(params: {
    bondAmount: string // In native token units
    slashPenalty: string
  }): Promise<{ txId: string }> {
    if (this.context.type === 'solana') {
      if (!this.context.wallet) {
        throw new Error('Wallet not connected')
      }
      const bondLamports = Math.floor(parseFloat(params.bondAmount) * 1e9)
      const slashLamports = Math.floor(parseFloat(params.slashPenalty) * 1e9)

      const result = await solanaClient.initializeRegistry({
        connection: this.context.connection,
        wallet: this.context.wallet,
        bondLamports,
        slashPenaltyLamports: slashLamports,
      })

      return { txId: result.signature }
    } else {
      if (!this.context.walletClient) {
        throw new Error('Wallet not connected')
      }
      const bondWei = evmClient.ethToWei(params.bondAmount)
      const slashWei = evmClient.ethToWei(params.slashPenalty)

      const hash = await evmClient.initializeEvmRegistry({
        walletClient: this.context.walletClient,
        publicClient: this.context.publicClient,
        bondAmount: bondWei,
        slashPenalty: slashWei,
        contractAddress: this.context.contractAddress,
      })

      return { txId: hash }
    }
  }

  /**
   * Register an agent
   */
  async registerAgent(params: {
    agentAddress?: string // For EVM, optional for Solana
    name: string
    url: string
    tags: string[]
  }): Promise<{ txId: string; agentId: string }> {
    if (this.context.type === 'solana') {
      if (!this.context.wallet) {
        throw new Error('Wallet not connected')
      }

      const result = await solanaClient.registerAgent({
        connection: this.context.connection,
        wallet: this.context.wallet,
        name: params.name,
        url: params.url,
        tags: params.tags,
      })

      return {
        txId: result.signature,
        agentId: result.agentPda.toBase58(),
      }
    } else {
      if (!this.context.walletClient) {
        throw new Error('Wallet not connected')
      }

      const [account] = await this.context.walletClient.getAddresses()
      const agentAddress = (params.agentAddress || account) as Address

      const hash = await evmClient.registerEvmAgent({
        walletClient: this.context.walletClient,
        publicClient: this.context.publicClient,
        agentAddress,
        agentWallet: account,
        name: params.name,
        url: params.url,
        tags: params.tags,
        contractAddress: this.context.contractAddress,
      })

      return {
        txId: hash,
        agentId: agentAddress,
      }
    }
  }

  /**
   * Update agent metadata
   */
  async updateMetadata(params: {
    agentId: string
    name: string
    url: string
    tags: string[]
  }): Promise<{ txId: string }> {
    if (this.context.type === 'solana') {
      if (!this.context.wallet) {
        throw new Error('Wallet not connected')
      }

      // Solana client needs the agent wallet pubkey
      const result = await solanaClient.updateMetadata({
        connection: this.context.connection,
        wallet: this.context.wallet,
        name: params.name,
        url: params.url,
        tags: params.tags,
      })

      return { txId: result.signature }
    } else {
      if (!this.context.walletClient) {
        throw new Error('Wallet not connected')
      }

      const hash = await evmClient.updateEvmMetadata({
        walletClient: this.context.walletClient,
        publicClient: this.context.publicClient,
        agentAddress: params.agentId as Address,
        name: params.name,
        url: params.url,
        tags: params.tags,
        contractAddress: this.context.contractAddress,
      })

      return { txId: hash }
    }
  }

  /**
   * Request proof from an agent
   */
  async requestProof(params: {
    agentId: string
    marketId: string
    deadlineTs: number
  }): Promise<{ txId: string; requestId: string }> {
    if (this.context.type === 'solana') {
      if (!this.context.wallet) {
        throw new Error('Wallet not connected')
      }

      const { PublicKey } = await import('@solana/web3.js')

      // For Solana, we need a PublicKey for marketId
      // Use a deterministic derivation from the string
      const marketIdPubkey = new PublicKey(
        Buffer.from(params.marketId.padEnd(32, '\0').slice(0, 32))
      )

      const result = await solanaClient.requestProof({
        connection: this.context.connection,
        wallet: this.context.wallet,
        agentWallet: new PublicKey(params.agentId),
        marketId: marketIdPubkey,
        deadlineTs: new (await import('@coral-xyz/anchor')).BN(params.deadlineTs),
      })

      return {
        txId: result.signature,
        requestId: result.proofRequestPda.toBase58(),
      }
    } else {
      if (!this.context.walletClient) {
        throw new Error('Wallet not connected')
      }

      // Convert marketId to bytes32
      const { keccak256, toHex } = await import('viem')
      const marketIdBytes32 = keccak256(toHex(params.marketId)) as `0x${string}`

      const hash = await evmClient.requestEvmProof({
        walletClient: this.context.walletClient,
        publicClient: this.context.publicClient,
        agentAddress: params.agentId as Address,
        marketId: marketIdBytes32,
        deadlineTs: BigInt(params.deadlineTs),
        contractAddress: this.context.contractAddress,
      })

      // For EVM, the requestId is computed from agent + marketId
      // We return the hash as a placeholder; actual requestId needs event parsing
      return {
        txId: hash,
        requestId: marketIdBytes32,
      }
    }
  }

  /**
   * Submit proof for a request
   */
  async submitProof(params: {
    agentId: string
    requestId: string
    marketId: string
    logRoot: string
    proofUri: string
    signature: string
  }): Promise<{ txId: string }> {
    if (this.context.type === 'solana') {
      if (!this.context.wallet) {
        throw new Error('Wallet not connected')
      }

      const { PublicKey } = await import('@solana/web3.js')

      // Convert marketId to PublicKey
      const marketIdPubkey = new PublicKey(
        Buffer.from(params.marketId.padEnd(32, '\0').slice(0, 32))
      )

      // Convert logRoot and signature to Uint8Array
      const logRootBytes = new Uint8Array(32)
      const encoder = new TextEncoder()
      const logRootEncoded = encoder.encode(params.logRoot)
      logRootBytes.set(logRootEncoded.slice(0, 32))

      const signatureBytes = new Uint8Array(64)
      const sigEncoded = encoder.encode(params.signature)
      signatureBytes.set(sigEncoded.slice(0, 64))

      const result = await solanaClient.submitProof({
        connection: this.context.connection,
        wallet: this.context.wallet,
        agentWallet: new PublicKey(params.agentId),
        marketId: marketIdPubkey,
        logRoot: logRootBytes,
        proofUri: params.proofUri,
        signature: signatureBytes,
      })

      return { txId: result.signature }
    } else {
      if (!this.context.walletClient) {
        throw new Error('Wallet not connected')
      }

      const { keccak256, toHex } = await import('viem')
      const marketIdBytes32 = keccak256(toHex(params.marketId)) as `0x${string}`
      const logRootBytes32 = keccak256(toHex(params.logRoot)) as `0x${string}`

      const hash = await evmClient.submitEvmProof({
        walletClient: this.context.walletClient,
        publicClient: this.context.publicClient,
        requestId: params.requestId as `0x${string}`,
        marketId: marketIdBytes32,
        logRoot: logRootBytes32,
        proofUri: params.proofUri,
        signature: (params.signature.startsWith('0x') ? params.signature : `0x${params.signature}`) as `0x${string}`,
        contractAddress: this.context.contractAddress,
      })

      return { txId: hash }
    }
  }

  /**
   * Slash an agent for missing deadline
   */
  async slashAgent(params: {
    requestId: string
  }): Promise<{ txId: string }> {
    if (this.context.type === 'solana') {
      if (!this.context.wallet) {
        throw new Error('Wallet not connected')
      }

      const { PublicKey } = await import('@solana/web3.js')

      const result = await solanaClient.slashAgent({
        connection: this.context.connection,
        wallet: this.context.wallet,
        proofRequest: new PublicKey(params.requestId),
      })

      return { txId: result.signature }
    } else {
      if (!this.context.walletClient) {
        throw new Error('Wallet not connected')
      }

      const hash = await evmClient.slashEvmAgent({
        walletClient: this.context.walletClient,
        publicClient: this.context.publicClient,
        requestId: params.requestId as `0x${string}`,
        contractAddress: this.context.contractAddress,
      })

      return { txId: hash }
    }
  }

  /**
   * Withdraw agent bond
   */
  async withdrawBond(params: {
    agentId: string
  }): Promise<{ txId: string }> {
    if (this.context.type === 'solana') {
      if (!this.context.wallet) {
        throw new Error('Wallet not connected')
      }

      const result = await solanaClient.withdrawBond({
        connection: this.context.connection,
        wallet: this.context.wallet,
      })

      return { txId: result.signature }
    } else {
      if (!this.context.walletClient) {
        throw new Error('Wallet not connected')
      }

      const hash = await evmClient.withdrawEvmBond({
        walletClient: this.context.walletClient,
        publicClient: this.context.publicClient,
        agentAddress: params.agentId as Address,
        contractAddress: this.context.contractAddress,
      })

      return { txId: hash }
    }
  }

  /**
   * Get vault/escrow balance for an agent
   */
  async getVaultBalance(agentId: string): Promise<string> {
    if (this.context.type === 'solana') {
      const { PublicKey } = await import('@solana/web3.js')
      const agentPda = solanaClient.getAgentPda(new PublicKey(agentId))
      const vaultPda = solanaClient.getVaultPda(agentPda)

      const balance = await this.context.connection.getBalance(vaultPda)
      return (balance / 1e9).toString()
    } else {
      const balance = await evmClient.fetchEvmVaultBalance(
        this.context.publicClient,
        agentId as Address,
        this.context.contractAddress
      )
      return evmClient.weiToEth(balance)
    }
  }

  /**
   * Check if agent has a pending proof request
   */
  async hasPendingRequest(agentId: string): Promise<boolean> {
    if (this.context.type === 'solana') {
      const agent = await this.fetchAgent(agentId)
      return agent?.pendingRequest !== null
    } else {
      return evmClient.hasEvmPendingRequest(
        this.context.publicClient,
        agentId as Address,
        this.context.contractAddress
      )
    }
  }
}

/**
 * Create a Solana context
 */
export function createSolanaContext(
  connection: Connection,
  wallet?: Wallet
): SolanaContext {
  return {
    type: 'solana',
    connection,
    wallet,
  }
}

/**
 * Create an EVM context
 */
export function createEvmContext(
  publicClient: PublicClient,
  walletClient?: WalletClient,
  chainId: number = 31337,
  contractAddress?: Address
): EvmContext {
  return {
    type: 'evm',
    publicClient,
    walletClient,
    chainId,
    contractAddress,
  }
}

/**
 * Factory function to create the appropriate adapter
 */
export function createMultiChainRegistry(context: ChainContext): MultiChainAgentRegistry {
  return new MultiChainAgentRegistry(context)
}

