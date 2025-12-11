/**
 * Property-based tests for contrarian brain
 * Tests personality consistency and extreme condition catchphrases
 */

import fc from 'fast-check';
import { ContrarianBrain } from '../lib/contrarian-brain.js';
import { ContrarianSignal, SentimentData } from '../types/index.js';

describe('Contrarian Brain Property Tests', () => {
  let contrarianBrain: ContrarianBrain;

  beforeEach(() => {
    contrarianBrain = new ContrarianBrain(8, 'SMUG');
  });

  /**
   * Feature: contrarian-agent, Property 13: Personality consistency
   * Validates: Requirements 3.3
   */
  test('Property 13: Personality consistency - Arrogant tone with contrarian phrases', () => {
    fc.assert(fc.property(
      fc.constantFrom('BUY', 'SELL'), // signal type
      fc.integer({ min: 0, max: 100 }), // fear greed value
      fc.constantFrom('Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'), // classification
      fc.integer({ min: 50, max: 100 }), // confidence
      fc.boolean(), // is extreme condition
      (signalType, fearGreedValue, classification, confidence, isExtremeCondition) => {
        const sentimentData: SentimentData = {
          fearGreedIndex: {
            value: fearGreedValue,
            classification: classification,
            timestamp: new Date()
          }
        };

        const signal: ContrarianSignal = {
          id: 'test-signal',
          agentId: 'test-agent',
          signalType: signalType,
          timestamp: new Date(),
          confidence: confidence,
          triggerConditions: {
            fearGreedValue: fearGreedValue,
            isExtremeCondition: isExtremeCondition
          },
          encryptedReasoning: '',
          predictionOptions: {
            knifeChatcher: 'Test knife catcher',
            alphaGod: 'Test alpha god'
          }
        };

        const rant = contrarianBrain.generateSmugRant(signal, sentimentData);
        
        // Verify personality consistency - should contain arrogant tone and contrarian phrases
        expect(typeof rant).toBe('string');
        expect(rant.length).toBeGreaterThan(100); // Should be substantial content
        
        // Check for required contrarian phrases (at least one should be present)
        const contrarianPhrases = ['sheep', 'retail', 'inverse', 'herd', 'smart money', 'weak hands', 'diamond hands', 'paper hands'];
        const hasContrarianPhrase = contrarianPhrases.some(phrase => 
          rant.toLowerCase().includes(phrase.toLowerCase())
        );
        expect(hasContrarianPhrase).toBe(true);
        
        // Check for arrogant/superior tone indicators
        const arrogantIndicators = ['while', 'thanks for', 'this is why', 'always', 'never learn', 'obvious', 'classic'];
        const hasArrogantTone = arrogantIndicators.some(indicator => 
          rant.toLowerCase().includes(indicator.toLowerCase())
        );
        expect(hasArrogantTone).toBe(true);
        
        // Should contain market analysis section
        expect(rant).toContain('MARKET ANALYSIS');
        expect(rant).toContain('Fear & Greed Index');
        expect(rant).toContain(`${fearGreedValue}/100`);
        
        // Should contain contrarian logic section
        expect(rant).toContain('CONTRARIAN LOGIC');
        
        // Should contain confidence level
        expect(rant).toContain(`${confidence}%`);
      }
    ), { numRuns: 100 });
  });

  /**
   * Feature: contrarian-agent, Property 14: Extreme condition catchphrases
   * Validates: Requirements 3.4
   */
  test('Property 14: Extreme condition catchphrases - Specific phrases for extreme conditions', () => {
    fc.assert(fc.property(
      fc.constantFrom('BUY', 'SELL'), // signal type
      fc.integer({ min: 0, max: 19 }).chain(low => 
        fc.constantFrom(low, 100 - low) // Extreme values (very low or very high)
      ),
      fc.integer({ min: 70, max: 100 }), // high confidence for extreme conditions
      (signalType, extremeFearGreedValue, confidence) => {
        const isExtremeCondition = extremeFearGreedValue > 80 || extremeFearGreedValue < 20;
        
        const sentimentData: SentimentData = {
          fearGreedIndex: {
            value: extremeFearGreedValue,
            classification: extremeFearGreedValue < 20 ? 'Extreme Fear' : 'Extreme Greed',
            timestamp: new Date()
          }
        };

        const signal: ContrarianSignal = {
          id: 'test-signal',
          agentId: 'test-agent',
          signalType: signalType,
          timestamp: new Date(),
          confidence: confidence,
          triggerConditions: {
            fearGreedValue: extremeFearGreedValue,
            isExtremeCondition: isExtremeCondition
          },
          encryptedReasoning: '',
          predictionOptions: {
            knifeChatcher: 'Test knife catcher',
            alphaGod: 'Test alpha god'
          }
        };

        const rant = contrarianBrain.generateSmugRant(signal, sentimentData);
        
        // For extreme conditions, should include specific extreme catchphrases
        if (isExtremeCondition) {
          const extremePhrases = [
            'MAXIMUM PAIN', 'PEAK EUPHORIA', 'BLOOD IN THE STREETS', 
            'CAPITULATION', 'GENERATIONAL', 'EXTREME', 'TEXTBOOK'
          ];
          
          const hasExtremePhrase = extremePhrases.some(phrase => 
            rant.toUpperCase().includes(phrase)
          );
          expect(hasExtremePhrase).toBe(true);
          
          // Should have more intense language for extreme conditions
          expect(rant).toMatch(/🚨|🩸|🔥/); // Should contain intense emojis
          expect(rant.toUpperCase()).toContain('EXTREME');
        }
        
        // Should always contain the classification
        expect(rant).toContain(sentimentData.fearGreedIndex.classification);
      }
    ), { numRuns: 100 });
  });

  test('getPersonalityResponse - consistent personality across contexts', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      (context) => {
        const response = contrarianBrain.getPersonalityResponse(context);
        
        // Should return a string response
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
        
        // Should incorporate the context
        expect(response.toLowerCase()).toContain(context.toLowerCase());
        
        // Should maintain contrarian/smug tone
        const personalityIndicators = ['retail', 'sheep', 'contrarian', 'smart money', 'obvious'];
        const hasPersonality = personalityIndicators.some(indicator => 
          response.toLowerCase().includes(indicator)
        );
        expect(hasPersonality).toBe(true);
      }
    ), { numRuns: 100 });
  });

  test('getContrarianPhrases - different phrases for extreme vs normal conditions', () => {
    fc.assert(fc.property(
      fc.boolean(),
      (isExtreme) => {
        const phrases = contrarianBrain.getContrarianPhrases(isExtreme);
        
        // Should return an array of phrases
        expect(Array.isArray(phrases)).toBe(true);
        expect(phrases.length).toBeGreaterThan(0);
        
        // All phrases should be strings
        phrases.forEach(phrase => {
          expect(typeof phrase).toBe('string');
          expect(phrase.length).toBeGreaterThan(0);
        });
        
        // Extreme phrases should be more intense (contain caps or extreme words)
        if (isExtreme) {
          const hasIntensePhrases = phrases.some(phrase => 
            phrase.includes('MAXIMUM') || 
            phrase.includes('EXTREME') || 
            phrase.includes('PEAK') ||
            phrase === phrase.toUpperCase()
          );
          expect(hasIntensePhrases).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  test('Different personality modes generate different commentary styles', () => {
    const modes: ('SMUG' | 'SUPERIOR' | 'CYNICAL')[] = ['SMUG', 'SUPERIOR', 'CYNICAL'];
    
    fc.assert(fc.property(
      fc.constantFrom(...modes),
      fc.constantFrom('BUY', 'SELL'),
      fc.integer({ min: 0, max: 100 }),
      (personalityMode, signalType, fearGreedValue) => {
        const brain = new ContrarianBrain(8, personalityMode);
        
        const sentimentData: SentimentData = {
          fearGreedIndex: {
            value: fearGreedValue,
            classification: 'Neutral',
            timestamp: new Date()
          }
        };

        const signal: ContrarianSignal = {
          id: 'test-signal',
          agentId: 'test-agent',
          signalType: signalType,
          timestamp: new Date(),
          confidence: 75,
          triggerConditions: {
            fearGreedValue: fearGreedValue,
            isExtremeCondition: false
          },
          encryptedReasoning: '',
          predictionOptions: {
            knifeChatcher: 'Test knife catcher',
            alphaGod: 'Test alpha god'
          }
        };

        const rant = brain.generateSmugRant(signal, sentimentData);
        
        // Each personality mode should have distinct characteristics
        switch (personalityMode) {
          case 'SUPERIOR':
            const superiorWords = ['sophisticated', 'intellectual', 'advanced', 'superior', 'disciplined'];
            const hasSuperiorTone = superiorWords.some(word => 
              rant.toLowerCase().includes(word)
            );
            expect(hasSuperiorTone).toBe(true);
            break;
            
          case 'CYNICAL':
            const cynicalWords = ['another', 'never learn', 'same', 'cycle', 'game'];
            const hasCynicalTone = cynicalWords.some(word => 
              rant.toLowerCase().includes(word)
            );
            expect(hasCynicalTone).toBe(true);
            break;
            
          case 'SMUG':
            const smugWords = ['while', 'thanks', 'i\'ll be', 'as usual', 'this is why'];
            const hasSmugTone = smugWords.some(word => 
              rant.toLowerCase().includes(word)
            );
            expect(hasSmugTone).toBe(true);
            break;
        }
        
        // All should maintain contrarian core
        expect(rant).toContain('CONTRARIAN');
      }
    ), { numRuns: 50 }); // Reduced runs due to complexity
  });

  test('Smugness level affects personality configuration', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 10 }),
      (smugnessLevel) => {
        const brain = new ContrarianBrain(smugnessLevel, 'SMUG');
        const config = brain.getPersonalityConfig();
        
        expect(config.smugnessLevel).toBe(smugnessLevel);
        expect(config.personalityMode).toBe('SMUG');
        expect(config.totalCatchphrases).toBeGreaterThan(0);
        
        // Test dynamic adjustment
        const newLevel = Math.max(1, Math.min(10, smugnessLevel + 2));
        brain.adjustSmugnessLevel(newLevel);
        
        const updatedConfig = brain.getPersonalityConfig();
        expect(updatedConfig.smugnessLevel).toBe(newLevel);
      }
    ), { numRuns: 100 });
  });

  test('Community sentiment affects rant content', () => {
    fc.assert(fc.property(
      fc.constantFrom('BUY', 'SELL'),
      fc.integer({ min: 0, max: 100 }), // community bullish percentage
      fc.integer({ min: 0, max: 100 }), // fear greed value
      (signalType, communityBullish, fearGreedValue) => {
        const sentimentData: SentimentData = {
          fearGreedIndex: {
            value: fearGreedValue,
            classification: 'Neutral',
            timestamp: new Date()
          },
          communityData: {
            tokenSymbol: 'BTC',
            sentiment: communityBullish,
            bullishPercentage: communityBullish,
            bearishPercentage: 100 - communityBullish,
            source: 'coingecko'
          }
        };

        const signal: ContrarianSignal = {
          id: 'test-signal',
          agentId: 'test-agent',
          signalType: signalType,
          timestamp: new Date(),
          confidence: 75,
          triggerConditions: {
            fearGreedValue: fearGreedValue,
            communityBullish: communityBullish,
            isExtremeCondition: false
          },
          encryptedReasoning: '',
          predictionOptions: {
            knifeChatcher: 'Test knife catcher',
            alphaGod: 'Test alpha god'
          }
        };

        const rant = contrarianBrain.generateSmugRant(signal, sentimentData);
        
        // Should include community sentiment data
        expect(rant).toContain('Community Sentiment');
        expect(rant).toContain(`${communityBullish}%`);
        
        // Should have appropriate commentary based on signal type and community sentiment
        if (signalType === 'SELL' && communityBullish > 70) {
          expect(rant.toLowerCase()).toMatch(/fade|perfect.*setup|bullish/);
        } else if (signalType === 'BUY' && communityBullish < 30) {
          expect(rant.toLowerCase()).toMatch(/opportunity|contrarian/);
        }
      }
    ), { numRuns: 100 });
  });
});