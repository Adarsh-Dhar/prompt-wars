/**
 * Property-based tests for Flash Thinking payment verification and security
 */

import * as fc from 'fast-check';
import { PaymentVerificationService, ChainOfThoughtAccessRequest, AccessControlResult } from '../lib/payment-verification';

// Mock Solana web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getParsedTransaction: jest.fn(),
    getSignatureStatus: jest.fn(),
    getLatestBlockhash: jest.fn()
  })),
  PublicKey: jest.fn().mockImplementation((key) => {
    if (typeof key !== 'string' || key.length < 32) {
      throw new Error('Invalid public key');
    }
    return { toBase58: () => key };
  })
}));

describe('Payment Verification Flash Thinking Property Tests', () => {
  let paymentService: PaymentVerificationService;
  let mockConnection: any;

  beforeEach(() => {
    // Set up environment variables
    process.env.SERVER_WALLET = 'TestWalletAddress123456789012345678901234567890';
    
    const { Connection } = require('@solana/web3.js');
    mockConnection = {
      getParsedTransaction: jest.fn(),
      getSignatureStatus: jest.fn(),
      getLatestBlockhash: jest.fn()
    };
    
    Connection.mockImplementation(() => mockConnection);
    
    paymentService = new PaymentVerificationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 6: Payment verification security**
   * For any request for premium content without valid payment, the system should return HTTP 402 
   * with teaser content and never expose Chain_Of_Thought data in error responses
   */
  test('Property 6: Payment verification security', async () => {
    await fc.assert(fc.asyncProperty(
      // Generator for access requests
      fc.record({
        transactionSignature: fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)),
        analysisId: fc.string({ minLength: 1, maxLength: 50 }),
        senderAddress: fc.string({ minLength: 32, maxLength: 44 }),
        contentType: fc.constantFrom('chain-of-thought', 'premium-analysis', 'full-access')
      }),
      fc.boolean(), // whether payment is valid
      fc.option(fc.float({ min: Math.fround(0), max: Math.fround(2) })), // payment amount
      async (accessRequest, isValidPayment, paymentAmount) => {
        // Mock transaction response based on payment validity
        if (isValidPayment && paymentAmount !== null && paymentAmount >= 0.3) {
          mockConnection.getParsedTransaction.mockResolvedValue({
            meta: {
              err: null,
              preTokenBalances: [{
                accountIndex: 0,
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                owner: accessRequest.senderAddress,
                uiTokenAmount: { uiAmount: paymentAmount + 1 }
              }],
              postTokenBalances: [{
                accountIndex: 0,
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                owner: accessRequest.senderAddress,
                uiTokenAmount: { uiAmount: 1 }
              }, {
                accountIndex: 1,
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                owner: process.env.SERVER_WALLET,
                uiTokenAmount: { uiAmount: paymentAmount }
              }]
            },
            blockTime: Math.floor(Date.now() / 1000)
          });
        } else {
          // Invalid payment scenarios
          mockConnection.getParsedTransaction.mockResolvedValue(null);
        }

        const result = await paymentService.verifyChainOfThoughtAccess(accessRequest);

        if (isValidPayment && paymentAmount !== null && paymentAmount >= 0.3) {
          // Valid payment should grant access
          expect(result.hasAccess).toBe(true);
          expect(result.accessLevel).not.toBe('public');
          expect(result.error).toBeUndefined();
          expect(result.paymentDetails).toBeDefined();
          expect(result.paymentDetails?.isValid).toBe(true);
        } else {
          // Invalid payment should deny access
          expect(result.hasAccess).toBe(false);
          expect(result.accessLevel).toBe('public');
          expect(result.error).toBeDefined();
          
          // Verify no sensitive data is exposed in error
          expect(result.error).not.toContain('chain-of-thought');
          expect(result.error).not.toContain('reasoning');
          expect(result.error).not.toContain('analysis');
        }

        // Verify payment required response structure
        const paymentResponse = paymentService.generatePaymentRequiredResponse(
          accessRequest.contentType, 
          accessRequest.analysisId
        );

        expect(paymentResponse).toHaveProperty('error', 'Payment Required');
        expect(paymentResponse).toHaveProperty('price');
        expect(paymentResponse).toHaveProperty('currency', 'USDC');
        expect(paymentResponse).toHaveProperty('recipient');
        expect(paymentResponse).toHaveProperty('teaser');
        
        // Verify teaser doesn't expose actual content
        expect(paymentResponse.teaser).not.toContain('LONG');
        expect(paymentResponse.teaser).not.toContain('SHORT');
        expect(paymentResponse.teaser).not.toContain('confidence');
      }
    ), { numRuns: 50 });
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 13: Payment-gated access**
   * For any request requiring payment verification, the payment_verification module should gate 
   * access to full Chain_Of_Thought data consistently
   */
  test('Property 13: Payment-gated access', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)), // signature
      fc.constantFrom('chain-of-thought', 'premium-analysis', 'full-access'), // contentType
      fc.string({ minLength: 1, maxLength: 50 }), // analysisId
      fc.string({ minLength: 32, maxLength: 44 }), // senderAddress
      fc.float({ min: Math.fround(0), max: Math.fround(2) }), // paymentAmount
      async (signature, contentType, analysisId, senderAddress, paymentAmount) => {
        // Mock successful transaction
        mockConnection.getParsedTransaction.mockResolvedValue({
          meta: {
            err: null,
            preTokenBalances: [{
              accountIndex: 0,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: senderAddress,
              uiTokenAmount: { uiAmount: paymentAmount + 1 }
            }],
            postTokenBalances: [{
              accountIndex: 0,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: senderAddress,
              uiTokenAmount: { uiAmount: 1 }
            }, {
              accountIndex: 1,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: process.env.SERVER_WALLET,
              uiTokenAmount: { uiAmount: paymentAmount }
            }]
          },
          blockTime: Math.floor(Date.now() / 1000)
        });

        const result = await paymentService.validateContentAccess(
          signature,
          contentType,
          analysisId,
          senderAddress
        );

        // Define expected pricing tiers
        const pricingTiers = {
          'chain-of-thought': 0.5,
          'premium-analysis': 0.3,
          'full-access': 1.0
        };

        const requiredAmount = pricingTiers[contentType];

        if (paymentAmount >= requiredAmount) {
          // Sufficient payment should grant access
          expect(result.hasAccess).toBe(true);
          expect(result.accessLevel).not.toBe('public');
          
          // Verify access level matches payment amount
          if (paymentAmount >= 1.0) {
            expect(result.accessLevel).toBe('full');
          } else if (paymentAmount >= 0.5) {
            expect(result.accessLevel).toBe('premium');
          }
        } else {
          // Insufficient payment should deny access
          expect(result.hasAccess).toBe(false);
          expect(result.accessLevel).toBe('public');
          expect(result.error).toBeDefined();
        }

        // Verify consistent gating behavior
        expect(typeof result.hasAccess).toBe('boolean');
        expect(['public', 'premium', 'full']).toContain(result.accessLevel);
      }
    ), { numRuns: 50 });
  });

  /**
   * Test transaction reuse prevention
   */
  test('Transaction reuse prevention', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)), // signature
      fc.string({ minLength: 1, maxLength: 50 }), // analysisId
      fc.string({ minLength: 32, maxLength: 44 }), // senderAddress
      async (signature, analysisId, senderAddress) => {
        // Mock successful transaction
        mockConnection.getParsedTransaction.mockResolvedValue({
          meta: {
            err: null,
            preTokenBalances: [{
              accountIndex: 0,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: senderAddress,
              uiTokenAmount: { uiAmount: 2 }
            }],
            postTokenBalances: [{
              accountIndex: 0,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: senderAddress,
              uiTokenAmount: { uiAmount: 1 }
            }, {
              accountIndex: 1,
              mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              owner: process.env.SERVER_WALLET,
              uiTokenAmount: { uiAmount: 1 }
            }]
          },
          blockTime: Math.floor(Date.now() / 1000)
        });

        // First use should succeed
        const firstResult = await paymentService.validateContentAccess(
          signature,
          'full-access',
          analysisId,
          senderAddress
        );

        expect(firstResult.hasAccess).toBe(true);

        // Second use of same signature should fail
        const secondResult = await paymentService.validateContentAccess(
          signature,
          'full-access',
          analysisId,
          senderAddress
        );

        expect(secondResult.hasAccess).toBe(false);
        expect(secondResult.error).toContain('already been used');
      }
    ), { numRuns: 30 });
  });

  /**
   * Test payment required response generation
   */
  test('Payment required response structure', async () => {
    await fc.assert(fc.property(
      fc.constantFrom('chain-of-thought', 'premium-analysis', 'full-access'), // contentType
      fc.option(fc.string({ minLength: 1, maxLength: 50 })), // analysisId
      (contentType, analysisId) => {
        const response = paymentService.generatePaymentRequiredResponse(contentType, analysisId);

        // Verify required fields
        expect(response).toHaveProperty('error', 'Payment Required');
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('price');
        expect(response).toHaveProperty('currency', 'USDC');
        expect(response).toHaveProperty('recipient');
        expect(response).toHaveProperty('memo');
        expect(response).toHaveProperty('instructions');
        expect(response).toHaveProperty('teaser');

        // Verify pricing consistency
        const expectedPrices = {
          'chain-of-thought': 0.5,
          'premium-analysis': 0.3,
          'full-access': 1.0
        };
        expect(response.price).toBe(expectedPrices[contentType]);

        // Verify instructions structure
        expect(response.instructions).toHaveProperty('step1');
        expect(response.instructions).toHaveProperty('step2');
        expect(response.instructions).toHaveProperty('step3');

        // Verify memo includes content type
        expect(response.memo).toContain(contentType);
        if (analysisId) {
          expect(response.memo).toContain(analysisId);
        }

        // Verify teaser is appropriate
        expect(typeof response.teaser).toBe('string');
        expect(response.teaser.length).toBeGreaterThan(10);
      }
    ), { numRuns: 30 });
  });

  /**
   * Test access logging functionality
   */
  test('Access attempt logging', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        transactionSignature: fc.string({ minLength: 64, maxLength: 88 }),
        analysisId: fc.string({ minLength: 1, maxLength: 50 }),
        senderAddress: fc.string({ minLength: 32, maxLength: 44 }),
        contentType: fc.constantFrom('chain-of-thought', 'premium-analysis', 'full-access')
      }),
      fc.record({
        hasAccess: fc.boolean(),
        accessLevel: fc.constantFrom('public', 'premium', 'full'),
        error: fc.option(fc.string())
      }),
      fc.option(fc.string()), // userAgent
      fc.option(fc.string()), // ipAddress
      async (request, result, userAgent, ipAddress) => {
        // Mock console.log to capture log output
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await paymentService.logAccessAttempt(request, result, userAgent, ipAddress);

        // Verify logging occurred
        expect(consoleSpy).toHaveBeenCalledWith(
          'Chain-of-Thought Access Attempt:',
          expect.stringContaining(request.analysisId)
        );

        // Parse logged data
        const logCall = consoleSpy.mock.calls[0];
        const logData = JSON.parse(logCall[1]);

        // Verify log structure
        expect(logData).toHaveProperty('timestamp');
        expect(logData).toHaveProperty('analysisId', request.analysisId);
        expect(logData).toHaveProperty('contentType', request.contentType);
        expect(logData).toHaveProperty('senderAddress', request.senderAddress);
        expect(logData).toHaveProperty('accessGranted', result.hasAccess);
        expect(logData).toHaveProperty('accessLevel', result.accessLevel);

        consoleSpy.mockRestore();
      }
    ), { numRuns: 20 });
  });
});