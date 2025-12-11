/**
 * Content encryption/decryption system for Chain of Thought protection
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptedContent {
  encryptedData: string;
  iv: string;
  keyHash: string;
  algorithm: string;
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: 'sha256' | 'pbkdf2';
  iterations?: number; // For PBKDF2
}

export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'sha256'
};

export class ContentEncryption {
  private config: EncryptionConfig;

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
  }

  /**
   * Encrypt content using a derived key from payment transaction
   */
  encrypt(content: string, transactionSignature: string): EncryptedContent {
    try {
      // Derive encryption key from transaction signature
      const key = this.deriveKey(transactionSignature);
      
      // Generate random IV
      const iv = randomBytes(16);
      
      // Create cipher
      const cipher = createCipheriv(this.config.algorithm, key, iv);
      
      // Encrypt content
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag for GCM mode
      const authTag = (cipher as any).getAuthTag?.() || Buffer.alloc(0);
      
      // Combine encrypted data and auth tag
      const encryptedData = encrypted + (authTag.length > 0 ? ':' + authTag.toString('hex') : '');
      
      return {
        encryptedData,
        iv: iv.toString('hex'),
        keyHash: this.hashKey(key),
        algorithm: this.config.algorithm
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt content using transaction signature
   */
  decrypt(encryptedContent: EncryptedContent, transactionSignature: string): string {
    try {
      // Derive the same key from transaction signature
      const key = this.deriveKey(transactionSignature);
      
      // Verify key matches
      if (this.hashKey(key) !== encryptedContent.keyHash) {
        throw new Error('Invalid decryption key');
      }
      
      // Parse encrypted data and auth tag
      const parts = encryptedContent.encryptedData.split(':');
      const encrypted = parts[0];
      const authTag = parts[1] ? Buffer.from(parts[1], 'hex') : null;
      
      // Create decipher
      const decipher = createDecipheriv(
        encryptedContent.algorithm,
        key,
        Buffer.from(encryptedContent.iv, 'hex')
      );
      
      // Set auth tag for GCM mode
      if (authTag && (decipher as any).setAuthTag) {
        (decipher as any).setAuthTag(authTag);
      }
      
      // Decrypt content
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Derive encryption key from transaction signature
   */
  private deriveKey(transactionSignature: string): Buffer {
    switch (this.config.keyDerivation) {
      case 'sha256':
        return createHash('sha256').update(transactionSignature).digest();
      
      case 'pbkdf2':
        const crypto = require('crypto');
        return crypto.pbkdf2Sync(
          transactionSignature,
          'rekto-rich-agent-salt', // Static salt for consistency
          this.config.iterations || 10000,
          32, // 256 bits
          'sha256'
        );
      
      default:
        throw new Error(`Unsupported key derivation: ${this.config.keyDerivation}`);
    }
  }

  /**
   * Hash key for verification
   */
  private hashKey(key: Buffer): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Encrypt Chain of Thought content
   */
  encryptChainOfThought(
    chainOfThought: {
      reasoning: string;
      marketAnalysis: string;
      riskAssessment: string;
      degenCommentary: string;
    },
    transactionSignature: string
  ): {
    reasoning: EncryptedContent;
    marketAnalysis: EncryptedContent;
    riskAssessment: EncryptedContent;
    degenCommentary: EncryptedContent;
  } {
    return {
      reasoning: this.encrypt(chainOfThought.reasoning, transactionSignature),
      marketAnalysis: this.encrypt(chainOfThought.marketAnalysis, transactionSignature),
      riskAssessment: this.encrypt(chainOfThought.riskAssessment, transactionSignature),
      degenCommentary: this.encrypt(chainOfThought.degenCommentary, transactionSignature)
    };
  }

  /**
   * Decrypt Chain of Thought content
   */
  decryptChainOfThought(
    encryptedChainOfThought: {
      reasoning: EncryptedContent;
      marketAnalysis: EncryptedContent;
      riskAssessment: EncryptedContent;
      degenCommentary: EncryptedContent;
    },
    transactionSignature: string
  ): {
    reasoning: string;
    marketAnalysis: string;
    riskAssessment: string;
    degenCommentary: string;
  } {
    return {
      reasoning: this.decrypt(encryptedChainOfThought.reasoning, transactionSignature),
      marketAnalysis: this.decrypt(encryptedChainOfThought.marketAnalysis, transactionSignature),
      riskAssessment: this.decrypt(encryptedChainOfThought.riskAssessment, transactionSignature),
      degenCommentary: this.decrypt(encryptedChainOfThought.degenCommentary, transactionSignature)
    };
  }

  /**
   * Create a blurred/redacted version of content for display before payment
   */
  static createBlurredContent(content: string, visiblePercentage: number = 0.2): string {
    const words = content.split(' ');
    const visibleWords = Math.floor(words.length * visiblePercentage);
    
    const blurred = words.map((word, index) => {
      if (index < visibleWords) {
        return word;
      } else if (index < visibleWords + 3) {
        // Show partial words with asterisks
        return word.charAt(0) + '*'.repeat(Math.max(1, word.length - 1));
      } else {
        // Replace with asterisks
        return '*'.repeat(Math.max(3, word.length));
      }
    });

    return blurred.join(' ') + '\n\n🔒 [Content locked - Pay 0.5 USDC to unlock full analysis]';
  }

  /**
   * Validate encrypted content structure
   */
  static isValidEncryptedContent(content: any): content is EncryptedContent {
    return (
      typeof content === 'object' &&
      typeof content.encryptedData === 'string' &&
      typeof content.iv === 'string' &&
      typeof content.keyHash === 'string' &&
      typeof content.algorithm === 'string'
    );
  }

  /**
   * Generate content preview for payment gate
   */
  static generateContentPreview(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) {
      return content + '\n\n🔒 [Pay 0.5 USDC to unlock full content]';
    }
    
    return content.substring(0, maxLength) + '...\n\n🔒 [Pay 0.5 USDC to unlock full content]';
  }
}