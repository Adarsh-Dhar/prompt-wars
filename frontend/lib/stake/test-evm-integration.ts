/**
 * Test script for EVM Agent Registry integration
 *
 * Run with: npx ts-node --esm lib/stake/test-evm-integration.ts
 *
 * Prerequisites:
 * 1. Start Anvil: anvil
 * 2. Deploy contract: cd contract && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 */

import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { anvil } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import {
  CONTRACT_ADDRESSES,
  fetchEvmRegistry,
  fetchEvmAgent,
  registerEvmAgent,
  updateEvmMetadata,
  requestEvmProof,
  submitEvmProof,
  withdrawEvmBond,
  fetchEvmVaultBalance,
  hasEvmPendingRequest,
  checkEvmContractDeployed,
  initializeEvmRegistry,
  weiToEth,
} from './evm-client'

// Default Anvil account (first account)
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const
const CONTRACT_ADDRESS = CONTRACT_ADDRESSES[31337]

interface TestResult {
  name: string
  passed: boolean
  message: string
  duration: number
}

const results: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now()
  console.log(`\n--- ${name} ---`)

  try {
    await testFn()
    const duration = Date.now() - startTime
    results.push({ name, passed: true, message: 'OK', duration })
    console.log(`✅ PASSED (${duration}ms)`)
  } catch (error: any) {
    const duration = Date.now() - startTime
    const message = error.message?.slice(0, 200) || 'Unknown error'
    results.push({ name, passed: false, message, duration })
    console.log(`❌ FAILED: ${message}`)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('EVM Agent Registry Integration Test Suite')
  console.log('='.repeat(60))
  console.log('')

  // Create clients
  const account = privateKeyToAccount(ANVIL_PRIVATE_KEY)
  console.log('Account:', account.address)
  console.log('Contract:', CONTRACT_ADDRESS)

  const publicClient = createPublicClient({
    chain: anvil,
    transport: http('http://localhost:8545'),
  })

  const walletClient = createWalletClient({
    account,
    chain: anvil,
    transport: http('http://localhost:8545'),
  })

  // Generate unique agent address for this test run
  const agentAddress = `0x${Date.now().toString(16).padStart(40, '0')}` as `0x${string}`
  console.log('Test Agent Address:', agentAddress)
  console.log('')

  // Test 1: Check if contract is deployed
  await runTest('Contract Deployment Check', async () => {
    const isDeployed = await checkEvmContractDeployed(publicClient, CONTRACT_ADDRESS)
    if (!isDeployed) {
      throw new Error('Contract not deployed. Run: cd contract && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast')
    }
    console.log('  Contract is deployed')
  })

  // Test 2: Fetch Registry
  let registryInitialized = false
  await runTest('Fetch Registry', async () => {
    const registry = await fetchEvmRegistry(publicClient, CONTRACT_ADDRESS)
    if (registry && registry.initialized) {
      registryInitialized = true
      console.log('  Authority:', registry.authority)
      console.log('  Bond Amount:', weiToEth(registry.bondAmount), 'ETH')
      console.log('  Slash Penalty:', weiToEth(registry.slashPenalty), 'ETH')
    } else {
      console.log('  Registry not initialized yet')
    }
  })

  // Test 3: Initialize Registry (if needed)
  if (!registryInitialized) {
    await runTest('Initialize Registry', async () => {
      const hash = await initializeEvmRegistry({
        walletClient,
        publicClient,
        bondAmount: parseEther('0.05'),
        slashPenalty: parseEther('0.025'),
        contractAddress: CONTRACT_ADDRESS,
      })
      console.log('  Tx:', hash)
      await publicClient.waitForTransactionReceipt({ hash })
      console.log('  Registry initialized')
    })
  }

  // Test 4: Register Agent
  await runTest('Register Agent', async () => {
    const hash = await registerEvmAgent({
      walletClient,
      publicClient,
      agentAddress,
      agentWallet: account.address,
      name: 'TestAgent',
      url: 'https://api.testagent.io',
      tags: ['DEGEN', 'HIGH_RISK'],
      contractAddress: CONTRACT_ADDRESS,
    })
    console.log('  Tx:', hash)
    await publicClient.waitForTransactionReceipt({ hash })
    console.log('  Agent registered')
  })

  // Test 5: Fetch Agent
  await runTest('Fetch Agent', async () => {
    const agent = await fetchEvmAgent(publicClient, agentAddress, CONTRACT_ADDRESS)
    if (!agent) {
      throw new Error('Agent not found')
    }
    console.log('  Name:', agent.name)
    console.log('  URL:', agent.url)
    console.log('  Tags:', agent.tags)
    console.log('  Bond:', weiToEth(agent.bondAmount), 'ETH')
    console.log('  Active:', agent.active)
  })

  // Test 6: Fetch Vault Balance
  await runTest('Fetch Vault Balance', async () => {
    const balance = await fetchEvmVaultBalance(publicClient, agentAddress, CONTRACT_ADDRESS)
    console.log('  Balance:', weiToEth(balance), 'ETH')
  })

  // Test 7: Check Pending Request
  await runTest('Check Pending Request', async () => {
    const hasPending = await hasEvmPendingRequest(publicClient, agentAddress, CONTRACT_ADDRESS)
    console.log('  Has pending request:', hasPending)
  })

  // Test 8: Update Metadata
  await runTest('Update Metadata', async () => {
    const hash = await updateEvmMetadata({
      walletClient,
      publicClient,
      agentAddress,
      name: 'UpdatedTestAgent',
      url: 'https://api.updated.io',
      tags: ['UPDATED', 'NEW_STRATEGY'],
      contractAddress: CONTRACT_ADDRESS,
    })
    console.log('  Tx:', hash)
    await publicClient.waitForTransactionReceipt({ hash })

    // Verify update
    const agent = await fetchEvmAgent(publicClient, agentAddress, CONTRACT_ADDRESS)
    if (agent?.name !== 'UpdatedTestAgent') {
      throw new Error('Metadata not updated correctly')
    }
    console.log('  Metadata updated')
  })

  // Test 9: Request Proof
  const marketId = `0x${'1'.repeat(64)}` as `0x${string}`
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now

  await runTest('Request Proof', async () => {
    const hash = await requestEvmProof({
      walletClient,
      publicClient,
      agentAddress,
      marketId,
      deadlineTs: deadline,
      contractAddress: CONTRACT_ADDRESS,
    })
    console.log('  Tx:', hash)
    await publicClient.waitForTransactionReceipt({ hash })

    // Verify pending request
    const hasPending = await hasEvmPendingRequest(publicClient, agentAddress, CONTRACT_ADDRESS)
    if (!hasPending) {
      throw new Error('Pending request not set')
    }
    console.log('  Proof request created')
  })

  // Test 10: Submit Proof
  await runTest('Submit Proof', async () => {
    const agent = await fetchEvmAgent(publicClient, agentAddress, CONTRACT_ADDRESS)
    if (!agent?.pendingRequest || agent.pendingRequest === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('No pending request to submit proof for')
    }

    const hash = await submitEvmProof({
      walletClient,
      publicClient,
      requestId: agent.pendingRequest,
      marketId,
      logRoot: `0x${'2'.repeat(64)}` as `0x${string}`,
      proofUri: 'ipfs://QmTestProofHash123456789',
      signature: `0x${'0'.repeat(128)}` as `0x${string}`,
      contractAddress: CONTRACT_ADDRESS,
    })
    console.log('  Tx:', hash)
    await publicClient.waitForTransactionReceipt({ hash })

    // Verify no more pending request
    const hasPending = await hasEvmPendingRequest(publicClient, agentAddress, CONTRACT_ADDRESS)
    if (hasPending) {
      throw new Error('Pending request not cleared after submission')
    }
    console.log('  Proof submitted')
  })

  // Test 11: Withdraw Bond
  await runTest('Withdraw Bond', async () => {
    const balanceBefore = await fetchEvmVaultBalance(publicClient, agentAddress, CONTRACT_ADDRESS)
    console.log('  Balance before:', weiToEth(balanceBefore), 'ETH')

    const hash = await withdrawEvmBond({
      walletClient,
      publicClient,
      agentAddress,
      contractAddress: CONTRACT_ADDRESS,
    })
    console.log('  Tx:', hash)
    await publicClient.waitForTransactionReceipt({ hash })

    const balanceAfter = await fetchEvmVaultBalance(publicClient, agentAddress, CONTRACT_ADDRESS)
    console.log('  Balance after:', weiToEth(balanceAfter), 'ETH')

    if (balanceAfter !== BigInt(0)) {
      throw new Error('Bond not fully withdrawn')
    }
    console.log('  Bond withdrawn')
  })

  // Print summary
  console.log('')
  console.log('='.repeat(60))
  console.log('Test Summary')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.name} (${result.duration}ms)`)
    if (!result.passed) {
      console.log(`   Error: ${result.message}`)
    }
  }

  console.log('')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`Total time: ${totalTime}ms`)
  console.log('='.repeat(60))

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(console.error)

