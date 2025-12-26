export type CronosResult = { success: true; txHash: string } | { success: false, error: string };

/**
 * sendCronosTransaction
 * - payload: any
 * - opts.alwaysFail: force failure
 * - opts.delayMs: artificial delay
 */
function makeTxHash() {
  return `mock_cronos_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function sendCronosTransaction(payload: any, opts: { alwaysFail?: boolean; delayMs?: number } = {}): CronosResult {
  const { alwaysFail = false } = opts;
  if (alwaysFail) return { success: false, error: 'mocked cronos failure' };
  return { success: true, txHash: makeTxHash() };
}

/**
 * getCronosReceipt
 * Returns a mock receipt object
 */
export function getCronosReceipt(txHash: string): { status: 'success' | 'failure' | 'pending' } {
  if (typeof txHash === 'string' && txHash.indexOf('mock_cronos_tx_') === 0) return { status: 'success' };
  return { status: 'failure' };
}

// Aliases used across the codebase
export function sendTransaction(tx: any, opts: { alwaysFail?: boolean; delayMs?: number } = {}): string {
  const res = sendCronosTransaction(tx, opts);
  if (!res.success) throw new Error(res.error);
  return res.txHash;
}

export function sendRawTransaction(raw: any, opts: { alwaysFail?: boolean; delayMs?: number } = {}): string {
  const res = sendCronosTransaction({ raw }, opts);
  if (!res.success) throw new Error(res.error);
  return res.txHash;
}

export function getTransactionReceipt(txHash: string): { status: 'success' | 'failure' | 'pending' } {
  return getCronosReceipt(txHash);
}

export default {
  sendCronosTransaction,
  getCronosReceipt,
  sendTransaction,
  sendRawTransaction,
  getTransactionReceipt
};
