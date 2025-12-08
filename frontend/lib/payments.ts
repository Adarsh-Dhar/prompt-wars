// Payment utilities for Solana transactions
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Memo program ID (same on all Solana networks)
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Create a memo instruction for a transaction
 * @param memo The memo text to include
 * @param signerPubkey The public key that will sign the transaction
 * @returns TransactionInstruction
 */
function createMemoInstruction(memo: string, signerPubkey: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signerPubkey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, 'utf8'),
  });
}

/**
 * Send SOL payment to a recipient address
 * @param connection Solana connection
 * @param wallet Wallet adapter state
 * @param recipient Recipient wallet address (base58 string)
 * @param amountSol Amount in SOL
 * @param memo Optional memo text to include in the transaction
 * @returns Transaction signature
 */
export async function sendSolPayment(
  connection: Connection,
  wallet: WalletContextState,
  recipient: string,
  amountSol: number,
  memo?: string
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const recipientPubkey = new PublicKey(recipient);
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL); // Convert SOL to lamports safely (number fits JS safe range for <9e9 SOL)
  if (lamports <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Create transaction with transfer instruction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  // Add memo instruction if provided
  if (memo) {
    transaction.add(createMemoInstruction(memo, wallet.publicKey));
  }

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

