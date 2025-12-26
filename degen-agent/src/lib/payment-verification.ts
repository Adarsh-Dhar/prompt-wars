/**
 * Mocked Payment verification service for local development and testing.
 * Replaces real Solana RPC calls with deterministic mocks from blockchain-mocks/solana.
 */

import { sendSolanaTransaction, confirmSolanaTransaction } from '../../../blockchain-mocks/solana';
import { ThoughtPart } from '../types';

export interface PaymentVerificationRequest {
  transactionSignature: string;
  expectedAmount: number;
  expectedRecipient: string;
  contentId: string;
  senderAddress: string;
}

export interface ChainOfThoughtAccessRequest {
  transactionSignature: string;
  analysisId: string;
  senderAddress: string;
  contentType: 'chain-of-thought' | 'premium-analysis' | 'full-access';
}

export interface AccessControlResult {
  hasAccess: boolean;
  accessLevel: 'public' | 'premium' | 'full';
  error?: string;
  paymentDetails?: PaymentVerificationResult;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  amount?: number;
  sender?: string;
  recipient?: string;
  timestamp?: Date;
  error?: string;
}

export interface SolanaConfig {
  rpcEndpoint: string;
  usdcMintAddress: string;
  confirmationLevel: 'processed' | 'confirmed' | 'finalized';
}

export const DEFAULT_SOLANA_CONFIG: SolanaConfig = {
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  confirmationLevel: 'confirmed'
};

/**
 * PaymentVerificationService
 * - verifyPayment(transactionSignature) => boolean
 * - verifyPaymentDetailed(request) => PaymentVerificationResult
 * - verifyChainOfThoughtAccess(request) => AccessControlResult
 * The implementation uses deterministic mock behavior to avoid network calls.
 */
export class PaymentVerificationService {
  private config: SolanaConfig;

  constructor(config: Partial<SolanaConfig> = {}) {
    this.config = { ...DEFAULT_SOLANA_CONFIG, ...config };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<boolean> {
    const result = await this.verifyPaymentDetailed(request);
    return result.isValid;
  }

  async verifyPaymentDetailed(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    try {
      if (!request || typeof request.transactionSignature !== 'string') {
        return { isValid: false, error: 'Invalid request' };
      }

      // Use mock confirmation to determine validity
      const confirmed = await confirmSolanaTransaction(request.transactionSignature);
      if (!confirmed.confirmed) {
        return { isValid: false, error: 'Transaction not found or not confirmed (mock)' };
      }

      // In mock mode, assume payment amount equals expectedAmount and recipient matches server wallet
      return {
        isValid: true,
        amount: request.expectedAmount,
        sender: request.senderAddress,
        recipient: request.expectedRecipient,
        timestamp: new Date()
      };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async verifyChainOfThoughtAccess(request: ChainOfThoughtAccessRequest): Promise<AccessControlResult> {
    try {
      const pricingTiers = {
        'chain-of-thought': 0.5,
        'premium-analysis': 0.3,
        'full-access': 1.0
      } as Record<string, number>;

      const requiredAmount = pricingTiers[request.contentType];

      const paymentRequest: PaymentVerificationRequest = {
        transactionSignature: request.transactionSignature,
        expectedAmount: requiredAmount,
        expectedRecipient: process.env.SERVER_WALLET || 'DEFAULT_WALLET_ADDRESS',
        contentId: request.analysisId,
        senderAddress: request.senderAddress
      };

      const paymentResult = await this.verifyPaymentDetailed(paymentRequest);

      if (!paymentResult.isValid) {
        return {
          hasAccess: false,
          accessLevel: 'public',
          error: paymentResult.error,
          paymentDetails: paymentResult
        };
      }

      let accessLevel: 'public' | 'premium' | 'full' = 'public';
      if ((paymentResult.amount || 0) >= pricingTiers['full-access']) accessLevel = 'full';
      else if ((paymentResult.amount || 0) >= pricingTiers['chain-of-thought']) accessLevel = 'premium';

      return {
        hasAccess: true,
        accessLevel,
        paymentDetails: paymentResult
      };

    } catch (error) {
      return { hasAccess: false, accessLevel: 'public', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Backwards-compatible helpers used by other modules
  async getTransactionStatus(signature: string): Promise<'confirmed' | 'finalized' | 'not_found' | 'failed'> {
    try {
      const result = await confirmSolanaTransaction(signature);
      return result.confirmed ? 'confirmed' : 'not_found';
    } catch {
      return 'not_found';
    }
  }

  async estimateTransactionFee(): Promise<number> {
    return 0.000005; // Mock fee estimate
  }

}