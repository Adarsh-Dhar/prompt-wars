// Payment utilities for Solana transactions
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
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
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL); // Convert SOL to lamports safely (number fits JS safe range for <9e9 SOL)
  if (lamports <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Create transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Send transaction with preflight
  const signature = await wallet.sendTransaction(transaction, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  // Wait for confirmation
  const confirmation = await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature,
    },
    'confirmed'
  );

  if (confirmation.value.err) {
    throw new Error('Transaction failed to confirm');
  }

  return signature;
}

