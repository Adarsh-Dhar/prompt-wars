/**
 * Transaction amount validation for 0.5 USDC requirement
 */

import { PaymentVerificationService, PaymentVerificationRequest } from './payment-verification';

export interface TransactionValidationConfig {
  requiredAmount: number;
  currency: 'USDC' | 'SOL';
  tolerance: number; // Percentage tolerance for amount validation
  maxAge: number; // Maximum age of transaction in seconds
}

export const DEFAULT_VALIDATION_CONFIG: TransactionValidationConfig = {
  requiredAmount: 0.5,
  currency: 'USDC',
  tolerance: 0.1, // 0.1% tolerance
  maxAge: 3600 // 1 hour
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  transactionDetails?: {
    amount: number;
    sender: string;
    recipient: string;
    timestamp: Date;
    age: number; // seconds
  };
}

export class TransactionValidator {
  private paymentService: PaymentVerificationService;
  private config: TransactionValidationConfig;

  constructor(config: Partial<TransactionValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.paymentService = new PaymentVerificationService();
  }

  /**
   * Validate transaction meets all requirements
   */
  async validateTransaction(request: PaymentVerificationRequest): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      // Verify payment through payment service
      const paymentResult = await this.paymentService.verifyPaymentDetailed(request);
      
      if (!paymentResult.isValid) {
        result.errors.push(paymentResult.error || 'Payment verification failed');
        return result;
      }

      // Validate amount
      const amountValidation = this.validateAmount(paymentResult.amount!);
      if (!amountValidation.isValid) {
        result.errors.push(...amountValidation.errors);
      }
      if (amountValidation.warnings.length > 0) {
        result.warnings.push(...amountValidation.warnings);
      }

      // Validate transaction age
      if (paymentResult.timestamp) {
        const ageValidation = this.validateTransactionAge(paymentResult.timestamp);
        if (!ageValidation.isValid) {
          result.errors.push(...ageValidation.errors);
        }
        if (ageValidation.warnings.length > 0) {
          result.warnings.push(...ageValidation.warnings);
        }
      }

      // Validate addresses
      const addressValidation = this.validateAddresses(
        paymentResult.sender!,
        paymentResult.recipient!,
        request.senderAddress,
        request.expectedRecipient
      );
      if (!addressValidation.isValid) {
        result.errors.push(...addressValidation.errors);
      }

      // Set transaction details
      result.transactionDetails = {
        amount: paymentResult.amount!,
        sender: paymentResult.sender!,
        recipient: paymentResult.recipient!,
        timestamp: paymentResult.timestamp!,
        age: Math.floor((Date.now() - paymentResult.timestamp!.getTime()) / 1000)
      };

      // Overall validation result
      result.isValid = result.errors.length === 0;

      return result;

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validate transaction amount meets requirements
   */
  private validateAmount(actualAmount: number): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const tolerance = this.config.requiredAmount * (this.config.tolerance / 100);
    const minAmount = this.config.requiredAmount - tolerance;
    const maxAmount = this.config.requiredAmount + tolerance;

    if (actualAmount < minAmount) {
      errors.push(
        `Insufficient payment amount. Required: ${this.config.requiredAmount} ${this.config.currency}, ` +
        `Received: ${actualAmount} ${this.config.currency} (minimum: ${minAmount})`
      );
    } else if (actualAmount > this.config.requiredAmount * 2) {
      warnings.push(
        `Payment amount is significantly higher than required. ` +
        `Required: ${this.config.requiredAmount} ${this.config.currency}, ` +
        `Received: ${actualAmount} ${this.config.currency}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate transaction is not too old
   */
  private validateTransactionAge(timestamp: Date): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const age = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    
    if (age > this.config.maxAge) {
      errors.push(
        `Transaction is too old. Age: ${age} seconds, Maximum allowed: ${this.config.maxAge} seconds`
      );
    } else if (age > this.config.maxAge * 0.8) {
      warnings.push(
        `Transaction is getting old. Age: ${age} seconds, Maximum allowed: ${this.config.maxAge} seconds`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate sender and recipient addresses match expectations
   */
  private validateAddresses(
    actualSender: string,
    actualRecipient: string,
    expectedSender: string,
    expectedRecipient: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (actualSender !== expectedSender) {
      errors.push(
        `Sender address mismatch. Expected: ${expectedSender}, Actual: ${actualSender}`
      );
    }

    if (actualRecipient !== expectedRecipient) {
      errors.push(
        `Recipient address mismatch. Expected: ${expectedRecipient}, Actual: ${actualRecipient}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Quick validation for amount only
   */
  validateAmountOnly(amount: number): boolean {
    const tolerance = this.config.requiredAmount * (this.config.tolerance / 100);
    const minAmount = this.config.requiredAmount - tolerance;
    return amount >= minAmount;
  }

  /**
   * Get required payment details
   */
  getPaymentRequirements(): {
    amount: number;
    currency: string;
    tolerance: number;
    maxAge: number;
  } {
    return {
      amount: this.config.requiredAmount,
      currency: this.config.currency,
      tolerance: this.config.tolerance,
      maxAge: this.config.maxAge
    };
  }

  /**
   * Format validation errors for user display
   */
  static formatValidationErrors(result: ValidationResult): string {
    if (result.isValid) {
      return 'Transaction validation successful';
    }

    let message = 'Transaction validation failed:\n';
    
    if (result.errors.length > 0) {
      message += '\nErrors:\n';
      result.errors.forEach((error, index) => {
        message += `${index + 1}. ${error}\n`;
      });
    }

    if (result.warnings.length > 0) {
      message += '\nWarnings:\n';
      result.warnings.forEach((warning, index) => {
        message += `${index + 1}. ${warning}\n`;
      });
    }

    return message.trim();
  }

  /**
   * Create validation summary for logging
   */
  static createValidationSummary(result: ValidationResult): object {
    return {
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      transactionAge: result.transactionDetails?.age,
      amount: result.transactionDetails?.amount,
      timestamp: result.transactionDetails?.timestamp?.toISOString()
    };
  }
}