// Solana blockchain mock for development/testing
// JavaScript version for ES modules

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
export async function sendSolanaTransaction(payload, opts = {}) {
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
export async function confirmSolanaTransaction(txId) {
  return { confirmed: typeof txId === 'string' && txId.startsWith('mock_sol_tx_') };
}

// Aliases used across the codebase
export async function sendTransaction(tx, conn, opts = {}) {
  const res = await sendSolanaTransaction(tx, opts);
  if (!res.success) throw new Error(res.error);
  return res.txId;
}

export async function sendRawTransaction(raw, opts = {}) {
  const res = await sendSolanaTransaction({ raw }, opts);
  if (!res.success) throw new Error(res.error);
  return res.txId;
}

export async function signAndSendTransaction(signer, tx, opts = {}) {
  return sendTransaction(tx, null, opts);
}

export async function confirmTransaction(txId) {
  return confirmSolanaTransaction(txId);
}

// Default export with commonly expected names
export default {
  sendSolanaTransaction,
  confirmSolanaTransaction,
  sendTransaction,
  sendRawTransaction,
  signAndSendTransaction,
  confirmTransaction,
};

