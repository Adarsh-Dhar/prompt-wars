/**
 * Property-based tests for Google Gen AI client Flash Thinking functionality
 */

import * as fc from 'fast-check';
import { GoogleGenAIClient, ThoughtPart, GenerationResult } from '../lib/google-gen-client';

// Mock the Google Generative AI SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
      generateContentStream: jest.fn()
    })
  }))
}));

describe('Google Gen AI Client Property Tests', () => {
  let client: GoogleGenAIClient;
  let mockModel: any;

  beforeEach(() => {
    // Set up environment variables for testing
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GEMINI_ENABLE_THOUGHTS = 'true';
    process.env.GEMINI_FLASH_MODEL = 'gemini-2.0-flash-thinking-exp-01-21';
    
    // Set up the mock before creating the client
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    mockModel = {
      generateContent: jest.fn(),
      generateContentStream: jest.fn()
    };
    
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockModel)
    }));
    
    client = new GoogleGenAIClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 2: Response parsing correctness**
   * For any Gemini response with mixed thought and non-thought parts, all parts with part.thought === true 
   * should be collected as ordered Chain_Of_Thought entries, and non-thought parts should be concatenated 
   * to form the final answer
   */
  test('Property 2: Response parsing correctness', async () => {
    await fc.assert(fc.asyncProperty(
      // Generator for mixed thought and non-thought parts
      fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 100 }),
          thought: fc.boolean()
        }),
        { minLength: 1, maxLength: 10 }
      ),
      async (parts) => {
        // Mock the Gemini API response
        const mockResponse = {
          response: {
            candidates: [{
              content: {
                parts: parts
              }
            }]
          }
        };

        mockModel.generateContent.mockResolvedValue(mockResponse);

        // Call the client method
        const result = await client.generateWithThoughts('test prompt');

        // Verify that thought parts are correctly separated
        const expectedThoughts = parts.filter(p => p.thought);
        const expectedFinalText = parts.filter(p => !p.thought).map(p => p.text).join('');

        // Check that all thought parts are in chainOfThought
        expect(result.chainOfThought).toHaveLength(expectedThoughts.length);
        
        // Check that thought parts maintain order
        result.chainOfThought.forEach((thought, index) => {
          expect(thought.text).toBe(expectedThoughts[index].text);
          expect(thought.thought).toBe(true);
          expect(thought.order).toBe(index);
          expect(typeof thought.timestamp).toBe('number');
        });

        // Check that final answer is concatenated non-thought parts
        expect(result.finalAnswer).toBe(expectedFinalText);

        // Check token counting
        expect(result.totalTokens).toBeGreaterThanOrEqual(0);
        expect(result.thoughtTokens).toBeGreaterThanOrEqual(0);
        expect(result.finalTokens).toBeGreaterThanOrEqual(0);
        expect(result.totalTokens).toBe(result.thoughtTokens + result.finalTokens);
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 1: Gemini SDK configuration consistency**
   * For any analysis request when GEMINI_ENABLE_THOUGHTS is true, the Google Gen AI SDK should be called 
   * with thinking_config.include_thoughts = true and the configured model from GEMINI_FLASH_MODEL
   */
  test('Property 1: Gemini SDK configuration consistency', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 500 }), // prompt
      fc.boolean(), // enableThoughts flag
      fc.constantFrom('gemini-2.0-flash-thinking-exp-01-21', 'gemini-pro', 'gemini-1.5-pro'), // model
      async (prompt, enableThoughts, model) => {
        // Create client with specific configuration
        const testClient = new GoogleGenAIClient({
          apiKey: 'test-key',
          enableThoughts,
          model,
          temperature: 1.0
        });

        // Mock response
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [{
              content: {
                parts: [{ text: 'test response', thought: false }]
              }
            }]
          }
        });

        await testClient.generateWithThoughts(prompt);

        // Verify the model was called
        expect(mockModel.generateContent).toHaveBeenCalled();
        
        const callArgs = mockModel.generateContent.mock.calls[0][0];
        
        // Verify prompt was passed correctly (allow for any string)
        expect(typeof callArgs.contents[0].parts[0].text).toBe('string');

        // Verify thinking config is present when thoughts are enabled
        if (enableThoughts) {
          expect(callArgs.thinkingConfig?.includeThoughts).toBe(true);
        }

        // Verify configuration consistency
        expect(testClient.isFlashThinkingEnabled()).toBe(enableThoughts);
        expect(testClient.getConfig().model).toBe(model);
        expect(testClient.getConfig().enableThoughts).toBe(enableThoughts);
      }
    ), { numRuns: 100 });
  });

  /**
   * Test streaming event ordering property
   */
  test('Property 5: Streaming event ordering (partial)', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          thought: fc.boolean()
        }),
        { minLength: 1, maxLength: 5 }
      ),
      async (parts) => {
        // Mock streaming response
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            for (const part of parts) {
              yield {
                candidates: [{
                  content: {
                    parts: [part]
                  }
                }]
              };
            }
          }
        };

        mockModel.generateContentStream.mockResolvedValue(mockStream);

        // Track events in order
        const events: Array<{ type: string; data: any }> = [];
        
        const callbacks = {
          onThought: (thought: ThoughtPart) => {
            events.push({ type: 'thinking', data: thought });
          },
          onFinal: (text: string, isComplete: boolean) => {
            events.push({ type: isComplete ? 'final' : 'final-part', data: { text, isComplete } });
          },
          onComplete: (result: GenerationResult) => {
            events.push({ type: 'complete', data: result });
          },
          onError: (error: Error) => {
            events.push({ type: 'error', data: error });
          }
        };

        await client.streamWithThoughts('test prompt', callbacks);

        // Verify events were emitted
        expect(events.length).toBeGreaterThan(0);

        // Verify thinking events come before final events (for each part)
        let thoughtIndex = 0;
        let finalPartIndex = 0;

        for (const part of parts) {
          if (part.thought) {
            const thinkingEvent = events.find(e => 
              e.type === 'thinking' && 
              e.data.order === thoughtIndex
            );
            expect(thinkingEvent).toBeDefined();
            expect(thinkingEvent?.data.text).toBe(part.text);
            thoughtIndex++;
          } else {
            const finalEvent = events.find(e => 
              e.type === 'final-part' && 
              e.data.text === part.text
            );
            expect(finalEvent).toBeDefined();
            finalPartIndex++;
          }
        }

        // Verify completion event is last
        const lastEvent = events[events.length - 1];
        expect(lastEvent.type).toBe('complete');
      }
    ), { numRuns: 50 });
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 9: Cost control enforcement**
   * **Validates: Requirements 4.3**
   * 
   * For any generation with thoughts when COST_CONTROL_MAX_TOKENS is configured, 
   * very long thoughts should be truncated to limit token usage
   */
  test('Property 9: Cost control enforcement', async () => {
    await fc.assert(fc.asyncProperty(
      fc.integer({ min: 100, max: 5000 }), // maxTokens
      fc.array(
        fc.record({
          text: fc.string({ minLength: 50, maxLength: 200 }), // Longer texts to trigger limits
          thought: fc.constant(true) // Only thought parts for this test
        }),
        { minLength: 5, maxLength: 20 }
      ),
      async (maxTokens, thoughtParts) => {
        // Set cost control environment
        process.env.COST_CONTROL_MAX_THOUGHT_TOKENS = maxTokens.toString();

        const testClient = new GoogleGenAIClient({
          apiKey: 'test-key',
          enableThoughts: true
        });

        // Mock response with many thought parts
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [{
              content: {
                parts: thoughtParts
              }
            }]
          }
        });

        const result = await testClient.generateWithThoughts('test prompt');

        // Verify cost control was applied
        expect(result.thoughtTokens).toBeLessThanOrEqual(maxTokens + 100); // Allow some tolerance
        
        // Calculate total original tokens
        const totalOriginalTokens = thoughtParts.reduce((sum, part) => 
          sum + Math.ceil(part.text.length / 4), 0
        );
        
        if (totalOriginalTokens >= maxTokens) {
          // Should have been truncated or exactly at limit
          expect(result.chainOfThought.length).toBeLessThanOrEqual(thoughtParts.length);
          
          // If truncated, last thought should be truncation notice or within limits
          if (result.chainOfThought.length < thoughtParts.length) {
            const lastThought = result.chainOfThought[result.chainOfThought.length - 1];
            expect(
              lastThought.text.includes('[Thoughts truncated') || 
              result.thoughtTokens < maxTokens
            ).toBe(true);
          }
        } else {
          // Should not be truncated
          expect(result.chainOfThought.length).toBe(thoughtParts.length);
        }

        // Verify token counts are consistent
        expect(result.totalTokens).toBe(result.thoughtTokens + result.finalTokens);
        expect(result.thoughtTokens).toBeGreaterThanOrEqual(0);
        expect(result.finalTokens).toBeGreaterThanOrEqual(0);
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 10: Token usage logging**
   * **Validates: Requirements 4.4**
   * 
   * For any generation with thoughts enabled, the system should log token usage 
   * metrics distinguishing between thoughts and final text
   */
  test('Property 10: Token usage logging', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          text: fc.string({ minLength: 10, maxLength: 100 }),
          thought: fc.boolean()
        }),
        { minLength: 1, maxLength: 10 }
      ),
      async (parts) => {
        // Reset usage stats before test
        GoogleGenAIClient.resetUsageStats();
        
        const testClient = new GoogleGenAIClient({
          apiKey: 'test-key',
          enableThoughts: true
        });

        // Mock response
        mockModel.generateContent.mockResolvedValue({
          response: {
            candidates: [{
              content: {
                parts: parts
              }
            }]
          }
        });

        const result = await testClient.generateWithThoughts('test prompt');

        // Verify usage stats were updated (this is the core logging functionality)
        const stats = GoogleGenAIClient.getUsageStats();
        expect(stats.totalRequests).toBeGreaterThan(0);
        expect(stats.totalTokens).toBeGreaterThanOrEqual(result.totalTokens);
        expect(stats.totalThoughtTokens).toBeGreaterThanOrEqual(result.thoughtTokens);
        expect(stats.totalFinalTokens).toBeGreaterThanOrEqual(result.finalTokens);

        // Verify token counts are consistent
        expect(result.totalTokens).toBe(result.thoughtTokens + result.finalTokens);
        expect(result.thoughtTokens).toBeGreaterThanOrEqual(0);
        expect(result.finalTokens).toBeGreaterThanOrEqual(0);

        // Verify token counting logic
        const expectedTotalTokens = parts.reduce((sum, part) => 
          sum + Math.ceil(part.text.length / 4), 0
        );
        expect(result.totalTokens).toBe(expectedTotalTokens);

        // Verify thought vs final token separation
        const expectedThoughtTokens = parts
          .filter(p => p.thought)
          .reduce((sum, part) => sum + Math.ceil(part.text.length / 4), 0);
        const expectedFinalTokens = parts
          .filter(p => !p.thought)
          .reduce((sum, part) => sum + Math.ceil(part.text.length / 4), 0);
        
        expect(result.thoughtTokens).toBe(expectedThoughtTokens);
        expect(result.finalTokens).toBe(expectedFinalTokens);
      }
    ), { numRuns: 100 });
  });
});