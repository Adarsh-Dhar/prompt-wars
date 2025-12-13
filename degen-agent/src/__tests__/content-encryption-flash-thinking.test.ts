/**
 * Property-based tests for Flash Thinking content encryption functionality
 */

import * as fc from 'fast-check';
import { ContentEncryption } from '../lib/content-encryption';
import { ThoughtPart } from '../types';

describe('Content Encryption Flash Thinking Property Tests', () => {
  let encryption: ContentEncryption;

  beforeEach(() => {
    encryption = new ContentEncryption();
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 12: Encryption consistency**
   * For any Chain_Of_Thought data being stored, the content_encryption module should encrypt thoughts 
   * using the same encryption approach as other premium content
   */
  test('Property 12: Encryption consistency', async () => {
    await fc.assert(fc.property(
      // Generator for ThoughtPart arrays
      fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 200 }),
          thought: fc.constant(true),
          order: fc.integer({ min: 0, max: 100 }),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          tokenCount: fc.option(fc.integer({ min: 1, max: 100 }))
        }),
        { minLength: 1, maxLength: 10 }
      ),
      // Generator for transaction signatures
      fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)),
      (thoughtParts, transactionSignature) => {
        // Test round-trip encryption/decryption
        const encrypted = encryption.encryptThoughtParts(thoughtParts, transactionSignature);
        const decrypted = encryption.decryptThoughtParts(encrypted, transactionSignature);

        // Verify structure preservation
        expect(decrypted).toHaveLength(thoughtParts.length);
        
        // Verify each thought part is preserved exactly
        decrypted.forEach((decryptedPart, index) => {
          const originalPart = thoughtParts[index];
          expect(decryptedPart.text).toBe(originalPart.text);
          expect(decryptedPart.thought).toBe(originalPart.thought);
          expect(decryptedPart.order).toBe(originalPart.order);
          expect(decryptedPart.timestamp).toBe(originalPart.timestamp);
          expect(decryptedPart.tokenCount).toBe(originalPart.tokenCount);
        });

        // Verify encrypted content has proper structure
        expect(ContentEncryption.isValidEncryptedContent(encrypted)).toBe(true);
        expect(encrypted.algorithm).toBe('aes-256-gcm');
        expect(encrypted.iv).toMatch(/^[0-9a-f]{32}$/);
        expect(encrypted.keyHash).toMatch(/^[0-9a-f]{64}$/);
        expect(encrypted.encryptedData).toBeTruthy();
      }
    ), { numRuns: 100 });
  });

  /**
   * Test encryption consistency across different content types
   */
  test('Encryption consistency across content types', async () => {
    await fc.assert(fc.property(
      fc.record({
        finalAnswer: fc.string({ minLength: 10, maxLength: 500 }),
        chainOfThought: fc.array(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            thought: fc.constant(true),
            order: fc.integer({ min: 0, max: 50 }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            tokenCount: fc.option(fc.integer({ min: 1, max: 50 }))
          }),
          { minLength: 1, maxLength: 5 }
        ),
        marketAnalysis: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
        riskAssessment: fc.option(fc.string({ minLength: 10, maxLength: 200 }))
      }),
      fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)),
      (analysisResponse, transactionSignature) => {
        // Test complete analysis response encryption
        const encrypted = encryption.encryptAnalysisResponse(analysisResponse, transactionSignature);
        const decrypted = encryption.decryptAnalysisResponse(encrypted, transactionSignature);

        // Verify all fields are preserved
        expect(decrypted.finalAnswer).toBe(analysisResponse.finalAnswer);
        expect(decrypted.chainOfThought).toHaveLength(analysisResponse.chainOfThought.length);
        
        if (analysisResponse.marketAnalysis) {
          expect(decrypted.marketAnalysis).toBe(analysisResponse.marketAnalysis);
        }
        
        if (analysisResponse.riskAssessment) {
          expect(decrypted.riskAssessment).toBe(analysisResponse.riskAssessment);
        }

        // Verify all encrypted fields use same algorithm
        expect(encrypted.finalAnswer.algorithm).toBe('aes-256-gcm');
        expect(encrypted.chainOfThought.algorithm).toBe('aes-256-gcm');
        
        if (encrypted.marketAnalysis) {
          expect(encrypted.marketAnalysis.algorithm).toBe('aes-256-gcm');
        }
        
        if (encrypted.riskAssessment) {
          expect(encrypted.riskAssessment.algorithm).toBe('aes-256-gcm');
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Test preview generation consistency
   */
  test('Preview generation for chain-of-thought', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          text: fc.string({ minLength: 20, maxLength: 200 }),
          thought: fc.constant(true),
          order: fc.integer({ min: 0, max: 100 }),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          tokenCount: fc.option(fc.integer({ min: 1, max: 100 }))
        }),
        { minLength: 0, maxLength: 10 }
      ),
      fc.integer({ min: 0, max: 5 }),
      (thoughtParts, visibleCount) => {
        const preview = ContentEncryption.createThoughtPartsPreview(thoughtParts, visibleCount);
        
        // Verify preview is always a string
        expect(typeof preview).toBe('string');
        
        // Verify preview contains payment prompt
        expect(preview).toContain('0.5 USDC');
        
        if (thoughtParts.length === 0) {
          // Empty array should show generic message
          expect(preview).toContain('Premium chain-of-thought analysis available');
        } else {
          // Non-empty array should show thinking process
          expect(preview).toContain('Thinking Process Preview');
          
          // Should not reveal full content
          const fullText = thoughtParts.map(p => p.text).join(' ');
          expect(preview).not.toContain(fullText);
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Test summary generation
   */
  test('Thought summary generation', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          text: fc.string({ minLength: 10, maxLength: 100 }),
          thought: fc.constant(true),
          order: fc.integer({ min: 0, max: 100 }),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          tokenCount: fc.option(fc.integer({ min: 1, max: 50 }))
        }),
        { minLength: 0, maxLength: 15 }
      ),
      (thoughtParts) => {
        const summary = ContentEncryption.generateThoughtSummary(thoughtParts);
        
        // Verify summary is always a string
        expect(typeof summary).toBe('string');
        
        if (thoughtParts.length === 0) {
          // Empty array should show generic message
          expect(summary).toContain('Advanced reasoning analysis available');
        } else {
          // Non-empty array should show step count
          expect(summary).toContain(`${thoughtParts.length} analytical steps`);
          expect(summary).toContain('AI Reasoning Summary');
          
          // Should not reveal actual thought content
          const fullText = thoughtParts.map(p => p.text).join(' ');
          expect(summary).not.toContain(fullText);
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Test encryption with invalid transaction signatures
   */
  test('Encryption fails with invalid keys', async () => {
    await fc.assert(fc.property(
      fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 100 }),
          thought: fc.constant(true),
          order: fc.integer({ min: 0, max: 50 }),
          timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 })
        }),
        { minLength: 1, maxLength: 5 }
      ),
      fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)),
      fc.string({ minLength: 64, maxLength: 88 }).filter(s => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s)),
      (thoughtParts, correctSignature, wrongSignature) => {
        // Assume signatures are different
        fc.pre(correctSignature !== wrongSignature);
        
        // Encrypt with correct signature
        const encrypted = encryption.encryptThoughtParts(thoughtParts, correctSignature);
        
        // Attempt to decrypt with wrong signature should fail
        expect(() => {
          encryption.decryptThoughtParts(encrypted, wrongSignature);
        }).toThrow();
      }
    ), { numRuns: 30 });
  });
});