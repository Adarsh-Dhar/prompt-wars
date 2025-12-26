export type SolanaResult = { success: true; txId: string } | { success: false, error: string };

/**
 * Configuration: control dummy behavior via env or per-call opts
 * - DUMMY_ALWAYS_FAIL: if 'true', all calls fail unless opts.override === true
 */
const ENV_ALWAYS_FAIL = typeof process !== 'undefined' && process.env.DUMMY_ALWAYS_FAIL === 'true';

function makeTxId() {
  return `mock_sol_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

/**
 * sendSolanaTransaction
 * - payload: any data from callers (not used by mock)
 * - opts.alwaysFail: force a failure for testing
 * - opts.delayMs: optional artificial delay
 */
export async function sendSolanaTransaction(payload: any, opts: { alwaysFail?: boolean; delayMs?: number } = {}): Promise<SolanaResult> {
  const { alwaysFail = false, delayMs = 0 } = opts;
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  if (alwaysFail || ENV_ALWAYS_FAIL) return { success: false, error: 'mocked solana failure' };
  // deterministic mock success
  return { success: true, txId: makeTxId() };
}

/**
 * confirmSolanaTransaction
 * Simulates confirmation (true when txId looks like our mock)
 */
export async function confirmSolanaTransaction(txId: string): Promise<{ confirmed: boolean }> {
  return { confirmed: typeof txId === 'string' && txId.startsWith('mock_sol_tx_') };
}

// Aliases used across the codebase. They delegate to the safe mock implementations above.
export async function sendTransaction(tx: any, conn: any, opts: { alwaysFail?: boolean; delayMs?: number } = {}): Promise<string> {
  const res = await sendSolanaTransaction(tx, opts);
  if (!res.success) throw new Error(res.error);
  return res.txId;
}

export async function sendRawTransaction(raw: Uint8Array | Buffer, opts: { alwaysFail?: boolean; delayMs?: number } = {}): Promise<string> {
  const res = await sendSolanaTransaction({ raw }, opts);
  if (!res.success) throw new Error(res.error);
  return res.txId;
}

export async function signAndSendTransaction(signer: any, tx: any, opts: { alwaysFail?: boolean; delayMs?: number } = {}): Promise<string> {
  // noop signer in mock
  return sendTransaction(tx, null, opts);
}

export async function confirmTransaction(txId: string): Promise<{ confirmed: boolean }> {
  return confirmSolanaTransaction(txId);
}

// Default export with commonly expected names
export default {
  sendSolanaTransaction,
  confirmSolanaTransaction,
  sendTransaction,
  sendRawTransaction,
  signAndSendTransaction,
  confirmTransaction
};
