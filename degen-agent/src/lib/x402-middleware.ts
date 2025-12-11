/**
 * HTTP 402 Payment Required middleware for API routes
 * Returns HTTP 402 for unauthorized access to protected content
 */

import { NextRequest, NextResponse } from 'next/server';
import { PaymentVerificationService } from './payment-verification';

export interface X402Config {
  requiredAmount: number; // USDC amount required
  recipientAddress: string; // Solana wallet address to receive payments
  contentEncryption: boolean; // Whether to encrypt content
}

export const DEFAULT_X402_CONFIG: X402Config = {
  requiredAmount: 0.5, // 0.5 USDC
  recipientAddress: process.env.PAYMENT_RECIPIENT_ADDRESS || '',
  contentEncryption: true
};

export interface PaymentRequiredResponse {
  error: 'Payment Required';
  message: string;
  paymentDetails: {
    amount: number;
    currency: 'USDC';
    recipient: string;
    contentId: string;
  };
  instructions: string[];
}

export class X402Middleware {
  private paymentService: PaymentVerificationService;
  private config: X402Config;

  constructor(config: Partial<X402Config> = {}) {
    this.config = { ...DEFAULT_X402_CONFIG, ...config };
    this.paymentService = new PaymentVerificationService();
  }

  /**
   * Middleware function to protect API routes with HTTP 402
   */
  async protectRoute(
    request: NextRequest,
    contentId: string,
    handler: () => Promise<NextResponse> | NextResponse
  ): Promise<NextResponse> {
    
    // Check if payment verification is provided
    const authHeader = request.headers.get('authorization');
    const transactionSignature = request.headers.get('x-transaction-signature');
    const userWallet = request.headers.get('x-wallet-address');

    // If no payment info provided, return 402
    if (!transactionSignature || !userWallet) {
      return this.createPaymentRequiredResponse(contentId);
    }

    try {
      // Verify the payment
      const isValidPayment = await this.paymentService.verifyPayment({
        transactionSignature,
        expectedAmount: this.config.requiredAmount,
        expectedRecipient: this.config.recipientAddress,
        contentId,
        senderAddress: userWallet
      });

      if (!isValidPayment) {
        return this.createPaymentRequiredResponse(contentId, 'Invalid or insufficient payment');
      }

      // Payment verified, proceed with the handler
      return await handler();

    } catch (error) {
      console.error('Payment verification error:', error);
      return this.createPaymentRequiredResponse(contentId, 'Payment verification failed');
    }
  }

  /**
   * Create HTTP 402 Payment Required response
   */
  private createPaymentRequiredResponse(
    contentId: string, 
    customMessage?: string
  ): NextResponse {
    
    const response: PaymentRequiredResponse = {
      error: 'Payment Required',
      message: customMessage || 'Payment of 0.5 USDC required to access this content',
      paymentDetails: {
        amount: this.config.requiredAmount,
        currency: 'USDC',
        recipient: this.config.recipientAddress,
        contentId
      },
      instructions: [
        '1. Send 0.5 USDC to the recipient address',
        '2. Include the transaction signature in X-Transaction-Signature header',
        '3. Include your wallet address in X-Wallet-Address header',
        '4. Retry the request with payment proof'
      ]
    };

    return NextResponse.json(response, { 
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Solana realm="Payment Required"',
        'X-Payment-Amount': this.config.requiredAmount.toString(),
        'X-Payment-Currency': 'USDC',
        'X-Payment-Recipient': this.config.recipientAddress
      }
    });
  }

  /**
   * Middleware for Next.js API routes
   */
  static createApiMiddleware(config?: Partial<X402Config>) {
    const middleware = new X402Middleware(config);
    
    return (contentId: string) => {
      return async (
        request: NextRequest,
        handler: () => Promise<NextResponse> | NextResponse
      ) => {
        return middleware.protectRoute(request, contentId, handler);
      };
    };
  }

  /**
   * Check if request has valid payment headers
   */
  static hasPaymentHeaders(request: NextRequest): boolean {
    return !!(
      request.headers.get('x-transaction-signature') &&
      request.headers.get('x-wallet-address')
    );
  }

  /**
   * Extract payment info from request headers
   */
  static extractPaymentInfo(request: NextRequest) {
    return {
      transactionSignature: request.headers.get('x-transaction-signature'),
      walletAddress: request.headers.get('x-wallet-address'),
      authorization: request.headers.get('authorization')
    };
  }
}

/**
 * Utility function for protecting API routes
 */
export function requirePayment(contentId: string, config?: Partial<X402Config>) {
  const middleware = new X402Middleware(config);
  
  return async (
    request: NextRequest,
    handler: () => Promise<NextResponse> | NextResponse
  ) => {
    return middleware.protectRoute(request, contentId, handler);
  };
}

/**
 * Decorator for API route handlers
 */
export function withPaymentProtection(
  contentId: string,
  config?: Partial<X402Config>
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const middleware = new X402Middleware(config);

    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      return middleware.protectRoute(request, contentId, () => 
        method.apply(this, [request, ...args])
      );
    };

    return descriptor;
  };
}