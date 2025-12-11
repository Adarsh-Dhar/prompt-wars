/**
 * Property-based tests for sentiment fetcher
 * Tests API call consistency, error resilience, and data validation
 */

import fc from 'fast-check';
import { SentimentFetcher } from '../lib/sentiment-fetcher.js';
import { FearGreedData, CommunityData } from '../types/index.js';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('Sentiment Fetcher Property Tests', () => {
  let sentimentFetcher: SentimentFetcher;

  beforeEach(() => {
    sentimentFetcher = new SentimentFetcher(5); // 5 minute cache
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Feature: contrarian-agent, Property 1: API call consistency
   * Validates: Requirements 1.1
   */
  test('Property 1: API call consistency - Fear & Greed Index', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 100 }), // fear greed value
      fc.constantFrom('Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'), // classification
      fc.integer({ min: 1000000000, max: 9999999999 }), // timestamp
      async (value, classification, timestamp) => {
        // Mock successful API response
        const mockResponse = {
          data: [{
            value: value.toString(),
            value_classification: classification,
            timestamp: timestamp.toString(),
            time_until_update: '86400'
          }]
        };

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse
        } as Response);

        const result = await sentimentFetcher.getFearGreedIndex();
        
        // Verify API call consistency
        expect(fetch).toHaveBeenCalledWith('https://api.alternative.me/fng/', {
          signal: expect.any(AbortSignal),
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ContrarianAgent/1.0'
          }
        });

        // Verify result format consistency
        expect(result.value).toBe(value);
        expect(result.value_classification).toBe(classification);
        expect(result.timestamp).toBe(timestamp.toString());
        expect(typeof result.time_until_update).toBe('string');
      }
    ), { numRuns: 100 });
  });

  /**
   * Feature: contrarian-agent, Property 2: Token sentiment retrieval
   * Validates: Requirements 1.2
   */
  test('Property 2: Token sentiment retrieval - CoinGecko API', () => {
    fc.assert(fc.property(
      fc.constantFrom('BTC', 'ETH', 'SOL', 'ADA', 'DOT'), // token symbols
      fc.float({ min: -50, max: 50 }), // price change 24h
      fc.float({ min: -50, max: 50 }), // price change 7d
      async (tokenSymbol, priceChange24h, priceChange7d) => {
        // Mock CoinGecko API response
        const mockResponse = {
          id: tokenSymbol.toLowerCase(),
          symbol: tokenSymbol.toLowerCase(),
          market_data: {
            price_change_percentage_24h: priceChange24h,
            price_change_percentage_7d: priceChange7d
          }
        };

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse
        } as Response);

        const result = await sentimentFetcher.getCommunitysentiment(tokenSymbol);
        
        // Verify API call was made
        expect(fetch).toHaveBeenCalled();
        
        // Verify result structure consistency
        expect(result.tokenSymbol).toBe(tokenSymbol.toUpperCase());
        expect(typeof result.sentiment).toBe('number');
        expect(result.sentiment >= 0 && result.sentiment <= 100).toBe(true);
        expect(typeof result.bullishPercentage).toBe('number');
        expect(typeof result.bearishPercentage).toBe('number');
        expect(result.source).toBe('coingecko');
        
        // Verify bullish + bearish = 100
        expect(Math.abs((result.bullishPercentage + result.bearishPercentage) - 100)).toBeLessThan(1);
      }
    ), { numRuns: 100 });
  });

  /**
   * Feature: contrarian-agent, Property 3: Network error resilience
   * Validates: Requirements 1.3
   */
  test('Property 3: Network error resilience - Retry logic', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 3 }), // number of failures before success
      fc.integer({ min: 0, max: 100 }), // eventual success value
      async (failureCount, successValue) => {
        let callCount = 0;
        
        global.fetch = jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= failureCount) {
            return Promise.reject(new Error('Network error'));
          }
          
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [{
                value: successValue.toString(),
                value_classification: 'Neutral',
                timestamp: '1234567890',
                time_until_update: '86400'
              }]
            })
          } as Response);
        });

        const result = await sentimentFetcher.getFearGreedIndex();
        
        // Verify retry attempts were made
        expect(fetch).toHaveBeenCalledTimes(failureCount + 1);
        
        // Verify eventual success
        expect(result.value).toBe(successValue);
      }
    ), { numRuns: 50 }); // Reduced runs due to async nature
  });

  /**
   * Feature: contrarian-agent, Property 4: Sentiment data validation
   * Validates: Requirements 1.4
   */
  test('Property 4: Sentiment data validation - Fear & Greed range', () => {
    fc.assert(fc.property(
      fc.integer({ min: -100, max: 200 }), // test values outside valid range too
      (testValue) => {
        const validData = {
          value: testValue,
          value_classification: 'Test',
          timestamp: '1234567890'
        };

        const isValid = sentimentFetcher.validateSentimentData(validData);
        
        // Should only be valid if value is in 0-100 range
        const expectedValid = testValue >= 0 && testValue <= 100;
        expect(isValid).toBe(expectedValid);
      }
    ), { numRuns: 100 });
  });

  /**
   * Feature: contrarian-agent, Property 5: Cache refresh timing
   * Validates: Requirements 1.5
   */
  test('Property 5: Cache refresh timing - 5 minute intervals', async () => {
    const mockResponse = {
      data: [{
        value: '50',
        value_classification: 'Neutral',
        timestamp: '1234567890',
        time_until_update: '86400'
      }]
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);

    // First call should hit API
    await sentimentFetcher.getFearGreedIndex();
    expect(fetch).toHaveBeenCalledTimes(1);

    // Second call within cache period should use cache
    await sentimentFetcher.getFearGreedIndex();
    expect(fetch).toHaveBeenCalledTimes(1); // No additional API call

    // Verify cache stats
    const stats = sentimentFetcher.getCacheStats();
    expect(stats.fearGreedCached).toBe(true);
  });

  /**
   * Feature: contrarian-agent, Property 24: Cached data fallback
   * Validates: Requirements 6.4
   */
  test('Property 24: Cached data fallback - API unavailable', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 100 }), // cached value
      async (cachedValue) => {
        // First, populate cache with successful call
        const mockSuccessResponse = {
          data: [{
            value: cachedValue.toString(),
            value_classification: 'Neutral',
            timestamp: '1234567890',
            time_until_update: '86400'
          }]
        };

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => mockSuccessResponse
        } as Response);

        await sentimentFetcher.getFearGreedIndex();

        // Now make API fail
        global.fetch = jest.fn().mockRejectedValue(new Error('API unavailable'));

        // Should return cached data with warning
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const result = await sentimentFetcher.getFearGreedIndex();
        
        expect(result.value).toBe(cachedValue);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Using stale cached Fear & Greed data')
        );
        
        consoleSpy.mockRestore();
      }
    ), { numRuns: 50 });
  });

  /**
   * Feature: contrarian-agent, Property 25: Rate limit backoff strategy
   * Validates: Requirements 6.5
   */
  test('Property 25: Rate limit backoff strategy - Exponential backoff', async () => {
    let callCount = 0;
    const delays: number[] = [];
    
    // Mock setTimeout to capture delays
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
      if (delay > 0) {
        delays.push(delay);
      }
      return originalSetTimeout(callback, 0); // Execute immediately for testing
    });

    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        } as Response);
      }
      
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [{
            value: '50',
            value_classification: 'Neutral',
            timestamp: '1234567890',
            time_until_update: '86400'
          }]
        })
      } as Response);
    });

    await sentimentFetcher.getFearGreedIndex();
    
    // Verify exponential backoff pattern
    expect(delays.length).toBeGreaterThan(0);
    if (delays.length > 1) {
      expect(delays[1]).toBeGreaterThan(delays[0]);
    }
    
    global.setTimeout = originalSetTimeout;
  });

  test('validateSentimentData - various input types', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.string(),
        fc.integer(),
        fc.record({
          value: fc.integer({ min: 0, max: 100 }),
          value_classification: fc.string()
        }),
        fc.record({
          sentiment: fc.integer({ min: 0, max: 100 })
        }),
        fc.record({
          invalidField: fc.string()
        })
      ),
      (input) => {
        const result = sentimentFetcher.validateSentimentData(input);
        
        if (input && typeof input === 'object') {
          if ('value' in input) {
            const value = typeof input.value === 'string' ? parseInt(input.value) : input.value;
            const expectedValid = typeof value === 'number' && value >= 0 && value <= 100;
            expect(result).toBe(expectedValid);
          } else if ('sentiment' in input) {
            const expectedValid = typeof input.sentiment === 'number' && 
                                input.sentiment >= 0 && 
                                input.sentiment <= 100;
            expect(result).toBe(expectedValid);
          } else {
            expect(result).toBe(false);
          }
        } else {
          expect(result).toBe(false);
        }
      }
    ), { numRuns: 100 });
  });
});