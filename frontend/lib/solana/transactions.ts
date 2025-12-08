import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { getConnection } from "./client"

export type PaymentCheck = {
  payer: string
  lamports: number
}

/**
 * Confirms a transaction and ensures it contains a SystemProgram transfer
 * to the configured server wallet for at least the expected amount.
 */
export async function assertPaymentToServer(
  signature: string,
  expectedLamports: number,
  expectedPayer?: string
): Promise<PaymentCheck> {
  const serverWallet = process.env.NEXT_PUBLIC_SERVER_WALLET
  if (!serverWallet) {
    throw new Error("Server wallet not configured")
  }

  const connection = getConnection()

  // Ensure the transaction is confirmed on chain
  const confirmation = await connection.confirmTransaction(signature, "confirmed")
  if (confirmation.value.err) {
    throw new Error("Transaction failed on chain")
  }

  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  })

  if (!tx) {
    throw new Error("Transaction not found or not yet confirmed")
  }

  if (tx.meta?.err) {
    throw new Error("Transaction contains an error")
  }

  const transferIx = tx.transaction.message.instructions.find(
    (ix: any) => "parsed" in ix && (ix as any).parsed?.type === "transfer"
  ) as any

  if (!transferIx?.parsed?.info) {
    throw new Error("Transfer instruction not found in transaction")
  }

  const info = transferIx.parsed.info
  const destination = info.destination as string | undefined
  const source = info.source as string | undefined
  const lamports = Number(info.lamports) || 0

  if (!destination || !source) {
    throw new Error("Unable to read transfer accounts")
  }

  if (destination !== serverWallet) {
    throw new Error("Payment destination does not match server wallet")
  }

  if (expectedPayer && source !== expectedPayer) {
    throw new Error("Payment source does not match wallet")
  }

  if (lamports < expectedLamports) {
    throw new Error("Payment amount is below required minimum")
  }

  return { payer: source, lamports }
}

export function solToLamports(amount: number) {
  return Math.ceil(amount * LAMPORTS_PER_SOL)
}
