// Payment utilities for Solana transactions
import { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

/**
 * Send SOL payment to a recipient address
 * @param connection Solana connection
 * @param wallet Wallet adapter state
 * @param recipient Recipient wallet address (base58 string)
 * @param amountSol Amount in SOL
 * @returns Transaction signature
 */
export async function sendSolPayment(
  connection: Connection,
  wallet: WalletContextState,
  recipient: string,
  amountSol: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const recipientPubkey = new PublicKey(recipient);
  const lamports = amountSol * 1e9; // Convert SOL to lamports

  // Create transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipientPubkey,
      lamports: lamports,
    })
  );

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Send transaction
  const signature = await wallet.sendTransaction(transaction, connection, {
    skipPreflight: false,
  });

  // Wait for confirmation
  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature,
    },
    'confirmed'
  );

  return signature;
}

