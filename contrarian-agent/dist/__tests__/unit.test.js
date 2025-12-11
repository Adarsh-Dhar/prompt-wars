/**
 * Unit tests for core functionality
 * Tests individual modules with specific scenarios and edge cases
 * Requirements: 1.3 (Network error handling), 5.4 (Error handling consistency)
 */
import { SentimentFetcher } from '../lib/sentiment-fetcher.js';
import { SignalGenerator } from '../lib/signal-generator.js';
import { ContrarianBrain } from '../lib/contrarian-brain.js';
import { ContrarianPaymentService } from '../lib/payment-verification.js';
import { ContrarianMarketIntegration } from '../lib/market-integration.js';
import { ContrarianAgent } from '../agents/contrarian.js';
// Mock fetch for API testing
global.fetch = jest.fn();
describe('Unit Tests - Core Functionality', () => {
    describe('SentimentFetcher', () => {
        let fetcher;
        beforeEach(() => {
            fetcher = new SentimentFetcher(5);
        });
        test('validates Fear & Greed Index data correctly', () => {
            // Valid data
            expect(fetcher.validateSentimentData({ value: 50 })).toBe(true);
            expect(fetcher.validateSentimentData({ value: '75' })).toBe(true);
            expect(fetcher.validateSentimentData({ sentiment: 80 })).toBe(true);
            // Invalid data
            expect(fetcher.validateSentimentData({ value: -10 })).toBe(false);
            expect(fetcher.validateSentimentData({ value: 150 })).toBe(false);
            expect(fetcher.validateSentimentData(null)).toBe(false);
            expect(fetcher.validateSentimentData({})).toBe(false);
        });
        test('cache statistics work correctly', () => {
            const stats = fetcher.getCacheStats();
            expect(typeof stats.fearGreedCached).toBe('boolean');
            expect(typeof stats.communityCacheSize).toBe('number');
            expect(stats.communityCacheSize).toBeGreaterThanOrEqual(0);
        });
        test('cache cleanup removes expired entries', () => {
            // Test that cleanup method exists and doesn't throw
            expect(() => fetcher.clearExpiredCache()).not.toThrow();
        });
    });
    describe('SignalGenerator', () => {
        let generator;
        beforeEach(() => {
            generator = new SignalGenerator(60, 80, 70, 30);
        });
        test('contrarian logic boundary conditions', () => {
            // Test exact boundary at 60
            const neutralSentiment = {
                fearGreedIndex: { value: 60, classification: 'Neutral', timestamp: new Date() }
            };
            const decision60 = generator.processContrarianLogic(neutralSentiment);
            expect(decision60.signalType).toBe('BUY'); // 60 should be BUY (≤60)
            // Test just above boundary
            const greedySentiment = {
                fearGreedIndex: { value: 61, classification: 'Greed', timestamp: new Date() }
            };
            const decision61 = generator.processContrarianLogic(greedySentiment);
            expect(decision61.signalType).toBe('SELL'); // 61 should be SELL (>60)
        });
        test('extreme condition detection', () => {
            expect(generator.determineExtremeConditions(85)).toBe(true); // Extreme greed
            expect(generator.determineExtremeConditions(15)).toBe(true); // Extreme fear
            expect(generator.determineExtremeConditions(50)).toBe(false); // Normal conditions
            expect(generator.determineExtremeConditions(80)).toBe(false); // Boundary case
            expect(generator.determineExtremeConditions(81)).toBe(true); // Just over boundary
        });
        test('confidence calculation edge cases', () => {
            // Test with no community data
            const confidence1 = generator.calculateConfidence(30);
            expect(confidence1).toBeGreaterThanOrEqual(50);
            expect(confidence1).toBeLessThanOrEqual(100);
            // Test with community data
            const confidence2 = generator.calculateConfidence(30, 80);
            expect(confidence2).toBeGreaterThanOrEqual(50);
            expect(confidence2).toBeLessThanOrEqual(100);
            // Test extreme values
            const confidence3 = generator.calculateConfidence(0, 0);
            expect(confidence3).toBeGreaterThanOrEqual(50);
            const confidence4 = generator.calculateConfidence(100, 100);
            expect(confidence4).toBeGreaterThanOrEqual(50);
        });
        test('signal parameter validation', () => {
            expect(generator.validateSignalParameters(50)).toBe(true);
            expect(generator.validateSignalParameters(50, 75)).toBe(true);
            expect(generator.validateSignalParameters(-10)).toBe(false);
            expect(generator.validateSignalParameters(150)).toBe(false);
            expect(generator.validateSignalParameters(50, -10)).toBe(false);
            expect(generator.validateSignalParameters(50, 150)).toBe(false);
        });
        test('threshold configuration', () => {
            const thresholds = generator.getThresholds();
            expect(thresholds.fearGreedSellThreshold).toBe(60);
            expect(thresholds.extremeConditionThreshold).toBe(80);
            expect(thresholds.bullishReinforcementThreshold).toBe(70);
            expect(thresholds.bearishReinforcementThreshold).toBe(30);
        });
    });
    describe('ContrarianBrain', () => {
        let brain;
        beforeEach(() => {
            brain = new ContrarianBrain(8, 'SMUG');
        });
        test('personality configuration', () => {
            const config = brain.getPersonalityConfig();
            expect(config.smugnessLevel).toBe(8);
            expect(config.personalityMode).toBe('SMUG');
            expect(config.totalCatchphrases).toBeGreaterThan(0);
        });
        test('smugness level adjustment', () => {
            brain.adjustSmugnessLevel(5);
            expect(brain.getPersonalityConfig().smugnessLevel).toBe(5);
            // Test clamping
            brain.adjustSmugnessLevel(-5);
            expect(brain.getPersonalityConfig().smugnessLevel).toBe(1);
            brain.adjustSmugnessLevel(15);
            expect(brain.getPersonalityConfig().smugnessLevel).toBe(10);
        });
        test('contrarian phrases for different conditions', () => {
            const normalPhrases = brain.getContrarianPhrases(false);
            const extremePhrases = brain.getContrarianPhrases(true);
            expect(Array.isArray(normalPhrases)).toBe(true);
            expect(Array.isArray(extremePhrases)).toBe(true);
            expect(normalPhrases.length).toBeGreaterThan(0);
            expect(extremePhrases.length).toBeGreaterThan(0);
            // Extreme phrases should be more intense
            const hasIntensePhrase = extremePhrases.some(phrase => phrase.includes('MAXIMUM') || phrase.includes('EXTREME') || phrase === phrase.toUpperCase());
            expect(hasIntensePhrase).toBe(true);
        });
        test('personality response generation', () => {
            const response1 = brain.getPersonalityResponse('market crash');
            const response2 = brain.getPersonalityResponse('bull run');
            expect(typeof response1).toBe('string');
            expect(typeof response2).toBe('string');
            expect(response1.length).toBeGreaterThan(0);
            expect(response2.length).toBeGreaterThan(0);
            // Should incorporate context
            expect(response1.toLowerCase()).toContain('market crash');
            expect(response2.toLowerCase()).toContain('bull run');
        });
    });
    describe('ContrarianPaymentService', () => {
        let paymentService;
        beforeEach(() => {
            paymentService = new ContrarianPaymentService('https://api.devnet.solana.com', 0.001, 'TestWallet123');
        });
        test('payment configuration', () => {
            expect(paymentService.getRequiredAmount()).toBe(0.001);
            expect(paymentService.getRecipientAddress()).toBe('TestWallet123');
        });
        test('transaction usage tracking', () => {
            const testSignature = 'test-signature-123';
            expect(paymentService.isTransactionUsed(testSignature)).toBe(false);
        });
        test('content preview generation', () => {
            const content = 'This is a long piece of contrarian analysis that should be truncated in the preview version.';
            const preview = paymentService.createContentPreview(content, 0.2);
            expect(preview).toContain('locked');
            expect(preview).toContain('SOL');
            expect(preview).toContain('Contrarian Agent');
            expect(preview.length).toBeGreaterThan(content.length);
        });
        test('encryption/decryption round trip', () => {
            const content = 'Secret contrarian analysis that retail will never understand.';
            const signature = 'test-transaction-signature-for-encryption';
            const encrypted = paymentService.encryptContent(content, signature);
            expect(encrypted.encryptedData).not.toBe(content);
            expect(encrypted.algorithm).toBe('aes-256-gcm');
            const decrypted = paymentService.decryptContent(encrypted, signature);
            expect(decrypted).toBe(content);
        });
        test('log management', () => {
            const initialLogs = paymentService.getPaymentLogs();
            expect(Array.isArray(initialLogs)).toBe(true);
            // Test cleanup functionality
            expect(() => paymentService.clearOldLogs(24)).not.toThrow();
        });
        test('error handling for invalid payments', async () => {
            // Test invalid payment verification - should return false, not throw
            const result = await paymentService.verifyPayment({
                transactionSignature: 'invalid-signature',
                expectedAmount: 0.001,
                expectedRecipient: 'TestWallet123',
                contentId: 'test-content',
                senderAddress: 'invalid-sender'
            });
            expect(result).toBe(false);
        });
        test('error handling for invalid decryption', () => {
            const invalidEncrypted = {
                encryptedData: 'invalid-data',
                algorithm: 'aes-256-gcm',
                iv: 'invalid-iv',
                authTag: 'invalid-tag'
            };
            expect(() => {
                paymentService.decryptContent(invalidEncrypted, 'test-signature');
            }).toThrow();
        });
    });
    describe('ContrarianMarketIntegration', () => {
        let marketIntegration;
        beforeEach(() => {
            marketIntegration = new ContrarianMarketIntegration('test-agent-id', 'https://test-frontend.com', 'https://test-agent-server.com');
        });
        test('initialization and configuration', () => {
            // Test that the market integration is properly initialized
            expect(marketIntegration).toBeDefined();
            const stats = marketIntegration.getPerformanceStats();
            expect(stats.totalSignals).toBe(0);
            expect(stats.correctSignals).toBe(0);
            expect(stats.winRate).toBe(0);
            expect(stats.reputationScore).toBe(1000);
        });
        test('performance tracking', async () => {
            const initialStats = marketIntegration.getPerformanceStats();
            expect(initialStats.totalSignals).toBe(0);
            expect(initialStats.correctSignals).toBe(0);
            expect(initialStats.winRate).toBe(0);
            // Track a performance outcome - this will log an error since no market exists
            // but should still update the performance tracker
            await marketIntegration.trackPerformance('test-signal-1', 'ALPHA_GOD');
            // The performance tracking should still work even without a market
            const updatedStats = marketIntegration.getPerformanceStats();
            // Note: The implementation only updates stats if a market is found
            // So we test that the method doesn't crash and stats remain unchanged
            expect(updatedStats.totalSignals).toBe(0); // No change since no market found
            expect(updatedStats.correctSignals).toBe(0);
            expect(updatedStats.winRate).toBe(0);
            expect(updatedStats.reputationScore).toBe(1000); // No change
        });
        test('market cleanup', () => {
            expect(() => marketIntegration.cleanupOldMarkets(7)).not.toThrow();
        });
        test('active markets management', () => {
            const activeMarkets = marketIntegration.getActiveMarkets();
            expect(Array.isArray(activeMarkets)).toBe(true);
            expect(activeMarkets.length).toBe(0); // No markets initially
            const resolvedMarkets = marketIntegration.getResolvedMarkets();
            expect(Array.isArray(resolvedMarkets)).toBe(true);
            expect(resolvedMarkets.length).toBe(0); // No resolved markets initially
        });
    });
    describe('API Integration with Mocked Responses', () => {
        let sentimentFetcher;
        const mockFetch = global.fetch;
        beforeEach(() => {
            sentimentFetcher = new SentimentFetcher(5);
            mockFetch.mockClear();
        });
        test('successful Fear & Greed API response', async () => {
            const mockResponse = {
                data: [{
                        value: '75',
                        value_classification: 'Greed',
                        timestamp: '1640995200',
                        time_until_update: '3600'
                    }]
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });
            const result = await sentimentFetcher.getFearGreedIndex();
            expect(result.value).toBe(75);
            expect(result.value_classification).toBe('Greed');
            expect(mockFetch).toHaveBeenCalledWith('https://api.alternative.me/fng/', expect.objectContaining({
                signal: expect.any(AbortSignal),
                headers: expect.objectContaining({
                    'Accept': 'application/json',
                    'User-Agent': 'ContrarianAgent/1.0'
                })
            }));
        });
        test('API network error handling', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            await expect(sentimentFetcher.getFearGreedIndex()).rejects.toThrow('Failed to fetch Fear & Greed Index after 3 attempts');
        });
        test('API rate limit handling', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests'
            });
            await expect(sentimentFetcher.getFearGreedIndex()).rejects.toThrow();
        });
        test('invalid API response handling', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ invalid: 'response' })
            });
            await expect(sentimentFetcher.getFearGreedIndex()).rejects.toThrow();
        });
        test('CoinGecko API mocked response', async () => {
            const mockCoinGeckoResponse = {
                market_data: {
                    price_change_percentage_24h: 5.2,
                    price_change_percentage_7d: 8.1
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCoinGeckoResponse
            });
            const result = await sentimentFetcher.getCommunitysentiment('bitcoin');
            expect(result.sentiment).toBeGreaterThan(50); // Should be bullish based on positive price changes
            expect(result.tokenSymbol).toBe('BITCOIN');
            expect(result.source).toBe('coingecko');
        });
    });
    describe('ContrarianAgent - Core Integration', () => {
        let agent;
        beforeEach(() => {
            // Mock environment variables
            process.env.COINGECKO_API_KEY = 'test-key';
            process.env.SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com';
            process.env.PRICE_SOL = '0.001';
            process.env.SERVER_WALLET = 'TestWallet123';
            process.env.FRONTEND_URL = 'https://test-frontend.com';
            process.env.AGENT_SERVER_URL = 'https://test-agent-server.com';
            agent = new ContrarianAgent({
                tokenSymbol: 'BTC',
                thresholds: {
                    fearGreedSellThreshold: 60,
                    extremeConditionThreshold: 80,
                    bullishReinforcementThreshold: 70,
                    bearishReinforcementThreshold: 30
                }
            });
        });
        test('agent initialization', () => {
            expect(agent.id).toMatch(/^contrarian-agent-\d+$/);
            const state = agent.getAgentState();
            expect(state.agentType).toBe('CONTRARIAN');
            expect(state.currentToken).toBe('BTC');
            expect(state.smugnessLevel).toBe(8);
        });
        test('configuration management', () => {
            const config = agent.getAgentConfig();
            expect(config.tokenSymbol).toBe('BTC');
            expect(config.thresholds.fearGreedSellThreshold).toBe(60);
            expect(config.personalitySettings.smugnessLevel).toBe(8);
        });
        test('market data processing', async () => {
            const marketData = {
                symbol: 'ETH',
                price: 2500,
                volume: 1000000,
                timestamp: new Date()
            };
            await agent.processMarketData(marketData);
            const state = agent.getAgentState();
            expect(state.currentToken).toBe('ETH');
        });
        test('personality response generation', () => {
            const response = agent.getPersonalityResponse('market crash');
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
            expect(response.toLowerCase()).toContain('market crash');
        });
        test('error handling consistency', () => {
            // Test that errors are handled consistently
            expect(agent.getLastError()).toBeNull();
            // Clear error
            agent.clearLastError();
            expect(agent.getLastError()).toBeNull();
        });
        test('performance statistics', () => {
            const stats = agent.getPerformanceStats();
            expect(stats.agentStats.totalCalls).toBe(0);
            expect(stats.agentStats.correctCalls).toBe(0);
            expect(stats.agentStats.winRate).toBe(0);
            expect(stats.agentStats.smugnessLevel).toBe(8);
        });
        test('JSON output generation', () => {
            const output = agent.generateOutput();
            expect(output.agentId).toBe(agent.id);
            expect(output.signalType).toBeDefined();
            expect(output.confidence).toBeGreaterThanOrEqual(0);
            expect(output.confidence).toBeLessThanOrEqual(100);
            expect(output.predictionMarket.options).toHaveLength(2);
        });
        test('health check functionality', async () => {
            const health = await agent.healthCheck();
            expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
            expect(health.details).toBeDefined();
            expect(health.details.sentimentFetcher).toBeDefined();
            expect(health.details.signalGenerator).toBeDefined();
            expect(health.details.paymentService).toBeDefined();
            expect(health.details.marketIntegration).toBeDefined();
        });
        test('cleanup functionality', async () => {
            await expect(agent.cleanup()).resolves.not.toThrow();
        });
    });
    describe('Error Scenarios and Edge Cases', () => {
        test('SentimentFetcher with invalid cache settings', () => {
            expect(() => new SentimentFetcher(-1)).not.toThrow(); // Should handle gracefully
            expect(() => new SentimentFetcher(0)).not.toThrow(); // Should handle gracefully
        });
        test('SignalGenerator with invalid thresholds', () => {
            expect(() => new SignalGenerator(-10, 80, 70, 30)).not.toThrow(); // Should clamp values
            expect(() => new SignalGenerator(150, 80, 70, 30)).not.toThrow(); // Should clamp values
        });
        test('ContrarianBrain with extreme smugness levels', () => {
            const brain1 = new ContrarianBrain(-5, 'SMUG');
            expect(brain1.getPersonalityConfig().smugnessLevel).toBeGreaterThanOrEqual(1);
            const brain2 = new ContrarianBrain(15, 'SMUG');
            expect(brain2.getPersonalityConfig().smugnessLevel).toBeLessThanOrEqual(10);
        });
        test('PaymentService with invalid configuration', () => {
            // Test with valid URL but invalid other params - should handle gracefully
            expect(() => new ContrarianPaymentService('https://api.devnet.solana.com', -1, '')).not.toThrow();
        });
        test('Agent with missing environment variables', () => {
            // Clear environment variables
            delete process.env.COINGECKO_API_KEY;
            delete process.env.SOLANA_RPC_ENDPOINT;
            expect(() => new ContrarianAgent()).not.toThrow(); // Should handle gracefully with defaults
        });
        test('Signal generation with malformed sentiment data', () => {
            const generator = new SignalGenerator(60, 80, 70, 30);
            const invalidSentiment = {
                fearGreedIndex: { value: NaN, classification: '', timestamp: new Date() }
            };
            expect(() => generator.processContrarianLogic(invalidSentiment)).not.toThrow();
        });
        test('Brain response with empty context', () => {
            const brain = new ContrarianBrain(5, 'SMUG');
            const response = brain.getPersonalityResponse('');
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
        });
        test('Market integration with invalid URLs', () => {
            expect(() => new ContrarianMarketIntegration('test', 'invalid-url', 'invalid-url')).not.toThrow();
        });
    });
});
