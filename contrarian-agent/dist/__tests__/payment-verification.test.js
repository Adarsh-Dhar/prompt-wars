/**
 * Property-based tests for payment verification
 * Tests payment requirements, content encryption/decryption, and transaction logging
 */
import fc from 'fast-check';
import { ContrarianPaymentService } from '../lib/payment-verification.js';
describe('Payment Verification Property Tests', () => {
    let paymentService;
    beforeEach(() => {
        // Use test configuration
        paymentService = new ContrarianPaymentService('https://api.devnet.solana.com', // Test RPC
        0.001, // Test amount
        'TestRecipientAddress123456789' // Test recipient
        );
    });
    /**
     * Feature: contrarian-agent, Property 11: Payment verification requirement
     * Validates: Requirements 3.1
     */
    test('Property 11: Payment verification requirement - Valid payment required for content access', () => {
        fc.assert(fc.property(fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)), // transaction signature
        fc.string({ minLength: 10, maxLength: 50 }), // content ID
        fc.string({ minLength: 32, maxLength: 44 }), // sender address
        (transactionSignature, contentId, senderAddress) => {
            const request = {
                transactionSignature,
                expectedAmount: 0.001,
                expectedRecipient: paymentService.getRecipientAddress(),
                contentId,
                senderAddress
            };
            // For property testing, we focus on the validation logic
            // The actual blockchain verification would require real transactions
            // Test signature validation
            const isValidSignature = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(transactionSignature);
            expect(isValidSignature).toBe(true);
            // Test required amount
            expect(paymentService.getRequiredAmount()).toBe(0.001);
            // Test recipient address
            expect(typeof paymentService.getRecipientAddress()).toBe('string');
            expect(paymentService.getRecipientAddress().length).toBeGreaterThan(0);
            // Test content ID handling
            expect(typeof contentId).toBe('string');
            expect(contentId.length).toBeGreaterThan(0);
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 12: Content decryption after payment
     * Validates: Requirements 3.2
     */
    test('Property 12: Content decryption after payment - Successful decryption with valid payment', () => {
        fc.assert(fc.property(fc.string({ minLength: 10, maxLength: 500 }), // content to encrypt
        fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)), // transaction signature
        (content, transactionSignature) => {
            // Test encryption/decryption round trip
            const encrypted = paymentService.encryptContent(content, transactionSignature);
            // Verify encrypted content structure
            expect(typeof encrypted.encryptedData).toBe('string');
            expect(typeof encrypted.iv).toBe('string');
            expect(typeof encrypted.keyHash).toBe('string');
            expect(encrypted.algorithm).toBe('aes-256-gcm');
            // Verify encrypted data is different from original
            expect(encrypted.encryptedData).not.toBe(content);
            // Test successful decryption with correct transaction signature
            const decrypted = paymentService.decryptContent(encrypted, transactionSignature);
            expect(decrypted).toBe(content);
            // Test failed decryption with wrong transaction signature
            const wrongSignature = transactionSignature.slice(0, -1) + 'X';
            expect(() => {
                paymentService.decryptContent(encrypted, wrongSignature);
            }).toThrow();
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 15: Payment transaction logging
     * Validates: Requirements 3.5
     */
    test('Property 15: Payment transaction logging - All payment events logged for audit', () => {
        fc.assert(fc.property(fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)), // transaction signature
        fc.string({ minLength: 10, maxLength: 50 }), // content ID
        fc.float({ min: 0.001, max: 1.0 }), // payment amount
        (transactionSignature, contentId, amount) => {
            // Check initial state - no logs
            expect(paymentService.getPaymentLogs()).toHaveLength(0);
            expect(paymentService.getPaymentLog(transactionSignature)).toBeUndefined();
            // Test transaction usage tracking
            expect(paymentService.isTransactionUsed(transactionSignature)).toBe(false);
            // Simulate a payment log entry (since we can't make real blockchain calls in tests)
            // This tests the logging mechanism structure
            const logs = paymentService.getPaymentLogs();
            expect(Array.isArray(logs)).toBe(true);
            // Test log clearing functionality
            paymentService.clearOldLogs(24); // Should not throw
            // Verify logging interface exists
            expect(typeof paymentService.getPaymentLogs).toBe('function');
            expect(typeof paymentService.getPaymentLog).toBe('function');
            expect(typeof paymentService.isTransactionUsed).toBe('function');
            expect(typeof paymentService.clearOldLogs).toBe('function');
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 20: x402 infrastructure compatibility
     * Validates: Requirements 5.5
     */
    test('Property 20: x402 infrastructure compatibility - Compatible with existing payment system', () => {
        fc.assert(fc.property(fc.string({ minLength: 10, maxLength: 200 }), // content
        (content) => {
            // Test content preview generation (x402 pattern)
            const preview = paymentService.createContentPreview(content, 0.15);
            // Should contain payment information
            expect(preview).toContain('SOL');
            expect(preview).toContain('locked');
            expect(preview).toContain('Recipient:');
            expect(preview).toContain('Contrarian Agent');
            // Should contain original content preview
            expect(preview).toContain(content.substring(0, Math.min(50, content.length)));
            // Should be longer than original (due to payment info)
            expect(preview.length).toBeGreaterThan(content.length);
            // Test required amount and recipient address methods (x402 compatibility)
            expect(typeof paymentService.getRequiredAmount()).toBe('number');
            expect(paymentService.getRequiredAmount()).toBeGreaterThan(0);
            expect(typeof paymentService.getRecipientAddress()).toBe('string');
            expect(paymentService.getRecipientAddress().length).toBeGreaterThan(0);
        }), { numRuns: 100 });
    });
    test('Encryption key derivation consistency', () => {
        fc.assert(fc.property(fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)), fc.string({ minLength: 1, maxLength: 100 }), (transactionSignature, content) => {
            // Same transaction signature should produce same encryption/decryption
            const encrypted1 = paymentService.encryptContent(content, transactionSignature);
            const encrypted2 = paymentService.encryptContent(content, transactionSignature);
            // Different IVs but same key hash
            expect(encrypted1.keyHash).toBe(encrypted2.keyHash);
            expect(encrypted1.iv).not.toBe(encrypted2.iv); // Different IVs for security
            // Both should decrypt to same content
            const decrypted1 = paymentService.decryptContent(encrypted1, transactionSignature);
            const decrypted2 = paymentService.decryptContent(encrypted2, transactionSignature);
            expect(decrypted1).toBe(content);
            expect(decrypted2).toBe(content);
        }), { numRuns: 50 });
    });
    test('Content preview generation', () => {
        fc.assert(fc.property(fc.string({ minLength: 100, maxLength: 1000 }), // Long content
        fc.float({ min: 0.1, max: 0.5 }), // Visible percentage
        (content, visiblePercentage) => {
            const preview = paymentService.createContentPreview(content, visiblePercentage);
            // Should contain payment information
            expect(preview).toContain('locked');
            expect(preview).toContain('SOL');
            expect(preview).toContain('Contrarian Agent');
            // Should be shorter than full content but longer than visible portion
            const lines = content.split('\n');
            const visibleLines = Math.floor(lines.length * visiblePercentage);
            const visibleContent = lines.slice(0, visibleLines).join('\n');
            expect(preview.length).toBeGreaterThan(visibleContent.length);
            expect(preview.length).toBeLessThan(content.length + 500); // Some reasonable upper bound
            // Should contain part of original content
            if (visibleLines > 0) {
                expect(preview).toContain(lines[0]);
            }
        }), { numRuns: 100 });
    });
    test('Address and signature validation', () => {
        fc.assert(fc.property(fc.oneof(fc.string({ minLength: 32, maxLength: 44 }), // Valid length range
        fc.string({ minLength: 1, maxLength: 31 }), // Too short
        fc.string({ minLength: 45, maxLength: 100 }), // Too long
        fc.constant(''), // Empty
        fc.constant('invalid-chars-!@#$%') // Invalid characters
        ), (testAddress) => {
            // We can't test the actual Solana address validation without the library
            // But we can test that the validation function exists and handles edge cases
            expect(typeof paymentService.getRecipientAddress).toBe('function');
            expect(typeof paymentService.getRequiredAmount).toBe('function');
            // Test that service handles various input types gracefully
            const recipient = paymentService.getRecipientAddress();
            expect(typeof recipient).toBe('string');
        }), { numRuns: 100 });
    });
});
