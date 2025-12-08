// Agent Server API utilities
// Handles communication with the agent server and payment token management

import { Connection } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { sendSolPayment } from './payments';
import { verifyCompleteChain, type VerifiedLog } from './chain-verification';

const AGENT_SERVER_URL = process.env.NEXT_PUBLIC_AGENT_SERVER_URL || 'http://localhost:4000';
const PAYMENT_TOKEN_KEY = 'agent-server-payment-token';

export const PEEK_PRICE = 0.05; // SOL
export const GOD_MODE_PRICE = 1.0; // SOL

export interface PaymentRequiredResponse {
  error: string;
  price: number;
  currency: string;
  recipient: string;
  memo: string;
}

export interface AgentLog {
  log_id?: number;
  id: number | string;
  timestamp: string;
  message: string;
  type: string;
  details?: any;
  previous_hash?: string;
  current_hash?: string;
}

export interface AgentLogsResponse {
  status: string;
  logs: AgentLog[];
  lastUpdate: number;
  signature?: string;
  chain_root_hash?: string;
  agent_public_key?: string;
  dramaStage?: string;
  emotion?: string;
  panicLevel?: number;
  greedLevel?: number;
  lastToken?: string;
}

/**
 * Get payment token from localStorage
 */
export function getPaymentToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PAYMENT_TOKEN_KEY);
}

/**
 * Save payment token to localStorage
 */
export function setPaymentToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PAYMENT_TOKEN_KEY, token);
}

/**
 * Remove payment token from localStorage
 */
export function clearPaymentToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PAYMENT_TOKEN_KEY);
}

/**
 * Handle 402 Payment Required response
 * @param paymentDetails Payment details from 402 response
 * @param connection Solana connection
 * @param wallet Wallet adapter state
 * @returns Transaction signature
 */
export async function handle402Payment(
  paymentDetails: PaymentRequiredResponse,
  connection: Connection,
  wallet: WalletContextState
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  if (paymentDetails.currency !== 'SOL') {
    throw new Error(`Unsupported currency: ${paymentDetails.currency}`);
  }

  // Send payment with memo
  const signature = await sendSolPayment(
    connection,
    wallet,
    paymentDetails.recipient,
    paymentDetails.price,
    paymentDetails.memo
  );

  return signature;
}

/**
 * Make a request with automatic 402 payment handling
 * @param url API endpoint URL
 * @param options Fetch options
 * @param connection Solana connection
 * @param wallet Wallet adapter state
 * @param retryWithPayment Whether to retry with payment if 402 is received
 * @returns Response data
 */
async function fetchWith402Handling<T>(
  url: string,
  options: RequestInit,
  connection: Connection | null,
  wallet: WalletContextState | null,
  retryWithPayment: boolean = true
): Promise<T> {
  const response = await fetch(url, options);

  // Handle 402 Payment Required
  if (response.status === 402 && retryWithPayment && connection && wallet) {
    const paymentDetails: PaymentRequiredResponse = await response.json();
    
    // Process payment
    const signature = await handle402Payment(paymentDetails, connection, wallet);
    
    // Save payment signature for future use
    setPaymentToken(signature);
    
    // Retry request with Authorization header
    const retryOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Signature ${signature}`,
      },
    };
    
    const retryResponse = await fetch(url, retryOptions);
    
    if (!retryResponse.ok) {
      const errorData = await retryResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${retryResponse.statusText}`);
    }
    
    return retryResponse.json();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 402) {
      throw new Error(errorData.error || 'Payment required');
    }
    throw new Error(errorData.error || `Request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch agent logs from the agent server
 * @param paymentSignature Optional payment signature for premium access
 * @param connection Optional Solana connection for 402 handling
 * @param wallet Optional wallet for 402 handling
 */
export async function fetchAgentLogs(
  paymentSignature?: string | null,
  connection?: Connection | null,
  wallet?: WalletContextState | null
): Promise<AgentLogsResponse> {
  const signature = paymentSignature || getPaymentToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (signature) {
    headers['Authorization'] = `Signature ${signature}`;
  }

  const options: RequestInit = {
    method: 'GET',
    headers,
    cache: 'no-store',
  };

  const response = await fetchWith402Handling<AgentLogsResponse>(
    `${AGENT_SERVER_URL}/api/stream`,
    options,
    connection || null,
    wallet || null,
    false // Don't auto-retry for stream endpoint (it shows redacted logs)
  );

  // Verify chain integrity and signature if available
  if (response.signature && response.chain_root_hash && response.agent_public_key && response.logs.length > 0) {
    try {
      const verification = await verifyCompleteChain(
        response.logs as VerifiedLog[],
        response.chain_root_hash,
        response.signature,
        response.agent_public_key
      );

      if (!verification.valid) {
        console.error('[CHAIN] Chain verification failed:', verification.errors);
        // Attach verification errors to response for UI handling
        (response as any).verificationErrors = verification.errors;
        (response as any).verificationWarnings = verification.warnings;
        (response as any).chainValid = false;
      } else {
        (response as any).chainValid = true;
        if (verification.warnings && verification.warnings.length > 0) {
          (response as any).verificationWarnings = verification.warnings;
        }
      }
    } catch (error) {
      console.error('[CHAIN] Error during verification:', error);
      (response as any).verificationErrors = [`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`];
      (response as any).chainValid = false;
    }
  } else {
    // No signature data - mark as unverified
    (response as any).chainValid = null;
  }

  return response;
}

/**
 * Fetch premium logs from the agent server (x402 protected)
 * @param connection Solana connection
 * @param wallet Wallet adapter state
 * @param paymentSignature Optional existing payment signature
 * @returns Object with logs data and the signature used
 */
export async function fetchPremiumLogs(
  connection: Connection,
  wallet: WalletContextState,
  paymentSignature?: string | null
): Promise<{ data: AgentLogsResponse; signature: string | null }> {
  const signature = paymentSignature || getPaymentToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (signature) {
    headers['Authorization'] = `Signature ${signature}`;
  }

  const options: RequestInit = {
    method: 'GET',
    headers,
    cache: 'no-store',
  };

  const data = await fetchWith402Handling<AgentLogsResponse>(
    `${AGENT_SERVER_URL}/api/logs/premium`,
    options,
    connection,
    wallet,
    true // Auto-retry with payment for premium endpoint
  );

  // Verify chain integrity and signature if available
  if (data.signature && data.chain_root_hash && data.agent_public_key && data.logs.length > 0) {
    try {
      const verification = await verifyCompleteChain(
        data.logs as VerifiedLog[],
        data.chain_root_hash,
        data.signature,
        data.agent_public_key
      );

      if (!verification.valid) {
        console.error('[CHAIN] Chain verification failed:', verification.errors);
        // Attach verification errors to response for UI handling
        (data as any).verificationErrors = verification.errors;
        (data as any).verificationWarnings = verification.warnings;
        (data as any).chainValid = false;
        
        // For premium logs, we should reject corrupted chains
        throw new Error(`Chain verification failed: ${verification.errors.join('; ')}`);
      } else {
        (data as any).chainValid = true;
        if (verification.warnings && verification.warnings.length > 0) {
          (data as any).verificationWarnings = verification.warnings;
        }
      }
    } catch (error) {
      console.error('[CHAIN] Error during verification:', error);
      // Re-throw verification errors for premium logs
      throw error;
    }
  } else {
    // No signature data - mark as unverified
    (data as any).chainValid = null;
  }

  // Return the signature that was used (either existing or newly created)
  const usedSignature = getPaymentToken();
  return { data, signature: usedSignature };
}

/**
 * Fetch premium alpha data from the agent server (x402 protected)
 * @param connection Solana connection
 * @param wallet Wallet adapter state
 * @param paymentSignature Optional existing payment signature
 */
export async function fetchPremiumAlpha(
  connection: Connection,
  wallet: WalletContextState,
  paymentSignature?: string | null
): Promise<{
  type: string;
  signal: string;
  confidence: string;
  reason: string;
  timestamp: string;
}> {
  const signature = paymentSignature || getPaymentToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (signature) {
    headers['Authorization'] = `Signature ${signature}`;
  }

  const options: RequestInit = {
    method: 'GET',
    headers,
    cache: 'no-store',
  };

  return fetchWith402Handling(
    `${AGENT_SERVER_URL}/api/premium-alpha`,
    options,
    connection,
    wallet,
    true // Auto-retry with payment for premium endpoint
  );
}

/**
 * Send God Mode injection to the agent server
 * @param prompt The prompt to inject
 * @param signature The payment transaction signature
 */
export async function sendGodModeInjection(prompt: string, signature: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${AGENT_SERVER_URL}/api/god-mode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, signature }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to send God Mode injection');
  }

  return response.json();
}

/**
 * Get agent status
 */
export async function getAgentStatus(): Promise<{
  status: string;
  mission: string;
  logsCount: number;
  lastUpdate: number;
}> {
  const response = await fetch(`${AGENT_SERVER_URL}/api/status`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch proof from agent server for specific market (x402 protected)
 * @param agentUrl Agent server URL
 * @param marketId Market ID to request proof for
 * @param connection Solana connection
 * @param wallet Wallet adapter state
 * @param paymentSignature Optional existing payment signature
 * @returns Proof response with chain_root_hash and signature
 */
export async function fetchAgentProof(
  agentUrl: string,
  marketId: string,
  connection: Connection,
  wallet: WalletContextState,
  paymentSignature?: string | null
): Promise<AgentLogsResponse> {
  const signature = paymentSignature || getPaymentToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (signature) {
    headers['Authorization'] = `Signature ${signature}`;
  }

  const options: RequestInit = {
    method: 'GET',
    headers,
    cache: 'no-store',
  };

  // Construct agent server proof endpoint URL
  const proofUrl = `${agentUrl}/api/proof?market_id=${encodeURIComponent(marketId)}`;

  const data = await fetchWith402Handling<AgentLogsResponse>(
    proofUrl,
    options,
    connection,
    wallet,
    true // Auto-retry with payment for proof endpoint
  );

  // Verify chain integrity and signature if available
  if (data.signature && data.chain_root_hash && data.agent_public_key && data.logs.length > 0) {
    try {
      const verification = await verifyCompleteChain(
        data.logs as VerifiedLog[],
        data.chain_root_hash,
        data.signature,
        data.agent_public_key
      );

      if (!verification.valid) {
        console.error('[CHAIN] Chain verification failed:', verification.errors);
        // For proof requests, we should reject corrupted chains
        throw new Error(`Chain verification failed: ${verification.errors.join('; ')}`);
      } else {
        (data as any).chainValid = true;
        if (verification.warnings && verification.warnings.length > 0) {
          (data as any).verificationWarnings = verification.warnings;
        }
      }
    } catch (error) {
      console.error('[CHAIN] Error during verification:', error);
      // Re-throw verification errors for proof requests
      throw error;
    }
  } else {
    // No signature data - mark as unverified
    (data as any).chainValid = null;
  }

  return data;
}

