// Payment utilities for Solana transactions
import * as anchor from "@coral-xyz/anchor";
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getSafeWalletAdapter } from './blockchain-adapter';
import { confirmTransaction as mockConfirmTransaction } from '../../../blockchain-mocks/solana';

const IS_MOCK = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true';

// Memo program ID (same on all Solana networks)
const MEMO_PROGRAM_ID = new anchor.web3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Create a memo instruction for a transaction
 * @param memo The memo text to include
 * @param signerPubkey The public key that will sign the transaction
 * @returns TransactionInstruction
 */
function createMemoInstruction(memo: string, signerPubkey: anchor.web3.PublicKey): anchor.web3.TransactionInstruction {
  return new anchor.web3.TransactionInstruction({
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
  connection: anchor.web3.Connection,
  wallet: WalletContextState,
  recipient: string,
  amountSol: number,
  memo?: string
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  const recipientPubkey = new anchor.web3.PublicKey(recipient);
  const lamports = Math.round(amountSol * anchor.web3.LAMPORTS_PER_SOL); // Convert SOL to lamports safely (number fits JS safe range for <9e9 SOL)
  if (lamports <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Lightweight debug context for user-facing errors
  const debugContext = {
    recipient,
    lamports,
    amountSol,
    wallet: wallet.publicKey?.toBase58(),
    rpc: connection.rpcEndpoint,
  };

  // Create transaction with transfer instruction
  const transaction = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  // Add memo instruction if provided
  if (memo) {
    transaction.add(createMemoInstruction(memo, wallet.publicKey));
  }

  // Prepare blockhash + fee payer
  const { blockhash, lastValidBlockHeight } = IS_MOCK ? { blockhash: 'mock_blockhash', lastValidBlockHeight: 0 } : await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Estimate fees and ensure the wallet can cover them before asking the wallet to sign
  const feeForMessage = await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed');
  const feeLamports = feeForMessage.value ?? 5000; // fallback to a small legacy fee if RPC cannot estimate
  const balance = await connection.getBalance(wallet.publicKey, 'processed');
  const requiredLamports = lamports + feeLamports;
  if (balance < requiredLamports) {
    const needed = (requiredLamports - balance) / anchor.web3.LAMPORTS_PER_SOL;
    throw new Error(`Insufficient SOL to cover ${amountSol} SOL payment plus fees. Need ~${needed.toFixed(4)} more SOL.`);
  }

  // Dry-run the transaction; if the RPC rejects simulate (common “invalid arguments”), fall through to real send
  try {
    const simulation = await connection.simulateTransaction(transaction, {
      sigVerify: false,
      commitment: 'processed',
    });
    if (simulation.value.err) {
      const simLogs = simulation.value.logs?.join('\n') ?? 'No logs';
      throw new Error(
        `Transaction simulation failed: ${simulation.value.err.toString()}\n${simLogs}\nContext: ${JSON.stringify(
          debugContext
        )}`
      );
    }
  } catch (simErr) {
    console.warn('[payments] simulateTransaction failed; continuing to send', {
      error: simErr instanceof Error ? simErr.message : simErr,
      context: debugContext,
    });
  }

  try {
    // Use safe adapter which may route to mocks in dev/CI
    const safeWallet = getSafeWalletAdapter(wallet as WalletContextState, connection);
    if (!safeWallet || !safeWallet.sendTransaction) {
      throw new Error('No wallet adapter available to send transaction');
    }

    // Send transaction with preflight (avoid minContextSlot to reduce RPC "invalid arguments" failures)
    const signature = await safeWallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    let confirmation
    if (IS_MOCK) {
      confirmation = await mockConfirmTransaction(signature)
      if (!confirmation.confirmed) throw new Error('Transaction failed to confirm (mock)')
    } else {
      const conf = await connection.confirmTransaction(
        {
          blockhash,
          lastValidBlockHeight,
          signature,
        },
        'confirmed'
      )
      confirmation = conf
      if ((conf as any).value?.err) {
        const errMessage = (conf as any).value.err instanceof Error ? (conf as any).value.err.message : JSON.stringify((conf as any).value.err);
        throw new Error(`Transaction failed to confirm: ${errMessage}`);
      }
    }

    return signature;
  } catch (err: any) {
    // Surface wallet / RPC logs to help debugging in UI
    const logs = err?.logs ? `\nLogs:\n${err.logs.join('\n')}` : '';
    const causeMsg = err?.cause?.message ? `\nCause: ${err.cause.message}` : '';
    const ctx = `\nContext: ${JSON.stringify(debugContext)}`;
    throw new Error(err?.message ? `${err.message}${logs}${causeMsg}${ctx}` : `Failed to send transaction${ctx}`);
  }
}
