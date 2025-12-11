/**
 * Property test for HTTP 402 implementation
 * Feature: rekto-rich-agent, Property 11: HTTP 402 implementation correctness
 * Validates: Requirements 6.1, 6.4
 */

import * as fc from 'fast-check';
import { X402Middleware, PaymentRequiredResponse } from './lib/x402-middleware';
import { NextRequest, NextResponse } from 'next/server';

// Mock NextRequest for testing
class MockNextRequest {
  public headers: Map<string, string>;
  public url: string;
  public method: string;

  constructor(headers: Record<string, string> = {}, url: string = 'http://localhost/api/test') {
    this.headers = new Map(Object.entries(headers));
    this.url = url;
    this.method = 'GET';
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

// Mock payment verification service
class MockPaymentVerificationService {
  private shouldPass: boolean;

  constructor(shouldPass: boolean = false) {
    this.shouldPass = shouldPass;
  }

  async verifyPayment(): Promise<boolean> {
    return this.shouldPass;
  }
}

/**
 * Test HTTP 402 implementation correctness
 * Property 11: For any unauthorized request to protected content endpoints, 
 * the system should return HTTP 402 status codes and maintain access control
 */
async function testHTTP402Implementation(): Promise<boolean> {
  console.log('Testing HTTP 402 Implementation...');

  // Test 1: Unauthorized requests return 402
  console.log('Test 1: Unauthorized requests return 402...');
  
  const middleware = new X402Middleware({
    requiredAmount: 0.5,
    recipientAddress: 'TestRecipientAddress123456789012345678901234',
    contentEncryption: true
  });

  // Test with no headers (unauthorized)
  const unauthorizedRequest = new MockNextRequest() as any;
  const contentId = 'test-content-123';
  
  const mockHandler = async () => {
    return NextResponse.json({ content: 'Secret content' });
  };

  try {
    const response = await middleware.protectRoute(unauthorizedRequest, contentId, mockHandler);
    const responseData = await response.json();
    
    if (response.status !== 402) {
      console.log('❌ Expected 402 status, got:', response.status);
      return false;
    }
    
    if (responseData.error !== 'Payment Required') {
      console.log('❌ Expected "Payment Required" error, got:', responseData.error);
      return false;
    }
    
    console.log('✅ Unauthorized request correctly returns 402');
  } catch (error) {
    console.log('❌ Error testing unauthorized request:', error);
    return false;
  }

  // Test 2: Missing transaction signature returns 402
  console.log('Test 2: Missing transaction signature returns 402...');
  
  const partialHeadersRequest = new MockNextRequest({
    'x-wallet-address': 'TestWalletAddress123456789012345678901234'
    // Missing x-transaction-signature
  }) as any;

  try {
    const response = await middleware.protectRoute(partialHeadersRequest, contentId, mockHandler);
    
    if (response.status !== 402) {
      console.log('❌ Expected 402 status for missing signature, got:', response.status);
      return false;
    }
    
    console.log('✅ Missing transaction signature correctly returns 402');
  } catch (error) {
    console.log('❌ Error testing missing signature:', error);
    return false;
  }

  // Test 3: Missing wallet address returns 402
  console.log('Test 3: Missing wallet address returns 402...');
  
  const missingWalletRequest = new MockNextRequest({
    'x-transaction-signature': 'TestTransactionSignature123456789012345678901234567890123456'
    // Missing x-wallet-address
  }) as any;

  try {
    const response = await middleware.protectRoute(missingWalletRequest, contentId, mockHandler);
    
    if (response.status !== 402) {
      console.log('❌ Expected 402 status for missing wallet, got:', response.status);
      return false;
    }
    
    console.log('✅ Missing wallet address correctly returns 402');
  } catch (error) {
    console.log('❌ Error testing missing wallet:', error);
    return false;
  }

  // Test 4: Payment Required response structure
  console.log('Test 4: Payment Required response structure...');
  
  try {
    const response = await middleware.protectRoute(unauthorizedRequest, contentId, mockHandler);
    const responseData: PaymentRequiredResponse = await response.json();
    
    // Verify response structure
    if (!responseData.paymentDetails) {
      console.log('❌ Missing paymentDetails in response');
      return false;
    }
    
    if (responseData.paymentDetails.amount !== 0.5) {
      console.log('❌ Incorrect payment amount:', responseData.paymentDetails.amount);
      return false;
    }
    
    if (responseData.paymentDetails.currency !== 'USDC') {
      console.log('❌ Incorrect currency:', responseData.paymentDetails.currency);
      return false;
    }
    
    if (responseData.paymentDetails.contentId !== contentId) {
      console.log('❌ Incorrect contentId:', responseData.paymentDetails.contentId);
      return false;
    }
    
    if (!Array.isArray(responseData.instructions) || responseData.instructions.length === 0) {
      console.log('❌ Missing or invalid instructions');
      return false;
    }
    
    console.log('✅ Payment Required response has correct structure');
  } catch (error) {
    console.log('❌ Error testing response structure:', error);
    return false;
  }

  // Test 5: Response headers
  console.log('Test 5: Response headers...');
  
  try {
    const response = await middleware.protectRoute(unauthorizedRequest, contentId, mockHandler);
    
    const contentType = response.headers.get('Content-Type');
    if (contentType !== 'application/json') {
      console.log('❌ Incorrect Content-Type header:', contentType);
      return false;
    }
    
    const wwwAuth = response.headers.get('WWW-Authenticate');
    if (!wwwAuth || !wwwAuth.includes('Solana')) {
      console.log('❌ Missing or incorrect WWW-Authenticate header:', wwwAuth);
      return false;
    }
    
    const paymentAmount = response.headers.get('X-Payment-Amount');
    if (paymentAmount !== '0.5') {
      console.log('❌ Incorrect X-Payment-Amount header:', paymentAmount);
      return false;
    }
    
    const paymentCurrency = response.headers.get('X-Payment-Currency');
    if (paymentCurrency !== 'USDC') {
      console.log('❌ Incorrect X-Payment-Currency header:', paymentCurrency);
      return false;
    }
    
    console.log('✅ Response headers are correct');
  } catch (error) {
    console.log('❌ Error testing response headers:', error);
    return false;
  }

  // Test 6: Static utility methods
  console.log('Test 6: Static utility methods...');
  
  const requestWithHeaders = new MockNextRequest({
    'x-transaction-signature': 'TestSig123',
    'x-wallet-address': 'TestWallet123'
  }) as any;
  
  const requestWithoutHeaders = new MockNextRequest() as any;
  
  if (!X402Middleware.hasPaymentHeaders(requestWithHeaders)) {
    console.log('❌ hasPaymentHeaders should return true for request with headers');
    return false;
  }
  
  if (X402Middleware.hasPaymentHeaders(requestWithoutHeaders)) {
    console.log('❌ hasPaymentHeaders should return false for request without headers');
    return false;
  }
  
  const paymentInfo = X402Middleware.extractPaymentInfo(requestWithHeaders);
  if (paymentInfo.transactionSignature !== 'TestSig123' || 
      paymentInfo.walletAddress !== 'TestWallet123') {
    console.log('❌ extractPaymentInfo returned incorrect data');
    return false;
  }
  
  console.log('✅ Static utility methods work correctly');

  return true;
}

// Property-based test for various content IDs and configurations
async function testHTTP402Properties(): Promise<boolean> {
  console.log('Testing HTTP 402 Properties...');

  // Test with various content IDs
  const contentIds = [
    'simple-id',
    'uuid-123e4567-e89b-12d3-a456-426614174000',
    'content_with_underscores',
    'content-with-dashes',
    '12345',
    'very-long-content-id-with-many-characters-to-test-limits'
  ];

  for (const contentId of contentIds) {
    const middleware = new X402Middleware();
    const unauthorizedRequest = new MockNextRequest() as any;
    
    const mockHandler = async () => NextResponse.json({ content: 'test' });
    
    try {
      const response = await middleware.protectRoute(unauthorizedRequest, contentId, mockHandler);
      const responseData = await response.json();
      
      if (response.status !== 402) {
        console.log(`❌ Content ID "${contentId}" did not return 402`);
        return false;
      }
      
      if (responseData.paymentDetails.contentId !== contentId) {
        console.log(`❌ Content ID mismatch for "${contentId}"`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error testing content ID "${contentId}":`, error);
      return false;
    }
  }

  console.log('✅ All content IDs handled correctly');

  // Test with various payment amounts
  const amounts = [0.1, 0.5, 1.0, 2.5, 10.0];
  
  for (const amount of amounts) {
    const middleware = new X402Middleware({ requiredAmount: amount });
    const unauthorizedRequest = new MockNextRequest() as any;
    
    const mockHandler = async () => NextResponse.json({ content: 'test' });
    
    try {
      const response = await middleware.protectRoute(unauthorizedRequest, 'test-content', mockHandler);
      const responseData = await response.json();
      
      if (responseData.paymentDetails.amount !== amount) {
        console.log(`❌ Amount mismatch for ${amount}`);
        return false;
      }
      
      const headerAmount = response.headers.get('X-Payment-Amount');
      if (headerAmount !== amount.toString()) {
        console.log(`❌ Header amount mismatch for ${amount}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error testing amount ${amount}:`, error);
      return false;
    }
  }

  console.log('✅ All payment amounts handled correctly');

  return true;
}

// Run the tests
async function runHTTP402Tests(): Promise<void> {
  try {
    console.log('🚀 Starting HTTP 402 Implementation Tests...\n');
    
    const basicTest = await testHTTP402Implementation();
    const propertyTest = await testHTTP402Properties();
    
    if (basicTest && propertyTest) {
      console.log('\n🎉 All HTTP 402 Implementation tests PASSED!');
      console.log('Property 11: HTTP 402 implementation correctness - VALIDATED ✅');
    } else {
      console.log('\n❌ HTTP 402 Implementation tests FAILED!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Error running HTTP 402 tests:', error);
    process.exit(1);
  }
}

runHTTP402Tests();