/**
 * Property-based tests for Degen Brain Flash Thinking configuration
 */

import * as fc from 'fast-check';
import {
  getDegenBrainConfig,
  isFlashThinkingEnabled,
  getModelConfig,
  validateConfiguration,
  generateFlashThinkingPrompt,
  generateDegenPrompt
} from '../lib/degen_brain';

describe('Degen Brain Flash Thinking Property Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 8: Feature flag behavior**
   * For any request when GEMINI_ENABLE_THOUGHTS is false, the system should use standard generation 
   * without thinking_config
   */
  test('Property 8: Feature flag behavior', async () => {
    await fc.assert(fc.property(
      fc.boolean(), // GEMINI_ENABLE_THOUGHTS value
      fc.string({ minLength: 1, maxLength: 100 }), // GEMINI_API_KEY
      fc.string({ minLength: 1, maxLength: 100 }), // OPENAI_API_KEY
      fc.constantFrom('gemini-2.0-flash-thinking-exp-01-21', 'gemini-pro', 'gemini-1.5-pro'), // model
      (enableThoughts, geminiKey, openaiKey, model) => {
        // Set environment variables
        process.env.GEMINI_ENABLE_THOUGHTS = enableThoughts.toString();
        process.env.GEMINI_API_KEY = geminiKey;
        process.env.OPENAI_API_KEY = openaiKey;
        process.env.GEMINI_FLASH_MODEL = model;

        const config = getDegenBrainConfig();
        const modelConfig = getModelConfig();
        const isEnabled = isFlashThinkingEnabled();

        // Verify feature flag consistency
        expect(config.flashThinking.enabled).toBe(enableThoughts);
        expect(config.useGemini).toBe(enableThoughts);
        expect(isEnabled).toBe(enableThoughts);

        if (enableThoughts) {
          // When enabled, should use Gemini
          expect(modelConfig.useGemini).toBe(true);
          expect(modelConfig.config.enableThoughts).toBe(true);
          expect(modelConfig.config.model).toBe(model);
          expect(modelConfig.config.apiKey).toBe(geminiKey);
        } else {
          // When disabled, should use OpenAI
          expect(modelConfig.useGemini).toBe(false);
          expect(modelConfig.config.apiKey).toBe(openaiKey);
          expect(modelConfig.config.enableThoughts).toBeUndefined();
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * **Feature: gemini-flash-thinking-cot, Property 11: Temperature configuration**
   * For any generation when GEMINI_THOUGHTS_TEMPERATURE is specified, the temperature should be 
   * applied to the thinking_config
   */
  test('Property 11: Temperature configuration', async () => {
    await fc.assert(fc.property(
      fc.float({ min: Math.fround(0), max: Math.fround(2), noNaN: true }), // temperature
      fc.integer({ min: 100, max: 10000 }), // maxTokens
      fc.integer({ min: 100, max: 5000 }), // maxThoughtTokens
      (temperature, maxTokens, maxThoughtTokens) => {
        // Set environment variables
        process.env.GEMINI_ENABLE_THOUGHTS = 'true';
        process.env.GEMINI_API_KEY = 'test-key';
        process.env.GEMINI_THOUGHTS_TEMPERATURE = temperature.toString();
        process.env.COST_CONTROL_MAX_TOKENS = maxTokens.toString();
        process.env.COST_CONTROL_MAX_THOUGHT_TOKENS = maxThoughtTokens.toString();

        const config = getDegenBrainConfig();
        const modelConfig = getModelConfig();

        // Verify temperature is applied correctly
        expect(config.flashThinking.temperature).toBeCloseTo(temperature, 5);
        expect(modelConfig.config.temperature).toBeCloseTo(temperature, 5);

        // Verify other configuration values
        expect(config.flashThinking.maxTokens).toBe(maxTokens);
        expect(config.flashThinking.maxThoughtTokens).toBe(maxThoughtTokens);
        expect(modelConfig.config.maxTokens).toBe(maxTokens);
      }
    ), { numRuns: 100 });
  });

  /**
   * Test configuration validation
   */
  test('Configuration validation consistency', async () => {
    await fc.assert(fc.property(
      fc.boolean(), // enableThoughts
      fc.option(fc.string({ minLength: 1, maxLength: 100 })), // geminiKey (optional)
      fc.option(fc.string({ minLength: 1, maxLength: 100 })), // openaiKey (optional)
      fc.float({ min: Math.fround(-1), max: Math.fround(3), noNaN: true }), // temperature (can be invalid)
      fc.integer({ min: -100, max: 10000 }), // maxTokens (can be invalid)
      (enableThoughts, geminiKey, openaiKey, temperature, maxTokens) => {
        // Set environment variables
        process.env.GEMINI_ENABLE_THOUGHTS = enableThoughts.toString();
        if (geminiKey) process.env.GEMINI_API_KEY = geminiKey;
        if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
        process.env.GEMINI_THOUGHTS_TEMPERATURE = temperature.toString();
        process.env.COST_CONTROL_MAX_TOKENS = maxTokens.toString();

        const validation = validateConfiguration();

        // Check validation logic
        if (enableThoughts) {
          // Gemini mode validation
          if (!geminiKey) {
            expect(validation.errors).toContain('GEMINI_API_KEY is required when Flash Thinking is enabled');
          }
          if (temperature < 0 || temperature > 2) {
            expect(validation.errors).toContain('GEMINI_THOUGHTS_TEMPERATURE must be between 0 and 2');
          }
          if (maxTokens <= 0) {
            expect(validation.errors).toContain('COST_CONTROL_MAX_TOKENS must be positive');
          }
        } else {
          // OpenAI mode validation
          if (!openaiKey) {
            expect(validation.errors).toContain('OPENAI_API_KEY is required when Flash Thinking is disabled');
          }
        }

        // Validation should be consistent with error count
        expect(validation.isValid).toBe(validation.errors.length === 0);
      }
    ), { numRuns: 50 });
  });

  /**
   * Test prompt generation differences
   */
  test('Flash Thinking prompt enhancement', async () => {
    await fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 10 }), // tokenSymbol
      fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }), // currentPrice
      fc.option(fc.object()), // marketData
      (tokenSymbol, currentPrice, marketData) => {
        const standardPrompt = generateDegenPrompt(tokenSymbol, currentPrice, marketData);
        const flashThinkingPrompt = generateFlashThinkingPrompt(tokenSymbol, currentPrice, marketData);

        // Flash thinking prompt should contain standard prompt
        expect(flashThinkingPrompt).toContain(standardPrompt);

        // Flash thinking prompt should have additional instructions
        expect(flashThinkingPrompt).toContain('FLASH THINKING INSTRUCTIONS');
        expect(flashThinkingPrompt).toContain('Think step-by-step');
        expect(flashThinkingPrompt).toContain('reasoning process');

        // Both should contain the token symbol and price
        expect(standardPrompt).toContain(tokenSymbol);
        expect(standardPrompt).toContain(currentPrice.toString());
        expect(flashThinkingPrompt).toContain(tokenSymbol);
        expect(flashThinkingPrompt).toContain(currentPrice.toString());

        // Flash thinking prompt should be longer
        expect(flashThinkingPrompt.length).toBeGreaterThan(standardPrompt.length);
      }
    ), { numRuns: 50 });
  });

  /**
   * Test default configuration consistency
   */
  test('Default configuration consistency', () => {
    // Test with minimal environment
    process.env = {
      GEMINI_ENABLE_THOUGHTS: 'false'
    };

    const config = getDegenBrainConfig();

    // Verify defaults are applied
    expect(config.flashThinking.enabled).toBe(false);
    expect(config.flashThinking.model).toBe('gemini-2.0-flash-thinking-exp-01-21');
    expect(config.flashThinking.temperature).toBe(1.0);
    expect(config.flashThinking.maxTokens).toBe(4000);
    expect(config.flashThinking.maxThoughtTokens).toBe(2000);
    expect(config.useGemini).toBe(false);

    // Test with Flash Thinking enabled
    process.env.GEMINI_ENABLE_THOUGHTS = 'true';
    const enabledConfig = getDegenBrainConfig();

    expect(enabledConfig.flashThinking.enabled).toBe(true);
    expect(enabledConfig.useGemini).toBe(true);
  });

  /**
   * Test environment variable parsing
   */
  test('Environment variable parsing robustness', async () => {
    await fc.assert(fc.property(
      fc.oneof(
        fc.constant('true'),
        fc.constant('false'),
        fc.constant('TRUE'),
        fc.constant('FALSE'),
        fc.constant('1'),
        fc.constant('0'),
        fc.constant('yes'),
        fc.constant('no'),
        fc.string()
      ), // various boolean-like values
      fc.oneof(
        fc.float({ min: Math.fround(0), max: Math.fround(2) }).map(n => n.toString()),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.constant('invalid')
      ), // various temperature values
      (boolValue, tempValue) => {
        process.env.GEMINI_ENABLE_THOUGHTS = boolValue;
        process.env.GEMINI_THOUGHTS_TEMPERATURE = tempValue;

        const config = getDegenBrainConfig();

        // Only 'true' should enable Flash Thinking
        expect(config.flashThinking.enabled).toBe(boolValue === 'true');
        expect(config.useGemini).toBe(boolValue === 'true');

        // Temperature parsing should handle invalid values gracefully
        const parsedTemp = parseFloat(tempValue);
        if (isNaN(parsedTemp)) {
          expect(config.flashThinking.temperature).toBe(1.0); // default
        } else {
          expect(config.flashThinking.temperature).toBe(parsedTemp);
        }
      }
    ), { numRuns: 30 });
  });
});