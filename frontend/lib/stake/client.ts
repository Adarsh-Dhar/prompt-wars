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

export async function fetchRegistry(connection: Connection) {
  const program = getProgram(connection)
  const registry = getRegistryPda()
  return program.account.registry.fetchNullable(registry) as Promise<RegistryAccount | null>
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
