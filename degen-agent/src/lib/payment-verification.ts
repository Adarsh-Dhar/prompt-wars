/**
 * Payment verification service that validates Solana transaction signatures
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

export interface PaymentVerificationRequest {
  transactionSignature: string;
  expectedAmount: number;
  expectedRecipient: string;
  contentId: string;
  senderAddress: string;
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
  usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint on mainnet
  confirmationLevel: 'confirmed'
};

export class PaymentVerificationService {
  private connection: Connection;
  private config: SolanaConfig;

  constructor(config: Partial<SolanaConfig> = {}) {
    this.config = { ...DEFAULT_SOLANA_CONFIG, ...config };
    this.connection = new Connection(this.config.rpcEndpoint, this.config.confirmationLevel);
  }

  /**
   * Verify a Solana transaction for payment validation
   */
  async verifyPayment(request: PaymentVerificationRequest): Promise<boolean> {
    try {
      const result = await this.verifyPaymentDetailed(request);
      return result.isValid;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  /**
   * Verify payment with detailed result information
   */
  async verifyPaymentDetailed(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    try {
      // Validate input parameters
      if (!this.isValidTransactionSignature(request.transactionSignature)) {
        return {
          isValid: false,
          error: 'Invalid transaction signature format'
        };
      }

      if (!this.isValidSolanaAddress(request.expectedRecipient)) {
        return {
          isValid: false,
          error: 'Invalid recipient address format'
        };
      }

      if (!this.isValidSolanaAddress(request.senderAddress)) {
        return {
          isValid: false,
          error: 'Invalid sender address format'
        };
      }

      // Fetch transaction from Solana blockchain
      const transaction = await this.connection.getParsedTransaction(
        request.transactionSignature,
        {
          commitment: this.config.confirmationLevel,
          maxSupportedTransactionVersion: 0
        }
      );

      if (!transaction) {
        return {
          isValid: false,
          error: 'Transaction not found on blockchain'
        };
      }

      if (transaction.meta?.err) {
        return {
          isValid: false,
          error: 'Transaction failed on blockchain'
        };
      }

      // Analyze transaction for USDC transfer
      const transferInfo = this.analyzeUSDCTransfer(transaction, request);
      
      if (!transferInfo.isValid) {
        return transferInfo;
      }

      // Verify amount matches requirement (with small tolerance for fees)
      const tolerance = 0.001; // 0.1% tolerance
      const amountValid = transferInfo.amount! >= (request.expectedAmount - tolerance);
      
      if (!amountValid) {
        return {
          isValid: false,
          error: `Insufficient payment amount. Expected: ${request.expectedAmount} USDC, Received: ${transferInfo.amount} USDC`
        };
      }

      // All checks passed
      return {
        isValid: true,
        amount: transferInfo.amount,
        sender: transferInfo.sender,
        recipient: transferInfo.recipient,
        timestamp: new Date(transaction.blockTime! * 1000)
      };

    } catch (error) {
      console.error('Detailed payment verification error:', error);
      return {
        isValid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze transaction for USDC transfer details
   */
  private analyzeUSDCTransfer(
    transaction: ParsedTransactionWithMeta,
    request: PaymentVerificationRequest
  ): PaymentVerificationResult {
    
    if (!transaction.meta?.postTokenBalances || !transaction.meta?.preTokenBalances) {
      return {
        isValid: false,
        error: 'Transaction does not contain token balance information'
      };
    }

    // Find USDC token transfers
    const usdcTransfers = this.findUSDCTransfers(transaction);
    
    if (usdcTransfers.length === 0) {
      return {
        isValid: false,
        error: 'No USDC transfers found in transaction'
      };
    }

    // Find transfer matching our criteria
    const matchingTransfer = usdcTransfers.find(transfer => 
      transfer.recipient === request.expectedRecipient &&
      transfer.sender === request.senderAddress
    );

    if (!matchingTransfer) {
      return {
        isValid: false,
        error: 'No matching USDC transfer found for specified sender/recipient'
      };
    }

    return {
      isValid: true,
      amount: matchingTransfer.amount,
      sender: matchingTransfer.sender,
      recipient: matchingTransfer.recipient
    };
  }

  /**
   * Extract USDC transfers from transaction
   */
  private findUSDCTransfers(transaction: ParsedTransactionWithMeta) {
    const transfers: Array<{
      sender: string;
      recipient: string;
      amount: number;
    }> = [];

    const preBalances = transaction.meta!.preTokenBalances || [];
    const postBalances = transaction.meta!.postTokenBalances || [];

    // Group balances by account and mint
    const balanceChanges = new Map<string, { pre: number; post: number; owner: string }>();

    // Process pre-balances
    preBalances.forEach(balance => {
      if (balance.mint === this.config.usdcMintAddress) {
        const key = balance.accountIndex.toString();
        balanceChanges.set(key, {
          pre: balance.uiTokenAmount.uiAmount || 0,
          post: 0,
          owner: balance.owner || ''
        });
      }
    });

    // Process post-balances
    postBalances.forEach(balance => {
      if (balance.mint === this.config.usdcMintAddress) {
        const key = balance.accountIndex.toString();
        const existing = balanceChanges.get(key);
        if (existing) {
          existing.post = balance.uiTokenAmount.uiAmount || 0;
        } else {
          balanceChanges.set(key, {
            pre: 0,
            post: balance.uiTokenAmount.uiAmount || 0,
            owner: balance.owner || ''
          });
        }
      }
    });

    // Calculate transfers
    const accounts = Array.from(balanceChanges.entries());
    
    for (const [, senderBalance] of accounts) {
      if (senderBalance.post < senderBalance.pre) {
        const sentAmount = senderBalance.pre - senderBalance.post;
        
        // Find corresponding recipient
        for (const [, recipientBalance] of accounts) {
          if (recipientBalance.post > recipientBalance.pre) {
            const receivedAmount = recipientBalance.post - recipientBalance.pre;
            
            // Match amounts (with small tolerance for rounding)
            if (Math.abs(sentAmount - receivedAmount) < 0.000001) {
              transfers.push({
                sender: senderBalance.owner,
                recipient: recipientBalance.owner,
                amount: receivedAmount
              });
            }
          }
        }
      }
    }

    return transfers;
  }

  /**
   * Validate transaction signature format
   */
  private isValidTransactionSignature(signature: string): boolean {
    // Solana transaction signatures are base58 encoded and typically 64-88 characters
    return /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature);
  }

  /**
   * Validate Solana address format
   */
  private isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<'confirmed' | 'finalized' | 'not_found' | 'failed'> {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      
      if (!status.value) {
        return 'not_found';
      }

      if (status.value.err) {
        return 'failed';
      }

      if (status.value.confirmationStatus === 'finalized') {
        return 'finalized';
      }

      return 'confirmed';
    } catch {
      return 'not_found';
    }
  }

  /**
   * Estimate transaction fee for payment
   */
  async estimateTransactionFee(): Promise<number> {
    try {
      const recentBlockhash = await this.connection.getLatestBlockhash();
      // Typical USDC transfer fee is around 0.000005 SOL
      return 0.000005;
    } catch {
      return 0.000005; // Default estimate
    }
  }
}