/**
 * Content encryption/decryption system for Chain of Thought protection
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ThoughtPart } from '../types';

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

  /**
   * Encrypt Flash Thinking chain-of-thought parts
   */
  encryptThoughtParts(
    thoughtParts: ThoughtPart[],
    transactionSignature: string
  ): EncryptedContent {
    const serializedThoughts = JSON.stringify(thoughtParts);
    return this.encrypt(serializedThoughts, transactionSignature);
  }

  /**
   * Decrypt Flash Thinking chain-of-thought parts
   */
  decryptThoughtParts(
    encryptedThoughts: EncryptedContent,
    transactionSignature: string
  ): ThoughtPart[] {
    const decryptedData = this.decrypt(encryptedThoughts, transactionSignature);
    try {
      const thoughtParts = JSON.parse(decryptedData);
      
      // Validate the structure
      if (!Array.isArray(thoughtParts)) {
        throw new Error('Decrypted data is not an array');
      }

      // Validate each thought part
      thoughtParts.forEach((part, index) => {
        if (!this.isValidThoughtPart(part)) {
          throw new Error(`Invalid thought part at index ${index}`);
        }
      });

      return thoughtParts;
    } catch (error) {
      throw new Error(`Failed to parse decrypted thought parts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create blurred chain-of-thought preview for non-premium users
   */
  static createThoughtPartsPreview(thoughtParts: ThoughtPart[], visibleCount: number = 2): string {
    if (thoughtParts.length === 0) {
      return '🔒 [Premium chain-of-thought analysis available - Pay 0.5 USDC to unlock]';
    }

    const visibleThoughts = thoughtParts.slice(0, visibleCount);
    const hiddenCount = Math.max(0, thoughtParts.length - visibleCount);

    let preview = '💭 **Thinking Process Preview:**\n\n';
    
    visibleThoughts.forEach((thought, index) => {
      const blurredText = this.createBlurredContent(thought.text, 0.3);
      preview += `${index + 1}. ${blurredText}\n\n`;
    });

    if (hiddenCount > 0) {
      preview += `... and ${hiddenCount} more reasoning step${hiddenCount > 1 ? 's' : ''}\n\n`;
    }

    preview += '🔒 [Pay 0.5 USDC to unlock complete chain-of-thought analysis]';
    
    return preview;
  }

  /**
   * Generate teaser summary from chain-of-thought for public users
   */
  static generateThoughtSummary(thoughtParts: ThoughtPart[]): string {
    if (thoughtParts.length === 0) {
      return 'Advanced reasoning analysis available for premium users.';
    }

    const totalSteps = thoughtParts.length;
    const avgLength = thoughtParts.reduce((sum, part) => sum + part.text.length, 0) / totalSteps;
    
    // Extract key themes from first few thoughts (without revealing content)
    const themes = ['market analysis', 'risk assessment', 'technical indicators', 'sentiment analysis'];
    const selectedThemes = themes.slice(0, Math.min(3, totalSteps));

    return `🧠 **AI Reasoning Summary:** ${totalSteps} analytical steps covering ${selectedThemes.join(', ')} (avg. ${Math.round(avgLength)} chars per step). Unlock full reasoning chain for detailed insights.`;
  }

  /**
   * Validate ThoughtPart structure
   */
  private isValidThoughtPart(part: any): part is ThoughtPart {
    return (
      typeof part === 'object' &&
      typeof part.text === 'string' &&
      typeof part.thought === 'boolean' &&
      typeof part.order === 'number' &&
      typeof part.timestamp === 'number' &&
      (part.tokenCount === undefined || typeof part.tokenCount === 'number')
    );
  }

  /**
   * Encrypt complete analysis response including chain-of-thought
   */
  encryptAnalysisResponse(
    response: {
      finalAnswer: string;
      chainOfThought: ThoughtPart[];
      marketAnalysis?: string;
      riskAssessment?: string;
    },
    transactionSignature: string
  ): {
    finalAnswer: EncryptedContent;
    chainOfThought: EncryptedContent;
    marketAnalysis?: EncryptedContent;
    riskAssessment?: EncryptedContent;
  } {
    const result: any = {
      finalAnswer: this.encrypt(response.finalAnswer, transactionSignature),
      chainOfThought: this.encryptThoughtParts(response.chainOfThought, transactionSignature)
    };

    if (response.marketAnalysis) {
      result.marketAnalysis = this.encrypt(response.marketAnalysis, transactionSignature);
    }

    if (response.riskAssessment) {
      result.riskAssessment = this.encrypt(response.riskAssessment, transactionSignature);
    }

    return result;
  }

  /**
   * Decrypt complete analysis response including chain-of-thought
   */
  decryptAnalysisResponse(
    encryptedResponse: {
      finalAnswer: EncryptedContent;
      chainOfThought: EncryptedContent;
      marketAnalysis?: EncryptedContent;
      riskAssessment?: EncryptedContent;
    },
    transactionSignature: string
  ): {
    finalAnswer: string;
    chainOfThought: ThoughtPart[];
    marketAnalysis?: string;
    riskAssessment?: string;
  } {
    const result: any = {
      finalAnswer: this.decrypt(encryptedResponse.finalAnswer, transactionSignature),
      chainOfThought: this.decryptThoughtParts(encryptedResponse.chainOfThought, transactionSignature)
    };

    if (encryptedResponse.marketAnalysis) {
      result.marketAnalysis = this.decrypt(encryptedResponse.marketAnalysis, transactionSignature);
    }

    if (encryptedResponse.riskAssessment) {
      result.riskAssessment = this.decrypt(encryptedResponse.riskAssessment, transactionSignature);
    }

    return result;
  }
}