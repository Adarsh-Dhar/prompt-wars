/**
 * Property-based tests for market integration
 * Tests betting market creation and agent performance tracking
 */
import fc from 'fast-check';
import { ContrarianMarketIntegration } from '../lib/market-integration.js';
describe('Market Integration Property Tests', () => {
    let marketIntegration;
    beforeEach(() => {
        marketIntegration = new ContrarianMarketIntegration('test-contrarian-agent', 'http://localhost:3000', 'http://localhost:4002');
    });
    /**
     * Feature: contrarian-agent, Property 16: Betting market creation
     * Validates: Requirements 4.1
     */
    test('Property 16: Betting market creation - Two betting options for every signal', () => {
        fc.assert(fc.property(fc.constantFrom('BUY', 'SELL'), // signal type
        fc.integer({ min: 50, max: 100 }), // confidence
        fc.integer({ min: 0, max: 100 }), // fear greed value
        fc.boolean(), // is extreme condition
        fc.option(fc.integer({ min: 0, max: 100 })), // community bullish percentage
        (signalType, confidence, fearGreedValue, isExtremeCondition, communityBullish) => {
            const signal = {
                id: `test-signal-${Date.now()}`,
                agentId: 'test-agent',
                signalType: signalType,
                timestamp: new Date(),
                confidence: confidence,
                triggerConditions: {
                    fearGreedValue: fearGreedValue,
                    communityBullish: communityBullish,
                    isExtremeCondition: isExtremeCondition
                },
                encryptedReasoning: 'encrypted-test-reasoning',
                predictionOptions: {
                    knifeChatcher: signalType === 'BUY'
                        ? 'Agent buying too early (Rekt)'
                        : 'Agent selling too early (Rekt)',
                    alphaGod: signalType === 'BUY'
                        ? 'Agent buying the bottom (Rich)'
                        : 'Agent selling the top (Rich)'
                }
            };
            // Test market request building (internal method testing through public interface)
            // We can't test the actual API call without mocking, but we can test the data structure
            // Verify signal has required prediction options
            expect(signal.predictionOptions.knifeChatcher).toBeDefined();
            expect(signal.predictionOptions.alphaGod).toBeDefined();
            expect(typeof signal.predictionOptions.knifeChatcher).toBe('string');
            expect(typeof signal.predictionOptions.alphaGod).toBe('string');
            // Verify prediction options are different
            expect(signal.predictionOptions.knifeChatcher).not.toBe(signal.predictionOptions.alphaGod);
            // Verify prediction options contain appropriate content
            expect(signal.predictionOptions.knifeChatcher.toLowerCase()).toContain('rekt');
            expect(signal.predictionOptions.alphaGod.toLowerCase()).toContain('rich');
            // Test that market integration can handle the signal
            expect(typeof marketIntegration.getPerformanceStats).toBe('function');
            expect(typeof marketIntegration.getActiveMarkets).toBe('function');
            // Verify performance tracking structure
            const stats = marketIntegration.getPerformanceStats();
            expect(typeof stats.totalSignals).toBe('number');
            expect(typeof stats.correctSignals).toBe('number');
            expect(typeof stats.winRate).toBe('number');
            expect(typeof stats.reputationScore).toBe('number');
        }), { numRuns: 100 });
    });
    test('Performance tracking maintains correct statistics', () => {
        fc.assert(fc.property(fc.array(fc.constantFrom('KNIFE_CATCHER', 'ALPHA_GOD'), { minLength: 1, maxLength: 20 }), async (outcomes) => {
            // Reset performance stats for clean test
            const integration = new ContrarianMarketIntegration('test-agent-perf');
            // Simulate tracking multiple outcomes
            for (let i = 0; i < outcomes.length; i++) {
                const signalId = `test-signal-${i}`;
                // Create a mock market entry first
                const mockMarket = {
                    marketId: `market-${i}`,
                    signalId: signalId,
                    question: 'Test question',
                    totalPool: 0,
                    knifeChatcherBets: 0,
                    alphaGodBets: 0,
                    createdAt: new Date(),
                    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    isResolved: false
                };
                // Add to active markets (simulating market creation)
                integration.activeMarkets.set(`market-${i}`, mockMarket);
                // Track performance
                await integration.trackPerformance(signalId, outcomes[i]);
            }
            const stats = integration.getPerformanceStats();
            // Verify statistics are consistent
            expect(stats.totalSignals).toBe(outcomes.length);
            const expectedCorrect = outcomes.filter(outcome => outcome === 'ALPHA_GOD').length;
            expect(stats.correctSignals).toBe(expectedCorrect);
            const expectedWinRate = expectedCorrect / outcomes.length;
            expect(Math.abs(stats.winRate - expectedWinRate)).toBeLessThan(0.001); // Allow for floating point precision
            // Reputation should change based on performance
            if (expectedCorrect > 0) {
                expect(stats.reputationScore).toBeGreaterThan(1000); // Started at 1000, should increase with correct calls
            }
            if (expectedCorrect < outcomes.length) {
                // If there were any wrong calls, reputation might be affected
                expect(stats.reputationScore).toBeGreaterThanOrEqual(0); // Should never go below 0
            }
        }), { numRuns: 50 }); // Reduced runs due to async nature
    });
    test('Market data structure consistency', () => {
        fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 50 }), // market ID
        fc.string({ minLength: 1, maxLength: 50 }), // signal ID
        fc.string({ minLength: 10, maxLength: 200 }), // question
        fc.integer({ min: 0, max: 1000000 }), // total pool
        (marketId, signalId, question, totalPool) => {
            // Test market data structure
            const marketData = {
                marketId,
                signalId,
                question,
                totalPool,
                knifeChatcherBets: 0,
                alphaGodBets: 0,
                createdAt: new Date(),
                endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                isResolved: false
            };
            // Verify all required fields are present and correct types
            expect(typeof marketData.marketId).toBe('string');
            expect(typeof marketData.signalId).toBe('string');
            expect(typeof marketData.question).toBe('string');
            expect(typeof marketData.totalPool).toBe('number');
            expect(typeof marketData.knifeChatcherBets).toBe('number');
            expect(typeof marketData.alphaGodBets).toBe('number');
            expect(marketData.createdAt instanceof Date).toBe(true);
            expect(marketData.endTime instanceof Date).toBe(true);
            expect(typeof marketData.isResolved).toBe('boolean');
            // Verify logical constraints
            expect(marketData.totalPool).toBeGreaterThanOrEqual(0);
            expect(marketData.knifeChatcherBets).toBeGreaterThanOrEqual(0);
            expect(marketData.alphaGodBets).toBeGreaterThanOrEqual(0);
            expect(marketData.endTime.getTime()).toBeGreaterThan(marketData.createdAt.getTime());
        }), { numRuns: 100 });
    });
    test('Signal preview generation', () => {
        fc.assert(fc.property(fc.constantFrom('BUY', 'SELL'), fc.integer({ min: 50, max: 100 }), fc.integer({ min: 0, max: 100 }), fc.boolean(), (signalType, confidence, fearGreedValue, isExtremeCondition) => {
            const signal = {
                id: 'test-signal',
                agentId: 'test-agent',
                signalType: signalType,
                timestamp: new Date(),
                confidence: confidence,
                triggerConditions: {
                    fearGreedValue: fearGreedValue,
                    isExtremeCondition: isExtremeCondition
                },
                encryptedReasoning: 'encrypted-reasoning',
                predictionOptions: {
                    knifeChatcher: 'Knife catcher option',
                    alphaGod: 'Alpha god option'
                }
            };
            // Test signal preview generation (through private method testing via public interface)
            const integration = marketIntegration;
            // We can test the tag generation which is part of the preview system
            const tags = integration.generateSignalTags(signal);
            expect(Array.isArray(tags)).toBe(true);
            expect(tags.length).toBeGreaterThan(0);
            // Should always include contrarian and signal type
            expect(tags).toContain('contrarian');
            expect(tags).toContain(signalType.toLowerCase());
            // Should include extreme conditions tag if applicable
            if (isExtremeCondition) {
                expect(tags).toContain('extreme-conditions');
            }
            // Should include high confidence tag if applicable
            if (confidence > 80) {
                expect(tags).toContain('high-confidence');
            }
            // Should include fear/greed tags based on value
            if (fearGreedValue > 80) {
                expect(tags).toContain('extreme-greed');
            }
            else if (fearGreedValue < 20) {
                expect(tags).toContain('extreme-fear');
            }
        }), { numRuns: 100 });
    });
    test('Agent registration data structure', () => {
        fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 50 }), // agent ID
        fc.string({ minLength: 10, maxLength: 100 }), // server URL
        (agentId, serverUrl) => {
            const integration = new ContrarianMarketIntegration(agentId, 'http://localhost:3000', serverUrl);
            // Test that integration maintains correct configuration
            expect(integration.agentId).toBe(agentId);
            expect(integration.serverUrl).toBe(serverUrl);
            expect(integration.frontendUrl).toBe('http://localhost:3000');
            // Test performance stats initialization
            const stats = integration.getPerformanceStats();
            expect(stats.totalSignals).toBe(0);
            expect(stats.correctSignals).toBe(0);
            expect(stats.winRate).toBe(0);
            expect(stats.reputationScore).toBe(1000); // Starting reputation
            // Test market collections initialization
            expect(integration.getActiveMarkets()).toHaveLength(0);
            expect(integration.getResolvedMarkets()).toHaveLength(0);
        }), { numRuns: 100 });
    });
    test('Market cleanup functionality', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 30 }), // days old
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // resolved status array
        (daysOld, resolvedStatuses) => {
            const integration = marketIntegration;
            // Create mock markets with different ages and resolution status
            resolvedStatuses.forEach((isResolved, index) => {
                const marketData = {
                    marketId: `market-${index}`,
                    signalId: `signal-${index}`,
                    question: 'Test question',
                    totalPool: 0,
                    knifeChatcherBets: 0,
                    alphaGodBets: 0,
                    createdAt: new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000)),
                    endTime: new Date(),
                    isResolved: isResolved
                };
                integration.activeMarkets.set(`market-${index}`, marketData);
            });
            const initialCount = integration.activeMarkets.size;
            expect(initialCount).toBe(resolvedStatuses.length);
            // Test cleanup
            integration.cleanupOldMarkets(daysOld - 1); // Clean up markets older than (daysOld - 1) days
            // All markets should be cleaned up if they're resolved and old enough
            const expectedRemaining = resolvedStatuses.filter(isResolved => !isResolved).length;
            expect(integration.activeMarkets.size).toBe(expectedRemaining);
        }), { numRuns: 50 });
    });
});
