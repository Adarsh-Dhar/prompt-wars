/**
 * Property-based tests for main contrarian agent
 * Tests frontend protocol compliance, error handling, and agent state management
 */
import fc from 'fast-check';
import { ContrarianAgent } from '../agents/contrarian.js';
describe('Contrarian Agent Property Tests', () => {
    let agent;
    beforeEach(() => {
        // Create agent with test configuration
        agent = new ContrarianAgent({
            thresholds: {
                fearGreedSellThreshold: 60,
                extremeConditionThreshold: 80,
                bullishReinforcementThreshold: 70,
                bearishReinforcementThreshold: 30
            },
            personalitySettings: {
                smugnessLevel: 8,
                personalityMode: 'SMUG',
                catchphrases: []
            },
            cacheSettings: {
                refreshIntervalMinutes: 5,
                maxCacheAge: 300000
            }
        });
    });
    /**
     * Feature: contrarian-agent, Property 18: Frontend protocol compliance
     * Validates: Requirements 5.3
     */
    test('Property 18: Frontend protocol compliance - Established integration protocols', () => {
        fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), // token symbol
        fc.float({ min: 1, max: 100000 }), // price
        fc.integer({ min: 1000000, max: 9999999999 }), // volume
        fc.float({ min: -50, max: 50 }), // 24h change
        (tokenSymbol, price, volume, change24h) => {
            const marketData = {
                symbol: tokenSymbol.toUpperCase(),
                price: price,
                timestamp: new Date(),
                volume: volume,
                priceHistory: [price * 0.95, price * 0.98, price],
                change24h: change24h
            };
            // Test that agent follows established patterns
            expect(typeof agent.id).toBe('string');
            expect(agent.id.length).toBeGreaterThan(0);
            expect(agent.id).toContain('contrarian-agent');
            // Test interface compliance
            expect(typeof agent.initialize).toBe('function');
            expect(typeof agent.processMarketData).toBe('function');
            expect(typeof agent.generateSignal).toBe('function');
            expect(typeof agent.getPersonalityResponse).toBe('function');
            // Test contrarian-specific methods
            expect(typeof agent.fetchMarketSentiment).toBe('function');
            expect(typeof agent.generateContrarianSignal).toBe('function');
            expect(typeof agent.generateSmugRant).toBe('function');
            // Test output format compliance
            const output = agent.generateOutput();
            expect(typeof output.agentId).toBe('string');
            expect(output.timestamp instanceof Date).toBe(true);
            expect(['BUY', 'SELL'].includes(output.signalType)).toBe(true);
            expect(typeof output.confidence).toBe('number');
            expect(output.confidence >= 0 && output.confidence <= 100).toBe(true);
            // Test agent state structure
            const state = agent.getAgentState();
            expect(state.agentType).toBe('CONTRARIAN');
            expect(typeof state.smugnessLevel).toBe('number');
            expect(state.smugnessLevel >= 1 && state.smugnessLevel <= 10).toBe(true);
            expect(typeof state.totalContrarianCalls).toBe('number');
            expect(typeof state.correctCalls).toBe('number');
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 19: Error handling consistency
     * Validates: Requirements 5.4
     */
    test('Property 19: Error handling consistency - Existing error mechanisms', () => {
        fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 100 }), // context string
        (context) => {
            // Test personality response error handling
            const response = agent.getPersonalityResponse(context);
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
            // Test error state management
            expect(typeof agent.getLastError).toBe('function');
            expect(typeof agent.clearLastError).toBe('function');
            const lastError = agent.getLastError();
            expect(lastError === null || typeof lastError === 'object').toBe(true);
            if (lastError) {
                expect(typeof lastError.code).toBe('string');
                expect(typeof lastError.message).toBe('string');
                expect(typeof lastError.name).toBe('string');
            }
            // Test health check functionality
            expect(typeof agent.healthCheck).toBe('function');
            // Test cleanup functionality
            expect(typeof agent.cleanup).toBe('function');
        }), { numRuns: 100 });
    });
    test('Agent state management consistency', () => {
        fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), // token symbol
        fc.integer({ min: 1, max: 10 }), // smugness level
        fc.constantFrom('SMUG', 'SUPERIOR', 'CYNICAL'), // personality mode
        (tokenSymbol, smugnessLevel, personalityMode) => {
            const testAgent = new ContrarianAgent({
                tokenSymbol: tokenSymbol,
                personalitySettings: {
                    smugnessLevel: smugnessLevel,
                    personalityMode: personalityMode,
                    catchphrases: []
                }
            });
            const state = testAgent.getAgentState();
            const config = testAgent.getAgentConfig();
            // Verify state consistency
            expect(state.agentType).toBe('CONTRARIAN');
            expect(state.currentToken).toBe(tokenSymbol);
            expect(state.smugnessLevel).toBe(smugnessLevel);
            expect(state.personalityMode).toBe(personalityMode);
            expect(state.totalContrarianCalls).toBe(0); // Initial state
            expect(state.correctCalls).toBe(0); // Initial state
            // Verify configuration consistency
            expect(config.tokenSymbol).toBe(tokenSymbol);
            expect(config.personalitySettings.smugnessLevel).toBe(smugnessLevel);
            expect(config.personalitySettings.personalityMode).toBe(personalityMode);
            // Verify thresholds are within valid ranges
            expect(config.thresholds.fearGreedSellThreshold).toBeGreaterThanOrEqual(0);
            expect(config.thresholds.fearGreedSellThreshold).toBeLessThanOrEqual(100);
            expect(config.thresholds.extremeConditionThreshold).toBeGreaterThanOrEqual(0);
            expect(config.thresholds.extremeConditionThreshold).toBeLessThanOrEqual(100);
        }), { numRuns: 100 });
    });
    test('Performance tracking accuracy', () => {
        fc.assert(fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }), // array of correct/incorrect results
        async (results) => {
            const testAgent = new ContrarianAgent();
            // Simulate performance updates
            for (let i = 0; i < results.length; i++) {
                await testAgent.updatePerformance(`signal-${i}`, results[i]);
            }
            const stats = testAgent.getPerformanceStats();
            const expectedCorrect = results.filter(r => r).length;
            const expectedTotal = results.length;
            const expectedWinRate = expectedCorrect / expectedTotal;
            // Verify performance statistics
            expect(stats.agentStats.totalCalls).toBe(expectedTotal);
            expect(stats.agentStats.correctCalls).toBe(expectedCorrect);
            expect(Math.abs(stats.agentStats.winRate - expectedWinRate)).toBeLessThan(0.001);
            // Verify smugness level adjustments
            if (expectedCorrect > 0) {
                expect(stats.agentStats.smugnessLevel).toBeGreaterThan(8); // Should increase with correct calls
            }
            if (expectedCorrect < expectedTotal) {
                // If there were incorrect calls, smugness might be affected
                expect(stats.agentStats.smugnessLevel).toBeGreaterThanOrEqual(1);
                expect(stats.agentStats.smugnessLevel).toBeLessThanOrEqual(10);
            }
        }), { numRuns: 50 }); // Reduced runs due to async nature
    });
    test('Configuration validation and defaults', () => {
        fc.assert(fc.property(fc.record({
            fearGreedSellThreshold: fc.option(fc.integer({ min: 0, max: 100 })),
            extremeConditionThreshold: fc.option(fc.integer({ min: 0, max: 100 })),
            smugnessLevel: fc.option(fc.integer({ min: 1, max: 10 })),
            refreshIntervalMinutes: fc.option(fc.integer({ min: 1, max: 60 }))
        }), (partialConfig) => {
            const testAgent = new ContrarianAgent({
                thresholds: {
                    fearGreedSellThreshold: partialConfig.fearGreedSellThreshold || undefined,
                    extremeConditionThreshold: partialConfig.extremeConditionThreshold || undefined,
                    bullishReinforcementThreshold: 70,
                    bearishReinforcementThreshold: 30
                },
                personalitySettings: {
                    smugnessLevel: partialConfig.smugnessLevel || undefined,
                    personalityMode: 'SMUG',
                    catchphrases: []
                },
                cacheSettings: {
                    refreshIntervalMinutes: partialConfig.refreshIntervalMinutes || undefined,
                    maxCacheAge: 300000
                }
            });
            const config = testAgent.getAgentConfig();
            // Verify defaults are applied when values not provided
            expect(config.thresholds.fearGreedSellThreshold).toBe(partialConfig.fearGreedSellThreshold || 60);
            expect(config.thresholds.extremeConditionThreshold).toBe(partialConfig.extremeConditionThreshold || 80);
            expect(config.personalitySettings.smugnessLevel).toBe(partialConfig.smugnessLevel || 8);
            expect(config.cacheSettings.refreshIntervalMinutes).toBe(partialConfig.refreshIntervalMinutes || 5);
            // Verify all values are within valid ranges
            expect(config.thresholds.fearGreedSellThreshold).toBeGreaterThanOrEqual(0);
            expect(config.thresholds.fearGreedSellThreshold).toBeLessThanOrEqual(100);
            expect(config.personalitySettings.smugnessLevel).toBeGreaterThanOrEqual(1);
            expect(config.personalitySettings.smugnessLevel).toBeLessThanOrEqual(10);
        }), { numRuns: 100 });
    });
    test('Output format consistency across different states', () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), // confidence
        fc.constantFrom('BUY', 'SELL'), // signal type
        fc.integer({ min: 0, max: 100 }), // fear greed value
        fc.boolean(), // is extreme condition
        (confidence, signalType, fearGreedValue, isExtremeCondition) => {
            const mockSignal = {
                id: 'test-signal',
                agentId: agent.id,
                signalType: signalType,
                timestamp: new Date(),
                confidence: confidence,
                triggerConditions: {
                    fearGreedValue: fearGreedValue,
                    isExtremeCondition: isExtremeCondition
                },
                encryptedReasoning: 'encrypted-test',
                predictionOptions: {
                    knifeChatcher: 'Knife catcher option',
                    alphaGod: 'Alpha god option'
                }
            };
            const output = agent.generateOutput(mockSignal);
            // Verify output structure consistency
            expect(typeof output.agentId).toBe('string');
            expect(output.timestamp instanceof Date).toBe(true);
            expect(output.signalType).toBe(signalType);
            expect(output.confidence).toBe(confidence);
            // Verify agent state in output
            expect(typeof output.agentState.smugnessLevel).toBe('number');
            expect(typeof output.agentState.personalityMode).toBe('string');
            expect(typeof output.agentState.totalCalls).toBe('number');
            expect(typeof output.agentState.correctCalls).toBe('number');
            // Verify sentiment analysis in output
            expect(typeof output.sentimentAnalysis.fearGreedIndex).toBe('number');
            expect(typeof output.sentimentAnalysis.classification).toBe('string');
            expect(typeof output.sentimentAnalysis.isExtremeCondition).toBe('boolean');
            expect(output.sentimentAnalysis.isExtremeCondition).toBe(isExtremeCondition);
            // Verify prediction market structure
            expect(typeof output.predictionMarket.id).toBe('string');
            expect(Array.isArray(output.predictionMarket.options)).toBe(true);
            expect(output.predictionMarket.options).toHaveLength(2);
        }), { numRuns: 100 });
    });
    test('Health check comprehensive status reporting', async () => {
        const healthStatus = await agent.healthCheck();
        expect(typeof healthStatus.status).toBe('string');
        expect(['healthy', 'degraded', 'unhealthy'].includes(healthStatus.status)).toBe(true);
        expect(typeof healthStatus.details).toBe('object');
        // Verify all major components are checked
        expect(healthStatus.details.sentimentFetcher).toBeDefined();
        expect(healthStatus.details.signalGenerator).toBeDefined();
        expect(healthStatus.details.paymentService).toBeDefined();
        expect(healthStatus.details.marketIntegration).toBeDefined();
        // Verify component status structure
        Object.values(healthStatus.details).forEach((component) => {
            if (component && typeof component === 'object' && component.status) {
                expect(typeof component.status).toBe('string');
            }
        });
    });
});
