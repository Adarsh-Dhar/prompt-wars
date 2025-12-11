/**
 * Property-based tests for signal generator
 * Tests contrarian logic, confidence calculation, and extreme conditions
 */
import fc from 'fast-check';
import { SignalGenerator } from '../lib/signal-generator.js';
describe('Signal Generator Property Tests', () => {
    let signalGenerator;
    beforeEach(() => {
        signalGenerator = new SignalGenerator(60, 80, 70, 30);
    });
    /**
     * Feature: contrarian-agent, Property 6: Contrarian sell logic
     * Validates: Requirements 2.1
     */
    test('Property 6: Contrarian sell logic - Fear & Greed > 60 generates SELL', () => {
        fc.assert(fc.property(fc.integer({ min: 61, max: 100 }), // Fear & Greed values > 60
        fc.constantFrom('Greed', 'Extreme Greed'), // Classifications for high values
        (fearGreedValue, classification) => {
            const sentimentData = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: classification,
                    timestamp: new Date()
                }
            };
            const decision = signalGenerator.processContrarianLogic(sentimentData);
            // For any Fear & Greed value > 60, should generate SELL signal
            expect(decision.signalType).toBe('SELL');
            expect(decision.confidence).toBeGreaterThanOrEqual(50);
            expect(decision.confidence).toBeLessThanOrEqual(100);
            expect(typeof decision.reasoning).toBe('string');
            expect(decision.reasoning.length).toBeGreaterThan(0);
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 7: Contrarian buy logic
     * Validates: Requirements 2.2
     */
    test('Property 7: Contrarian buy logic - Fear & Greed ≤ 60 generates BUY', () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 60 }), // Fear & Greed values ≤ 60
        fc.constantFrom('Extreme Fear', 'Fear', 'Neutral'), // Classifications for low/neutral values
        (fearGreedValue, classification) => {
            const sentimentData = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: classification,
                    timestamp: new Date()
                }
            };
            const decision = signalGenerator.processContrarianLogic(sentimentData);
            // For any Fear & Greed value ≤ 60, should generate BUY signal
            expect(decision.signalType).toBe('BUY');
            expect(decision.confidence).toBeGreaterThanOrEqual(50);
            expect(decision.confidence).toBeLessThanOrEqual(100);
            expect(typeof decision.reasoning).toBe('string');
            expect(decision.reasoning.length).toBeGreaterThan(0);
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 8: Bullish sentiment reinforcement
     * Validates: Requirements 2.3
     */
    test('Property 8: Bullish sentiment reinforcement - >70% bullish reinforces SELL', () => {
        fc.assert(fc.property(fc.integer({ min: 61, max: 100 }), // Fear & Greed > 60 (SELL territory)
        fc.integer({ min: 71, max: 100 }), // Community bullish > 70%
        (fearGreedValue, bullishPercentage) => {
            const sentimentDataWithoutCommunity = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: 'Greed',
                    timestamp: new Date()
                }
            };
            const sentimentDataWithCommunity = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: 'Greed',
                    timestamp: new Date()
                },
                communityData: {
                    tokenSymbol: 'BTC',
                    sentiment: bullishPercentage,
                    bullishPercentage: bullishPercentage,
                    bearishPercentage: 100 - bullishPercentage,
                    source: 'coingecko'
                }
            };
            const decisionWithoutCommunity = signalGenerator.processContrarianLogic(sentimentDataWithoutCommunity);
            const decisionWithCommunity = signalGenerator.processContrarianLogic(sentimentDataWithCommunity);
            // Both should be SELL signals
            expect(decisionWithoutCommunity.signalType).toBe('SELL');
            expect(decisionWithCommunity.signalType).toBe('SELL');
            // Community bullishness should reinforce (increase confidence)
            expect(decisionWithCommunity.confidence).toBeGreaterThanOrEqual(decisionWithoutCommunity.confidence);
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 9: Bearish sentiment reinforcement
     * Validates: Requirements 2.4
     */
    test('Property 9: Bearish sentiment reinforcement - <30% bullish reinforces BUY', () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 60 }), // Fear & Greed ≤ 60 (BUY territory)
        fc.integer({ min: 0, max: 29 }), // Community bullish < 30%
        (fearGreedValue, bullishPercentage) => {
            const sentimentDataWithoutCommunity = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: 'Fear',
                    timestamp: new Date()
                }
            };
            const sentimentDataWithCommunity = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: 'Fear',
                    timestamp: new Date()
                },
                communityData: {
                    tokenSymbol: 'BTC',
                    sentiment: bullishPercentage,
                    bullishPercentage: bullishPercentage,
                    bearishPercentage: 100 - bullishPercentage,
                    source: 'coingecko'
                }
            };
            const decisionWithoutCommunity = signalGenerator.processContrarianLogic(sentimentDataWithoutCommunity);
            const decisionWithCommunity = signalGenerator.processContrarianLogic(sentimentDataWithCommunity);
            // Both should be BUY signals
            expect(decisionWithoutCommunity.signalType).toBe('BUY');
            expect(decisionWithCommunity.signalType).toBe('BUY');
            // Community bearishness should reinforce (increase confidence)
            expect(decisionWithCommunity.confidence).toBeGreaterThanOrEqual(decisionWithoutCommunity.confidence);
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 21: Extreme fear signal intensity
     * Validates: Requirements 6.1
     */
    test('Property 21: Extreme fear signal intensity - Fear > 80 triggers aggressive BUY', () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 19 }), // Extreme fear (< 20, which is > 80 on fear scale)
        (fearGreedValue) => {
            const sentimentData = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: 'Extreme Fear',
                    timestamp: new Date()
                }
            };
            const decision = signalGenerator.processContrarianLogic(sentimentData);
            // Should generate BUY signal with high confidence
            expect(decision.signalType).toBe('BUY');
            expect(decision.isExtremeCondition).toBe(true);
            expect(decision.confidence).toBeGreaterThan(70); // Should have high confidence in extreme conditions
            expect(decision.reasoning).toContain('Extreme');
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 22: Extreme greed signal intensity
     * Validates: Requirements 6.2
     */
    test('Property 22: Extreme greed signal intensity - Greed > 80 triggers aggressive SELL', () => {
        fc.assert(fc.property(fc.integer({ min: 81, max: 100 }), // Extreme greed (> 80)
        (fearGreedValue) => {
            const sentimentData = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: 'Extreme Greed',
                    timestamp: new Date()
                }
            };
            const decision = signalGenerator.processContrarianLogic(sentimentData);
            // Should generate SELL signal with high confidence
            expect(decision.signalType).toBe('SELL');
            expect(decision.isExtremeCondition).toBe(true);
            expect(decision.confidence).toBeGreaterThan(70); // Should have high confidence in extreme conditions
            expect(decision.reasoning).toContain('Extreme');
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 23: Confidence adjustment in extremes
     * Validates: Requirements 6.3
     */
    test('Property 23: Confidence adjustment in extremes - Extreme conditions boost confidence', () => {
        fc.assert(fc.property(fc.integer({ min: 30, max: 70 }), // Normal conditions
        fc.integer({ min: 0, max: 19 }).chain(normal => fc.constantFrom(normal, 100 - normal) // Extreme conditions (very low or very high)
        ), (normalValue, extremeValue) => {
            const normalSentiment = {
                fearGreedIndex: {
                    value: normalValue,
                    classification: 'Neutral',
                    timestamp: new Date()
                }
            };
            const extremeSentiment = {
                fearGreedIndex: {
                    value: extremeValue,
                    classification: extremeValue < 20 ? 'Extreme Fear' : 'Extreme Greed',
                    timestamp: new Date()
                }
            };
            const normalDecision = signalGenerator.processContrarianLogic(normalSentiment);
            const extremeDecision = signalGenerator.processContrarianLogic(extremeSentiment);
            // Extreme conditions should have higher confidence
            if (extremeDecision.isExtremeCondition && !normalDecision.isExtremeCondition) {
                expect(extremeDecision.confidence).toBeGreaterThan(normalDecision.confidence);
            }
        }), { numRuns: 100 });
    });
    /**
     * Feature: contrarian-agent, Property 10: JSON output format consistency
     * Validates: Requirements 2.5
     */
    test('Property 10: JSON output format consistency - Signal structure', () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), // Fear & Greed value
        fc.string({ minLength: 1, maxLength: 20 }), // Agent ID
        fc.option(fc.float({ min: 1, max: 100000 })), // Market price
        (fearGreedValue, agentId, marketPrice) => {
            const sentimentData = {
                fearGreedIndex: {
                    value: fearGreedValue,
                    classification: fearGreedValue > 60 ? 'Greed' : 'Fear',
                    timestamp: new Date()
                }
            };
            const signal = signalGenerator.generateContrarianSignal(sentimentData, agentId, marketPrice);
            // Verify JSON structure consistency
            expect(typeof signal.id).toBe('string');
            expect(signal.id.length).toBeGreaterThan(0);
            expect(signal.agentId).toBe(agentId);
            expect(['BUY', 'SELL'].includes(signal.signalType)).toBe(true);
            expect(signal.timestamp instanceof Date).toBe(true);
            expect(typeof signal.confidence).toBe('number');
            expect(signal.confidence >= 0 && signal.confidence <= 100).toBe(true);
            // Verify trigger conditions structure
            expect(typeof signal.triggerConditions).toBe('object');
            expect(signal.triggerConditions.fearGreedValue).toBe(fearGreedValue);
            expect(typeof signal.triggerConditions.isExtremeCondition).toBe('boolean');
            // Verify prediction options structure
            expect(typeof signal.predictionOptions).toBe('object');
            expect(typeof signal.predictionOptions.knifeChatcher).toBe('string');
            expect(typeof signal.predictionOptions.alphaGod).toBe('string');
            // Verify market price if provided
            if (marketPrice !== null && marketPrice !== undefined) {
                expect(signal.marketPrice).toBe(marketPrice);
            }
        }), { numRuns: 100 });
    });
    test('calculateConfidence - various input combinations', () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), // Fear & Greed value
        fc.option(fc.integer({ min: 0, max: 100 })), // Community sentiment
        (fearGreed, community) => {
            const confidence = signalGenerator.calculateConfidence(fearGreed, community);
            // Confidence should always be in valid range
            expect(confidence).toBeGreaterThanOrEqual(50);
            expect(confidence).toBeLessThanOrEqual(100);
            expect(typeof confidence).toBe('number');
            expect(Number.isFinite(confidence)).toBe(true);
        }), { numRuns: 100 });
    });
    test('determineExtremeConditions - boundary testing', () => {
        fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), (fearGreedValue) => {
            const isExtreme = signalGenerator.determineExtremeConditions(fearGreedValue);
            // Should be extreme if > 80 or < 20
            const expectedExtreme = fearGreedValue > 80 || fearGreedValue < 20;
            expect(isExtreme).toBe(expectedExtreme);
        }), { numRuns: 100 });
    });
    test('validateSignalParameters - input validation', () => {
        fc.assert(fc.property(fc.oneof(fc.integer({ min: 0, max: 100 }), fc.integer({ min: -100, max: -1 }), fc.integer({ min: 101, max: 200 }), fc.float(), fc.constant(null), fc.constant(undefined)), fc.option(fc.oneof(fc.integer({ min: 0, max: 100 }), fc.integer({ min: -100, max: -1 }), fc.integer({ min: 101, max: 200 }), fc.float())), (fearGreed, community) => {
            const isValid = signalGenerator.validateSignalParameters(fearGreed, community);
            // Should only be valid if fearGreed is number 0-100 and community (if provided) is number 0-100
            const fearGreedValid = typeof fearGreed === 'number' && fearGreed >= 0 && fearGreed <= 100;
            const communityValid = community === undefined ||
                (typeof community === 'number' && community >= 0 && community <= 100);
            expect(isValid).toBe(fearGreedValid && communityValid);
        }), { numRuns: 100 });
    });
});
