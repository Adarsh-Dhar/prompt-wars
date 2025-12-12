import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor"
import { agentRegistryIdl, AGENT_REGISTRY_PROGRAM_ID, AgentRegistryIdl } from "./agent-registry-idl"

const PROGRAM_ID = new anchor.web3.PublicKey(AGENT_REGISTRY_PROGRAM_ID)
const REGISTRY_SEED = Buffer.from("registry")
const AGENT_SEED = Buffer.from("agent")
const VAULT_SEED = Buffer.from("vault")
const REQUEST_SEED = Buffer.from("request")

const dummyWallet = {
  publicKey: anchor.web3.PublicKey.default,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any[]) => txs,
}

export function getProgram(connection: anchor.web3.Connection, wallet?: Wallet) {
  try {
    const provider = new AnchorProvider(connection, (wallet as any) ?? dummyWallet, {
      commitment: "confirmed",
    })
    
    // Create a complete IDL with types field for proper account deserialization
    const completeIdl = {
      version: "0.1.0",
      name: "agent_registry",
      address: AGENT_REGISTRY_PROGRAM_ID,
      instructions: agentRegistryIdl.instructions,
      accounts: agentRegistryIdl.accounts,
      types: agentRegistryIdl.types, // This is required for account deserialization
    }
    
    return new Program(completeIdl as any, provider)
  } catch (error) {
    console.error("Error creating program:", error)
    throw new Error(`Failed to create program: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function getRegistryPda() {
  return anchor.web3.PublicKey.findProgramAddressSync([REGISTRY_SEED], PROGRAM_ID)[0]
}

export function getAgentPda(agentWallet: anchor.web3.PublicKey) {
  return anchor.web3.PublicKey.findProgramAddressSync([AGENT_SEED, agentWallet.toBuffer()], PROGRAM_ID)[0]
}

export function getVaultPda(agent: anchor.web3.PublicKey) {
  return anchor.web3.PublicKey.findProgramAddressSync([VAULT_SEED, agent.toBuffer()], PROGRAM_ID)[0]
}

export function getProofRequestPda(agent: anchor.web3.PublicKey, marketId: Uint8Array) {
  return anchor.web3.PublicKey.findProgramAddressSync([REQUEST_SEED, agent.toBuffer(), Buffer.from(marketId)], PROGRAM_ID)[0]
}

export type RegistryAccount = {
  authority: anchor.web3.PublicKey
  bondLamports: BN
  slashPenaltyLamports: BN
  bump: number
}

export type ProofRequestAccount = {
  agent: anchor.web3.PublicKey
  requester: anchor.web3.PublicKey
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

export async function fetchRegistry(connection: anchor.web3.Connection) {
  try {
    const program = getProgram(connection)
    const registry = getRegistryPda()
    
    // Check if the registry account exists first
    const accountInfo = await connection.getAccountInfo(registry)
    if (!accountInfo) {
      return null // Registry not initialized yet
    }
    
    return await (program.account as any).registry.fetchNullable(registry) as Promise<RegistryAccount | null>
  } catch (error) {
    console.error("Error fetching registry:", error)
    // If it's a deserialization error, the registry might not be initialized
    if (error instanceof Error && error.message.includes('_bn')) {
      return null
    }
    throw error
  }
}

/**
 * Check if the program is deployed on-chain
 */
export async function checkProgramDeployed(connection: anchor.web3.Connection): Promise<boolean> {
  try {
    const programInfo = await connection.getAccountInfo(PROGRAM_ID)
    return programInfo !== null
  } catch (error) {
    return false
  }
}

/**
 * Initialize the registry if it doesn't exist
 */
export async function initializeRegistry(params: {
  connection: anchor.web3.Connection
  wallet: Wallet
  bondLamports?: number // Defaults to 0.05 SOL
  slashPenaltyLamports?: number // Defaults to full bond
}) {
  const { connection, wallet, bondLamports, slashPenaltyLamports } = params
  const program = getProgram(connection, wallet)

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    throw new Error("Wallet not connected")
  }

  // Log declared program ID
  const declaredProgramId = PROGRAM_ID.toBase58()
  console.log("=".repeat(80))
  console.log("📋 PROGRAM ID DEBUG INFORMATION")
  console.log("=".repeat(80))
  console.log("🔵 DECLARED Program ID (from code/PROGRAM_ID):", declaredProgramId)
  console.log("🔵 DECLARED Program ID (from IDL constant):", AGENT_REGISTRY_PROGRAM_ID)
  console.log("🔵 Program object ID:", program.programId.toBase58())
  console.log("🔵 IDL metadata address:", (agentRegistryIdl as any).metadata?.address || "not set")

  // Check if program is deployed and get actual program ID
  const isDeployed = await checkProgramDeployed(connection)
  if (!isDeployed) {
    console.error("❌ Program is NOT deployed at:", declaredProgramId)
    const error = new Error("Agent Registry program is not deployed on-chain")
    ;(error as any).isProgramNotDeployed = true
    ;(error as any).programId = PROGRAM_ID.toBase58()
    throw error
  }

  // Get actual program ID from on-chain account
  try {
    const programAccount = await connection.getAccountInfo(PROGRAM_ID)
    if (programAccount) {
      const actualProgramId = PROGRAM_ID.toBase58()
      console.log("🟢 ACTUAL Program ID (on-chain account address):", actualProgramId)
      console.log("🟢 ACTUAL Program Account Owner:", programAccount.owner.toBase58())
      console.log("🟢 ACTUAL Program Account Executable:", programAccount.executable)
      console.log("🟢 ACTUAL Program Account Lamports:", programAccount.lamports.toString())
      
      // Try to read the program data to find the declared ID embedded in the binary
      // Anchor programs embed the program ID in the first 8 bytes of the executable data
      if (programAccount.data && programAccount.data.length >= 8) {
        const embeddedProgramIdBytes = programAccount.data.slice(0, 8)
        console.log("🟢 ACTUAL Embedded Program ID (first 8 bytes):", Array.from(embeddedProgramIdBytes).map(b => b.toString(16).padStart(2, '0')).join(''))
      }
    } else {
      console.error("❌ Program account not found at:", declaredProgramId)
    }
  } catch (error) {
    console.error("❌ Error fetching program account info:", error)
  }

  // Compare declared vs actual
  if (declaredProgramId !== AGENT_REGISTRY_PROGRAM_ID) {
    console.warn("⚠️ WARNING: PROGRAM_ID constant doesn't match AGENT_REGISTRY_PROGRAM_ID constant!")
    console.warn("   PROGRAM_ID:", declaredProgramId)
    console.warn("   AGENT_REGISTRY_PROGRAM_ID:", AGENT_REGISTRY_PROGRAM_ID)
  }

  console.log("=".repeat(80))
  console.log("The error 'DeclaredProgramIdMismatch' means:")
  console.log("  - The program binary on-chain was compiled with a different declare_id!()")
  console.log("  - You need to rebuild and redeploy with the current declare_id!() value")
  console.log("=".repeat(80))

  const registry = getRegistryPda()
  const defaultBond = bondLamports || anchor.web3.LAMPORTS_PER_SOL / 20 // 0.05 SOL in lamports
  const defaultSlash = slashPenaltyLamports ?? defaultBond // default to full bond slashable

  try {
    const sig = await program.methods
      .initializeRegistry(new BN(defaultBond), new BN(defaultSlash))
      .accounts({
        registry,
        authority: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    return { signature: sig, registryPda: registry }
  } catch (error: any) {
    // Enhanced error logging for DeclaredProgramIdMismatch
    if (error?.code === 4100 || error?.error?.errorCode?.code === "DeclaredProgramIdMismatch") {
      console.error("=".repeat(80))
      console.error("❌ DECLARED PROGRAM ID MISMATCH ERROR")
      console.error("=".repeat(80))
      console.error("Error Code:", error?.code || error?.error?.errorCode?.code)
      console.error("Error Message:", error?.msg || error?.error?.errorMessage || error?.message)
      
      // Try to extract the declared and actual IDs from the error
      const errorMsg = error?.msg || error?.error?.errorMessage || error?.message || ""
      console.error("Full Error:", errorMsg)
      
      // The error should contain information about what was declared vs actual
      if (error?.logs) {
        console.error("Error Logs:")
        error.logs.forEach((log: string) => console.error("  ", log))
      }
      
      console.error("=".repeat(80))
      console.error("SOLUTION:")
      console.error("1. The deployed binary was compiled with a different declare_id!()")
      console.error("2. Rebuild the program: cd stake && anchor build")
      console.error("3. Redeploy: anchor deploy --provider.cluster devnet")
      console.error("4. Make sure declare_id!() in lib.rs matches the deployed program address")
      console.error("=".repeat(80))
    }
    throw error
  }
}

/**
 * Fetch proof request account from contract
 */
export async function fetchProofRequest(params: {
  connection: anchor.web3.Connection
  agentWallet: anchor.web3.PublicKey
  marketId: anchor.web3.PublicKey
}): Promise<ProofRequestAccount | null> {
  const { connection, agentWallet, marketId } = params
  const program = getProgram(connection)

  const agent = getAgentPda(agentWallet)
  const marketIdArray = publicKeyToUint8Array32(marketId)
  const proofRequest = getProofRequestPda(agent, new Uint8Array(marketIdArray))

  try {
    const account = await (program.account as any).ProofRequest.fetchNullable(proofRequest)
    return account as ProofRequestAccount | null
  } catch (error) {
    console.error("Error fetching proof request:", error)
    return null
  }
}

export async function registerAgent(params: {
  connection: anchor.web3.Connection
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
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc()

  return { signature: sig, agentPda: agent }
}

/**
 * Convert PublicKey to [u8; 32] array format
 */
function publicKeyToUint8Array32(pubkey: anchor.web3.PublicKey): number[] {
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
  connection: anchor.web3.Connection
  wallet: Wallet
  agentWallet: anchor.web3.PublicKey
  marketId: anchor.web3.PublicKey
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
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc()

  return { signature: sig, proofRequestPda: proofRequest }
}

/**
 * Submit proof to the contract
 */
export async function submitProof(params: {
  connection: anchor.web3.Connection
  wallet: Wallet
  agentWallet: anchor.web3.PublicKey
  marketId: anchor.web3.PublicKey
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
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc()

  return { signature: sig }
}
