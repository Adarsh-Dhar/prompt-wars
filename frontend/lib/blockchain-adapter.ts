// Adapter to safely route wallet transaction calls to mocks when NEXT_PUBLIC_MOCK_BLOCKCHAIN is enabled.
import type { WalletContextState } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';

// Import mocks from repo-level blockchain-mocks
// Note: relative path goes from frontend/lib to repo root
import {
  sendSolanaTransaction,
  confirmSolanaTransaction,
  sendRawTransaction as mockSendRawTransaction,
  confirmTransaction as mockConfirmTransaction
} from '../../blockchain-mocks/solana';

const MOCK_ENABLED = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true';
const MOCK_ALWAYS_FAIL = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN_ALWAYS_FAIL === 'true';

export function getSafeWalletAdapter(wallet: WalletContextState | null, connection: any) {
  // If no wallet provided, return nullish-safe stub
  if (!wallet) return null;

  // If mocks enabled, return a wallet-like object whose sendTransaction returns a deterministic mock
  if (MOCK_ENABLED) {
    // Patch connection methods to prevent any network calls from the frontend
    if (connection) {
      // getLatestBlockhash -> return mock blockhash
      connection.getLatestBlockhash = async (_commitment?: any) => ({ blockhash: 'mock_blockhash', lastValidBlockHeight: 0 });

      // getFeeForMessage -> return small mock fee
      connection.getFeeForMessage = async (_message: any, _commitment?: any) => ({ value: 5000 });

      // getBalance -> return 1 SOL in lamports
      connection.getBalance = async (_pubkey: any, _commitment?: any) => anchor.web3.LAMPORTS_PER_SOL;

      // simulateTransaction -> always succeed
      connection.simulateTransaction = async (_tx: any, _opts?: any) => ({ value: { err: null, logs: [] } });

      // sendRawTransaction -> delegate to mock implementation
      connection.sendRawTransaction = async (raw: any, _opts?: any) => {
        const sig = await mockSendRawTransaction(raw, { alwaysFail: MOCK_ALWAYS_FAIL, delayMs: 50 });
        return sig;
      };

      // confirmTransaction -> accept either signature or a ConfirmedTransactionConfig-like object
      connection.confirmTransaction = async (arg: any, _commitment?: any) => {
        // If arg is an object with signature field
        let signature: string | null = null;
        if (typeof arg === 'string') signature = arg;
        else if (arg && typeof arg === 'object') signature = arg.signature || (arg as any).txId || null;
        if (!signature) return { value: { err: null } };
        const confirmed = await mockConfirmTransaction(signature);
        return { value: { err: confirmed.confirmed ? null : { failed: true } } };
      };
    }

    return {
      publicKey: wallet.publicKey,
      connected: wallet.connected,
      sendTransaction: async (_tx: any, _conn: any, _opts?: any) => {
        // Simulate network delay and optionally fail
        const result = await sendSolanaTransaction({ debug: 'mocked from frontend adapter' }, { alwaysFail: MOCK_ALWAYS_FAIL, delayMs: 50 });
        if (!result.success) throw new Error(result.error);
        // Return a mock signature string
        return result.txId;
      },
      signTransaction: async (_tx: any) => {
        // noop: return tx unchanged
        return _tx;
      },
      signAllTransactions: async (txs: any[]) => {
        return txs;
      },
    } as any;
  }

  // Default: pass through to the real wallet
  return wallet;
}
