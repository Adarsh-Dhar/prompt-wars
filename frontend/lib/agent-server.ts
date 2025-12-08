// Agent Server API utilities
// Handles communication with the agent server and payment token management

const AGENT_SERVER_URL = 'http://localhost:4000';
const PAYMENT_TOKEN_KEY = 'agent-server-payment-token';

export const PEEK_PRICE = 0.05; // SOL
export const GOD_MODE_PRICE = 1.0; // SOL

export interface AgentLog {
  id: number | string;
  timestamp: string;
  message: string;
  type: string;
  details?: any;
}

export interface AgentLogsResponse {
  status: string;
  logs: AgentLog[];
  lastUpdate: number;
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
 * Fetch agent logs from the agent server
 * @param paymentToken Optional payment token for premium access
 */
export async function fetchAgentLogs(paymentToken?: string | null): Promise<AgentLogsResponse> {
  const token = paymentToken || getPaymentToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['x-payment-token'] = token;
  }

  const response = await fetch(`${AGENT_SERVER_URL}/api/stream`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 402) {
      throw new Error(errorData.error || 'Payment required');
    }
    throw new Error(errorData.error || `Failed to fetch logs: ${response.statusText}`);
  }

  return response.json();
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

