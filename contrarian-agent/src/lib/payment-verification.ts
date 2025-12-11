/**
 * Payment verification service for Contrarian Agent
 * Integrates with existing x402 payment infrastructure
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

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

export interface EncryptedContent {
  encryptedData: string;
  iv: string;
  keyHash: string;
  algorithm: string;
}

export interface PaymentLog {
  transactionSignature: string;
  contentId: string;
  amount: number;
  sender: string;
  recipient: string;
  timestamp: Date;
  verified: boolean;
}

export class ContrarianPaymentService {
  private connection: Connection;
  private paymentLogs: Map<string, PaymentLog> = new Map();
  private readonly usdcMintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  private readonly requiredAmount: number;
  private readonly recipientAddress: string;

  constructor(
    rpcEndpoint: string = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
    requiredAmount: number = 0.001, // 0.001 SOL for contrarian rants
    recipientAddress: string = process.env.SERVER_WALLET || ''
  ) {
    this.connection = new Connection(rpcEndpoint, 'confirmed');
    this.requiredAmount = requiredAmount;
    this.recipientAddress = recipientAddress;
  }

  /**
   * Verify payment for accessing contrarian reasoning
   */
  async verifyPayment(request: PaymentVerificationRequest): Promise<boolean> {
    try {
      const result = await this.verifyPaymentDetailed(request);
      
      if (result.isValid) {
        // Log successful payment
        this.logPayment({
          transactionSignature: request.transactionSignature,
          contentId: request.contentId,
          amount: result.amount!,
          sender: result.sender!,
          recipient: result.recipient!,
          timestamp: result.timestamp!,
          verified: true
        });
      }
      
      return result.isValid;
    } catch (error) {
      console.error('Contrarian payment verification error:', error);
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

      // Check if payment already verified (prevent double spending)
      if (this.paymentLogs.has(request.transactionSignature)) {
        const existingLog = this.paymentLogs.get(request.transactionSignature)!;
        if (existingLog.contentId === request.contentId) {
          return {
            isValid: true,
            amount: existingLog.amount,
            sender: existingLog.sender,
            recipient: existingLog.recipient,
            timestamp: existingLog.timestamp
          };
        } else {
          return {
            isValid: false,
            error: 'Transaction already used for different content'
          };
        }
      }

      // Fetch transaction from Solana blockchain
      const transaction = await this.connection.getParsedTransaction(
        request.transactionSignature,
        {
          commitment: 'confirmed',
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

      // Analyze transaction for SOL transfer (simplified for contrarian agent)
      const transferInfo = this.analyzeSOLTransfer(transaction, request);
      
      if (!transferInfo.isValid) {
        return transferInfo;
      }

      // Verify amount matches requirement
      const tolerance = 0.0001; // Small tolerance for fees
      const amountValid = transferInfo.amount! >= (request.expectedAmount - tolerance);
      
      if (!amountValid) {
        return {
          isValid: false,
          error: `Insufficient payment amount. Expected: ${request.expectedAmount} SOL, Received: ${transferInfo.amount} SOL`
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
   * Analyze transaction for SOL transfer details
   */
  private analyzeSOLTransfer(
    transaction: ParsedTransactionWithMeta,
    request: PaymentVerificationRequest
  ): PaymentVerificationResult {
    
    if (!transaction.meta?.preBalances || !transaction.meta?.postBalances) {
      return {
        isValid: false,
        error: 'Transaction does not contain balance information'
      };
    }

    const accountKeys = transaction.transaction.message.accountKeys;
    
    // Find sender and recipient account indices
    let senderIndex = -1;
    let recipientIndex = -1;
    
    for (let i = 0; i < accountKeys.length; i++) {
      const pubkey = accountKeys[i].pubkey.toString();
      if (pubkey === request.senderAddress) {
        senderIndex = i;
      }
      if (pubkey === request.expectedRecipient) {
        recipientIndex = i;
      }
    }

    if (senderIndex === -1) {
      return {
        isValid: false,
        error: 'Sender address not found in transaction'
      };
    }

    if (recipientIndex === -1) {
      return {
        isValid: false,
        error: 'Recipient address not found in transaction'
      };
    }

    // Calculate balance changes
    const senderPreBalance = transaction.meta.preBalances[senderIndex] / 1e9; // Convert lamports to SOL
    const senderPostBalance = transaction.meta.postBalances[senderIndex] / 1e9;
    const recipientPreBalance = transaction.meta.preBalances[recipientIndex] / 1e9;
    const recipientPostBalance = transaction.meta.postBalances[recipientIndex] / 1e9;

    const senderChange = senderPostBalance - senderPreBalance;
    const recipientChange = recipientPostBalance - recipientPreBalance;

    // Sender should have decreased balance, recipient should have increased
    if (senderChange >= 0) {
      return {
        isValid: false,
        error: 'No SOL transfer detected from sender'
      };
    }

    if (recipientChange <= 0) {
      return {
        isValid: false,
        error: 'No SOL transfer detected to recipient'
      };
    }

    // The amount transferred is the recipient's increase (minus any fees)
    const transferAmount = recipientChange;

    return {
      isValid: true,
      amount: transferAmount,
      sender: request.senderAddress,
      recipient: request.expectedRecipient
    };
  }

  /**
   * Encrypt contrarian reasoning content
   */
  encryptContent(content: string, transactionSignature: string): EncryptedContent {
    try {
      // Derive encryption key from transaction signature
      const key = this.deriveKey(transactionSignature);
      
      // Generate random IV
      const iv = randomBytes(16);
      
      // Create cipher
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      
      // Encrypt content
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag for GCM mode
      const authTag = (cipher as any).getAuthTag();
      
      // Combine encrypted data and auth tag
      const encryptedData = encrypted + ':' + authTag.toString('hex');
      
      return {
        encryptedData,
        iv: iv.toString('hex'),
        keyHash: this.hashKey(key),
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt contrarian reasoning content
   */
  decryptContent(encryptedContent: EncryptedContent, transactionSignature: string): string {
    try {
      // Derive the same key from transaction signature
      const key = this.deriveKey(transactionSignature);
      
      // Verify key matches
      if (this.hashKey(key) !== encryptedContent.keyHash) {
        throw new Error('Invalid decryption key - payment verification failed');
      }
      
      // Parse encrypted data and auth tag
      const parts = encryptedContent.encryptedData.split(':');
      const encrypted = parts[0];
      const authTag = Buffer.from(parts[1], 'hex');
      
      // Create decipher
      const decipher = createDecipheriv(
        encryptedContent.algorithm,
        key,
        Buffer.from(encryptedContent.iv, 'hex')
      );
      
      // Set auth tag for GCM mode
      (decipher as any).setAuthTag(authTag);
      
      // Decrypt content
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid payment'}`);
    }
  }

  /**
   * Log payment transaction for audit purposes
   */
  private logPayment(log: PaymentLog): void {
    this.paymentLogs.set(log.transactionSignature, log);
    
    // Also log to console for audit trail
    console.log('Contrarian Agent Payment Verified:', {
      signature: log.transactionSignature,
      contentId: log.contentId,
      amount: log.amount,
      sender: log.sender,
      timestamp: log.timestamp.toISOString()
    });
  }

  /**
   * Get payment logs for audit purposes
   */
  getPaymentLogs(): PaymentLog[] {
    return Array.from(this.paymentLogs.values());
  }

  /**
   * Get payment log for specific transaction
   */
  getPaymentLog(transactionSignature: string): PaymentLog | undefined {
    return this.paymentLogs.get(transactionSignature);
  }

  /**
   * Create blurred preview of content before payment
   */
  createContentPreview(content: string, visiblePercentage: number = 0.15): string {
    const lines = content.split('\n');
    const visibleLines = Math.floor(lines.length * visiblePercentage);
    
    const preview = lines.slice(0, visibleLines).join('\n');
    const hiddenLines = lines.length - visibleLines;
    
    return preview + 
           `\n\n🔒 [${hiddenLines} more lines of contrarian alpha locked]` +
           `\n💰 Pay ${this.requiredAmount} SOL to unlock the full smug rant` +
           `\n🎯 Recipient: ${this.recipientAddress}` +
           `\n\n"While the sheep panic, smart money accumulates..." - Contrarian Agent`;
  }

  /**
   * Derive encryption key from transaction signature
   */
  private deriveKey(transactionSignature: string): Buffer {
    return createHash('sha256')
      .update(transactionSignature + 'contrarian-agent-salt')
      .digest();
  }

  /**
   * Hash key for verification
   */
  private hashKey(key: Buffer): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Validate transaction signature format
   */
  private isValidTransactionSignature(signature: string): boolean {
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
   * Get required payment amount
   */
  getRequiredAmount(): number {
    return this.requiredAmount;
  }

  /**
   * Get recipient address
   */
  getRecipientAddress(): string {
    return this.recipientAddress;
  }

  /**
   * Check if transaction has been used before
   */
  isTransactionUsed(transactionSignature: string): boolean {
    return this.paymentLogs.has(transactionSignature);
  }

  /**
   * Clear old payment logs (for memory management)
   */
  clearOldLogs(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [signature, log] of this.paymentLogs.entries()) {
      if (log.timestamp < cutoffTime) {
        this.paymentLogs.delete(signature);
      }
    }
  }
}