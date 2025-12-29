/**
 * React Hook for EVM Agent Registry Staking
 *
 * Provides a convenient way to interact with the EVM AgentRegistry contract
 * from React components.
 */

import { useState, useCallback, useEffect } from 'react'
import { createPublicClient, createWalletClient, custom, http, type Address, type Hash, type PublicClient, type WalletClient } from 'viem'
import { anvil, cronosTestnet } from 'viem/chains'
import {
  CONTRACT_ADDRESSES,
  fetchEvmRegistry,
  fetchEvmAgent,
  registerEvmAgent,
  updateEvmMetadata,
  topUpEvmBond,
  withdrawEvmBond,
  fetchEvmVaultBalance,
  checkEvmContractDeployed,
  initializeEvmRegistry,
  weiToEth,
  ethToWei,
  type RegistryData,
  type AgentData,
} from '../evm-client'
import { CHAIN_CONFIGS, getContractAddressForChain, isChainSupported, type ChainConfig } from '../contract-config'

// Supported chains configuration (derived from contract-config.ts)
export const SUPPORTED_CHAINS: Record<number, { name: string; chain: typeof anvil | typeof cronosTestnet; rpcUrl: string }> = Object.fromEntries(
  Object.entries(CHAIN_CONFIGS)
    .filter(([_, config]) => config.contract?.address && config.contract.address !== '0x0000000000000000000000000000000000000000')
    .map(([chainId, config]) => [
      Number(chainId),
      { name: config.name, chain: config.chain as typeof anvil | typeof cronosTestnet, rpcUrl: config.rpcUrl }
    ])
)

// Supported chain IDs (31337 = Anvil, 338 = Cronos Testnet, 25 = Cronos Mainnet)
export type SupportedChainId = 31337 | 338 | 25

export interface UseEvmStakeState {
  // Connection state
  isConnected: boolean
  chainId: SupportedChainId | null
  address: Address | null

  // Contract state
  isDeployed: boolean
  registry: RegistryData | null
  agent: AgentData | null

  // Loading states
  isLoading: boolean
  isConnecting: boolean
  isRegistering: boolean
  isWithdrawing: boolean

  // Errors
  error: string | null
}

export interface UseEvmStakeActions {
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: SupportedChainId) => Promise<void>
  fetchRegistry: () => Promise<RegistryData | null>
  fetchAgent: (agentAddress: Address) => Promise<AgentData | null>
  registerAgent: (params: {
    agentAddress?: Address
    name: string
    url: string
    tags: string[]
  }) => Promise<{ txHash: Hash; agentId: Address }>
  updateMetadata: (params: {
    agentAddress: Address
    name: string
    url: string
    tags: string[]
  }) => Promise<Hash>
  topUpBond: (agentAddress: Address, amount: string) => Promise<Hash>
  withdrawBond: (agentAddress: Address) => Promise<Hash>
  getVaultBalance: (agentAddress: Address) => Promise<string>
  initializeRegistry: (bondAmount: string, slashPenalty: string) => Promise<Hash>
}

export interface UseEvmStakeReturn extends UseEvmStakeState, UseEvmStakeActions {}

/**
 * Hook for interacting with the EVM Agent Registry contract
 */
export function useEvmStake(initialChainId: SupportedChainId = 31337): UseEvmStakeReturn {
  // State
  const [isConnected, setIsConnected] = useState(false)
  const [chainId, setChainId] = useState<SupportedChainId | null>(null)
  const [address, setAddress] = useState<Address | null>(null)
  const [isDeployed, setIsDeployed] = useState(false)
  const [registry, setRegistry] = useState<RegistryData | null>(null)
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clients
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null)
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null)

  /**
   * Get the contract address for the current chain
   */
  const getContractAddress = useCallback((): Address | undefined => {
    if (!chainId) return undefined
    return CONTRACT_ADDRESSES[chainId]
  }, [chainId])

  /**
   * Connect to MetaMask or other EVM wallet
   */
  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No EVM wallet found. Please install MetaMask.')
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const userAddress = accounts[0] as Address
      setAddress(userAddress)

      // Get the current chain ID
      const chainIdHex = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string

      const currentChainId = parseInt(chainIdHex, 16) as SupportedChainId

      // Check if it's a supported chain
      if (!SUPPORTED_CHAINS[currentChainId]) {
        console.warn(`Chain ${currentChainId} not supported, using default chain ${initialChainId}`)
        // Try to switch to the initial chain
        await switchChain(initialChainId)
        return
      }

      setChainId(currentChainId)

      // Create clients
      const chainConfig = SUPPORTED_CHAINS[currentChainId]
      const newPublicClient = createPublicClient({
        chain: chainConfig.chain,
        transport: http(chainConfig.rpcUrl),
      })

      const newWalletClient = createWalletClient({
        account: userAddress,
        chain: chainConfig.chain,
        transport: custom(window.ethereum),
      })

      setPublicClient(newPublicClient)
      setWalletClient(newWalletClient)
      setIsConnected(true)

      // Check if contract is deployed
      const contractAddress = CONTRACT_ADDRESSES[currentChainId]
      if (contractAddress) {
        const deployed = await checkEvmContractDeployed(newPublicClient, contractAddress)
        setIsDeployed(deployed)

        if (deployed) {
          // Fetch registry
          const registryData = await fetchEvmRegistry(newPublicClient, contractAddress)
          setRegistry(registryData)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
      console.error('Connect error:', err)
    } finally {
      setIsConnecting(false)
    }
  }, [initialChainId])

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    setIsConnected(false)
    setAddress(null)
    setChainId(null)
    setPublicClient(null)
    setWalletClient(null)
    setRegistry(null)
    setAgent(null)
    setIsDeployed(false)
    setError(null)
  }, [])

  /**
   * Switch to a different chain
   */
  const switchChain = useCallback(async (newChainId: SupportedChainId) => {
    if (!window.ethereum) {
      throw new Error('No EVM wallet found')
    }

    const chainConfig = SUPPORTED_CHAINS[newChainId]
    if (!chainConfig) {
      throw new Error(`Chain ${newChainId} not supported`)
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${newChainId.toString(16)}` }],
      })

      // Reconnect with new chain
      await connect()
    } catch (err: any) {
      // If chain doesn't exist, add it
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${newChainId.toString(16)}`,
            chainName: chainConfig.name,
            rpcUrls: [chainConfig.rpcUrl],
          }],
        })
        await connect()
      } else {
        throw err
      }
    }
  }, [connect])

  /**
   * Fetch registry data
   */
  const fetchRegistryData = useCallback(async (): Promise<RegistryData | null> => {
    if (!publicClient) {
      throw new Error('Not connected')
    }

    setIsLoading(true)
    try {
      const contractAddress = getContractAddress()
      const registryData = await fetchEvmRegistry(publicClient, contractAddress)
      setRegistry(registryData)
      return registryData
    } catch (err: any) {
      setError(err.message || 'Failed to fetch registry')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, getContractAddress])

  /**
   * Fetch agent data
   */
  const fetchAgentData = useCallback(async (agentAddress: Address): Promise<AgentData | null> => {
    if (!publicClient) {
      throw new Error('Not connected')
    }

    setIsLoading(true)
    try {
      const contractAddress = getContractAddress()
      const agentData = await fetchEvmAgent(publicClient, agentAddress, contractAddress)
      setAgent(agentData)
      return agentData
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agent')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, getContractAddress])

  /**
   * Register a new agent
   */
  const registerAgentAction = useCallback(async (params: {
    agentAddress?: Address
    name: string
    url: string
    tags: string[]
  }): Promise<{ txHash: Hash; agentId: Address }> => {
    if (!publicClient || !walletClient || !address) {
      throw new Error('Not connected')
    }

    setIsRegistering(true)
    setError(null)

    try {
      const agentAddress = params.agentAddress || address
      const contractAddress = getContractAddress()

      const txHash = await registerEvmAgent({
        walletClient,
        publicClient,
        agentAddress,
        agentWallet: address,
        name: params.name,
        url: params.url,
        tags: params.tags,
        contractAddress,
      })

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted')
      }

      return { txHash, agentId: agentAddress }
    } catch (err: any) {
      setError(err.message || 'Failed to register agent')
      throw err
    } finally {
      setIsRegistering(false)
    }
  }, [publicClient, walletClient, address, getContractAddress])

  /**
   * Update agent metadata
   */
  const updateMetadataAction = useCallback(async (params: {
    agentAddress: Address
    name: string
    url: string
    tags: string[]
  }): Promise<Hash> => {
    if (!publicClient || !walletClient) {
      throw new Error('Not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const contractAddress = getContractAddress()

      const txHash = await updateEvmMetadata({
        walletClient,
        publicClient,
        agentAddress: params.agentAddress,
        name: params.name,
        url: params.url,
        tags: params.tags,
        contractAddress,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      return txHash
    } catch (err: any) {
      setError(err.message || 'Failed to update metadata')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, walletClient, getContractAddress])

  /**
   * Top up agent bond
   */
  const topUpBondAction = useCallback(async (agentAddress: Address, amount: string): Promise<Hash> => {
    if (!publicClient || !walletClient) {
      throw new Error('Not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const contractAddress = getContractAddress()

      const txHash = await topUpEvmBond({
        walletClient,
        publicClient,
        agentAddress,
        amount: ethToWei(amount),
        contractAddress,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      return txHash
    } catch (err: any) {
      setError(err.message || 'Failed to top up bond')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, walletClient, getContractAddress])

  /**
   * Withdraw agent bond
   */
  const withdrawBondAction = useCallback(async (agentAddress: Address): Promise<Hash> => {
    if (!publicClient || !walletClient) {
      throw new Error('Not connected')
    }

    setIsWithdrawing(true)
    setError(null)

    try {
      const contractAddress = getContractAddress()

      const txHash = await withdrawEvmBond({
        walletClient,
        publicClient,
        agentAddress,
        contractAddress,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      return txHash
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw bond')
      throw err
    } finally {
      setIsWithdrawing(false)
    }
  }, [publicClient, walletClient, getContractAddress])

  /**
   * Get vault balance
   */
  const getVaultBalanceAction = useCallback(async (agentAddress: Address): Promise<string> => {
    if (!publicClient) {
      throw new Error('Not connected')
    }

    const contractAddress = getContractAddress()
    const balance = await fetchEvmVaultBalance(publicClient, agentAddress, contractAddress)
    return weiToEth(balance)
  }, [publicClient, getContractAddress])

  /**
   * Initialize registry (admin only)
   */
  const initializeRegistryAction = useCallback(async (bondAmount: string, slashPenalty: string): Promise<Hash> => {
    if (!publicClient || !walletClient) {
      throw new Error('Not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      const contractAddress = getContractAddress()

      const txHash = await initializeEvmRegistry({
        walletClient,
        publicClient,
        bondAmount: ethToWei(bondAmount),
        slashPenalty: ethToWei(slashPenalty),
        contractAddress,
      })

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      // Refresh registry data
      await fetchRegistryData()

      return txHash
    } catch (err: any) {
      setError(err.message || 'Failed to initialize registry')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [publicClient, walletClient, getContractAddress, fetchRegistryData])

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAddress(accounts[0] as Address)
      }
    }

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16) as SupportedChainId
      if (SUPPORTED_CHAINS[newChainId]) {
        setChainId(newChainId)
        connect() // Reconnect with new chain
      } else {
        setError(`Chain ${newChainId} not supported`)
      }
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [connect, disconnect])

  return {
    // State
    isConnected,
    chainId,
    address,
    isDeployed,
    registry,
    agent,
    isLoading,
    isConnecting,
    isRegistering,
    isWithdrawing,
    error,

    // Actions
    connect,
    disconnect,
    switchChain,
    fetchRegistry: fetchRegistryData,
    fetchAgent: fetchAgentData,
    registerAgent: registerAgentAction,
    updateMetadata: updateMetadataAction,
    topUpBond: topUpBondAction,
    withdrawBond: withdrawBondAction,
    getVaultBalance: getVaultBalanceAction,
    initializeRegistry: initializeRegistryAction,
  }
}

