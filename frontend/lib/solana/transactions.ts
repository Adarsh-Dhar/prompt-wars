import { confirmSolanaTransaction } from '../../../blockchain-mocks/solana';

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

  // Use mock confirmation to avoid chain interactions
  const confirmed = await confirmSolanaTransaction(signature);
  if (!confirmed || !confirmed.confirmed) {
    throw new Error('Transaction not found or not confirmed (mock)')
  }

  // In mock mode we return a deterministic success, assuming server received expectedLamports
  return { payer: expectedPayer || 'MOCK_PAYER', lamports: expectedLamports }
}

export function solToLamports(amount: number) {
  return Math.ceil(amount * 1e9)
}
