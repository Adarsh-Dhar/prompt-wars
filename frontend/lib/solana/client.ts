import * as anchor from "@coral-xyz/anchor";

const DEFAULT_RPC = anchor.web3.clusterApiUrl("devnet")

export function getConnection(): anchor.web3.Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL || DEFAULT_RPC
  return new anchor.web3.Connection(rpcUrl, "confirmed")
}

// Fee payer is optional; when absent we still return null so callers can short-circuit
export function getFeePayer(): anchor.web3.Keypair | null {
  const secret = process.env.SOLANA_FEE_PAYER_SECRET
  if (!secret) return null

  try {
    // Supports comma-separated array (matching Solana CLI export)
    const secretKey = Uint8Array.from(secret.split(",").map((n) => Number(n.trim())))
    return anchor.web3.Keypair.fromSecretKey(secretKey)
  } catch (error) {
    console.error("Failed to parse SOLANA_FEE_PAYER_SECRET", error)
    return null
  }
}
