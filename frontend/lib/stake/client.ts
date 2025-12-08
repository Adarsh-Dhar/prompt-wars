import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor"
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js"
import { agentRegistryIdl, AGENT_REGISTRY_PROGRAM_ID, AgentRegistryIdl } from "./agent-registry-idl"

const PROGRAM_ID = new PublicKey(AGENT_REGISTRY_PROGRAM_ID)
const REGISTRY_SEED = Buffer.from("registry")
const AGENT_SEED = Buffer.from("agent")
const VAULT_SEED = Buffer.from("vault")
const REQUEST_SEED = Buffer.from("request")

type MinimalWallet = Wallet & {
  publicKey: PublicKey
}

const dummyWallet: MinimalWallet = {
  publicKey: PublicKey.default,
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
}

export function getProgram(connection: Connection, wallet?: Wallet) {
  const provider = new AnchorProvider(connection, (wallet as MinimalWallet) ?? dummyWallet, {
    commitment: "confirmed",
  })
  return new Program(agentRegistryIdl as AgentRegistryIdl, PROGRAM_ID, provider)
}

export function getRegistryPda() {
  return PublicKey.findProgramAddressSync([REGISTRY_SEED], PROGRAM_ID)[0]
}

export function getAgentPda(agentWallet: PublicKey) {
  return PublicKey.findProgramAddressSync([AGENT_SEED, agentWallet.toBuffer()], PROGRAM_ID)[0]
}

export function getVaultPda(agent: PublicKey) {
  return PublicKey.findProgramAddressSync([VAULT_SEED, agent.toBuffer()], PROGRAM_ID)[0]
}

export function getProofRequestPda(agent: PublicKey, marketId: Uint8Array) {
  return PublicKey.findProgramAddressSync([REQUEST_SEED, agent.toBuffer(), Buffer.from(marketId)], PROGRAM_ID)[0]
}

export type RegistryAccount = {
  authority: PublicKey
  bondLamports: BN
  slashPenaltyLamports: BN
  bump: number
}

export type ProofRequestAccount = {
  agent: PublicKey
  requester: PublicKey
  marketId: number[] // [u8; 32]
  requestedAt: BN // i64
  deadlineTs: BN // i64
  proofUri: string
  logRoot: number[] // [u8; 32]
  signature: number[] // [u8; 64]
  fulfilled: boolean
  slashable: boolean
  bump: number
}

export async function fetchRegistry(connection: Connection) {
  const program = getProgram(connection)
  const registry = getRegistryPda()
  return program.account.registry.fetchNullable(registry) as Promise<RegistryAccount | null>
}

/**
 * Fetch proof request account from contract
 */
export async function fetchProofRequest(params: {
  connection: Connection
  agentWallet: PublicKey
  marketId: PublicKey
}): Promise<ProofRequestAccount | null> {
  const { connection, agentWallet, marketId } = params
  const program = getProgram(connection)

  const agent = getAgentPda(agentWallet)
  const marketIdArray = publicKeyToUint8Array32(marketId)
  const proofRequest = getProofRequestPda(agent, new Uint8Array(marketIdArray))

  try {
    const account = await program.account.proofRequest.fetchNullable(proofRequest)
    return account as ProofRequestAccount | null
  } catch (error) {
    console.error("Error fetching proof request:", error)
    return null
  }
}

export async function registerAgent(params: {
  connection: Connection
  wallet: Wallet
  name: string
  url: string
  tags: string[]
}) {
  const { connection, wallet, name, url, tags } = params
  const program = getProgram(connection, wallet)

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  const registry = getRegistryPda()
  const agent = getAgentPda(wallet.publicKey)
  const vault = getVaultPda(agent)

  const sig = await program.methods
    .registerAgent(name, url, tags)
    .accounts({
      registry,
      agent,
      agentWallet: wallet.publicKey,
      vault,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return { signature: sig, agentPda: agent }
}

/**
 * Convert PublicKey to [u8; 32] array format
 */
function publicKeyToUint8Array32(pubkey: PublicKey): number[] {
  const buffer = pubkey.toBuffer()
  if (buffer.length !== 32) {
    throw new Error(`Invalid PublicKey length: expected 32, got ${buffer.length}`)
  }
  return Array.from(buffer)
}

/**
 * Request proof from an agent for a specific market
 */
export async function requestProof(params: {
  connection: Connection
  wallet: Wallet
  agentWallet: PublicKey
  marketId: PublicKey
  deadlineTs?: BN // Optional, defaults to 1 hour from now
}) {
  const { connection, wallet, agentWallet, marketId, deadlineTs } = params
  const program = getProgram(connection, wallet)

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  const registry = getRegistryPda()
  const agent = getAgentPda(agentWallet)
  const marketIdArray = publicKeyToUint8Array32(marketId)
  const proofRequest = getProofRequestPda(agent, new Uint8Array(marketIdArray))

  // Default deadline to 1 hour from now if not provided
  const deadline = deadlineTs || new BN(Math.floor(Date.now() / 1000) + 3600)

  const sig = await program.methods
    .requestProof(marketIdArray, deadline)
    .accounts({
      agent,
      registry,
      proofRequest,
      requester: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return { signature: sig, proofRequestPda: proofRequest }
}

/**
 * Submit proof to the contract
 */
export async function submitProof(params: {
  connection: Connection
  wallet: Wallet
  agentWallet: PublicKey
  marketId: PublicKey
  logRoot: Uint8Array // [u8; 32]
  proofUri: string
  signature: Uint8Array // [u8; 64]
}) {
  const { connection, wallet, agentWallet, marketId, logRoot, proofUri, signature } = params
  const program = getProgram(connection, wallet)

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  if (logRoot.length !== 32) {
    throw new Error(`Invalid logRoot length: expected 32, got ${logRoot.length}`)
  }

  if (signature.length !== 64) {
    throw new Error(`Invalid signature length: expected 64, got ${signature.length}`)
  }

  const agent = getAgentPda(agentWallet)
  const marketIdArray = publicKeyToUint8Array32(marketId)
  const proofRequest = getProofRequestPda(agent, new Uint8Array(marketIdArray))

  // Convert Uint8Array to number arrays for Anchor
  const logRootArray = Array.from(logRoot)
  const signatureArray = Array.from(signature)

  const sig = await program.methods
    .submitProof(marketIdArray, logRootArray, proofUri, signatureArray)
    .accounts({
      agent,
      proofRequest,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return { signature: sig }
}
