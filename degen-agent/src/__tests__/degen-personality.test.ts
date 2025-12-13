/**
 * Property-based tests for Degen personality consistency
 * Feature: rekto-rich-agent, Property 8: Degen personality consistency
 * Validates: Requirements 4.1
 */

import * as fc from 'fast-check';
import { ChainOfThoughtGenerator } from '../lib/chain-of-thought-generator';
import { TokenAnalyzer } from '../lib/token-analysis';
import { TradingDecision } from '../types';
import { generateDegenPrompt, DEGEN_SYSTEM_PROMPT } from '../lib/degen_brain';

describe('Degen Personality Consistency Property Tests', () => {
  
  const tokenAnalyzer = new TokenAnalyzer();
  const cotGenerator = new ChainOfThoughtGenerator(); // No OpenAI key for testing

  // Generators for property-based testing
  const tradingDecisionGenerator = fc.record({
    id: fc.uuid(),
    tokenSymbol: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z]+$/.test(s)),
    decision: fc.constantFrom('LONG', 'SHORT'),
    confidence: fc.integer({ min: 0, max: 100 }),
    timestamp: fc.date(),
    currentPrice: fc.float({ min: Math.fround(0.000001), max: Math.fround(1000000) }),
    chainOfThought: fc.option(fc.string({ minLength: 10 })),
    isUnlocked: fc.boolean(),
    marketId: fc.option(fc.uuid())
  });

  const tokenMetricsGenerator = fc.record({
    symbol: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z]+$/.test(s)),
    price: fc.float({ min: Math.fround(0.000001), max: Math.fround(1000000) }),
    volume24h: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(1000000000) })),
    marketCap: fc.option(fc.float({ min: Math.fround(1000), max: Math.fround(1000000000000) })),
    priceChange24h: fc.option(fc.float({ min: Math.fround(-99), max: Math.fround(1000) })),
    socialSentiment: fc.option(fc.constantFrom('BULLISH', 'BEARISH', 'NEUTRAL')),
    hypeScore: fc.option(fc.integer({ min: 1, max: 100 })),
    liquidityScore: fc.option(fc.integer({ min: 1, max: 100 })),
    memeScore: fc.option(fc.integer({ min: 1, max: 100 }))
  });

  /**
   * Property 8: Degen personality consistency
   * For any generated trading commentary, the content should include required crypto slang terminology
   * ("WAGMI", "Rekt", "Ape in", "Diamond hands")
   */
  test('Property 8: Degen personality consistency - Chain of Thought contains required slang', async () => {
    await fc.assert(
      fc.asyncProperty(
        tradingDecisionGenerator,
        tokenMetricsGenerator,
        async (decision: TradingDecision, metrics) => {
          // Generate Chain of Thought using rule-based generator (no AI dependency)
          const chainOfThought = await cotGenerator.generateChainOfThought(decision, metrics);
          
          // Combine all text content for analysis
          const allContent = [
            chainOfThought.reasoning,
            chainOfThought.marketAnalysis,
            chainOfThought.riskAssessment,
            chainOfThought.degenCommentary
          ].join(' ').toLowerCase();
          
          // Check for required crypto slang terms (case insensitive)
          const requiredSlang = [
            'wagmi',
            'rekt',
            'ape in',
            'diamond hands',
            'degen',
            'moon',
            'pump'
          ];
          
          // At least 2 of the required slang terms should be present
          const foundSlang = requiredSlang.filter(slang => 
            allContent.includes(slang.toLowerCase())
          );
          
          expect(foundSlang.length).toBeGreaterThanOrEqual(2);
          
          // Verify degen energy indicators are present
          const degenIndicators = [
            'hype',
            'vibes',
            'spicy',
            'insane',
            'crazy',
            'maximum',
            'ultra'
          ];
          
          const foundIndicators = degenIndicators.filter(indicator =>
            allContent.includes(indicator.toLowerCase())
          );
          
          expect(foundIndicators.length).toBeGreaterThanOrEqual(1);
          
          return true;
        }
      ),
      { numRuns: 50 } // Reduced runs since this is async
    );
  });

  test('Degen system prompt contains required slang terms', () => {
    const prompt = DEGEN_SYSTEM_PROMPT.toLowerCase();
    
    // Verify all required slang terms are defined in the system prompt
    const requiredSlang = [
      'wagmi',
      'rekt', 
      'ape in',
      'diamond hands',
      'paper hands',
      'moon',
      'pump',
      'dump',
      'hodl',
      'fud',
      'fomo',
      'degen'
    ];
    
    requiredSlang.forEach(slang => {
      expect(prompt).toContain(slang.toLowerCase());
    });
  });

  test('Generated degen prompts maintain personality consistency', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z]+$/.test(s)),
        fc.float({ min: Math.fround(0.000001), max: Math.fround(1000000) }),
        (tokenSymbol: string, currentPrice: number) => {
          const prompt = generateDegenPrompt(tokenSymbol, currentPrice);
          const lowerPrompt = prompt.toLowerCase();
          
          // Verify degen personality elements are present
          expect(lowerPrompt).toContain('degen');
          expect(lowerPrompt).toContain('wagmi');
          expect(lowerPrompt).toContain('diamond hands');
          
          // Verify token and price are included
          expect(prompt).toContain(tokenSymbol);
          expect(prompt).toContain(currentPrice.toString());
          
          // Verify energy level indicators
          const energyIndicators = ['extreme', 'maximum', 'high', 'chaotic', 'yolo'];
          const hasEnergyIndicator = energyIndicators.some(indicator => 
            lowerPrompt.includes(indicator)
          );
          expect(hasEnergyIndicator).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Token analysis generates degen insights with appropriate slang', () => {
    fc.assert(
      fc.property(
        tokenMetricsGenerator,
        (metrics) => {
          const analysis = tokenAnalyzer.analyzeToken(metrics);
          const insights = tokenAnalyzer.generateDegenInsights(analysis, metrics);
          
          if (insights.length > 0) {
            const allInsights = insights.join(' ').toLowerCase();
            
            // Should contain degen-appropriate language
            const degenTerms = [
              'hype',
              'rekt',
              'moon',
              'pump',
              'dump',
              'degen',
              'diamond',
              'risk',
              'insane',
              'crazy',
              'spicy'
            ];
            
            const foundTerms = degenTerms.filter(term => 
              allInsights.includes(term)
            );
            
            expect(foundTerms.length).toBeGreaterThanOrEqual(1);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Degen rating system maintains consistency', () => {
    fc.assert(
      fc.property(
        tokenMetricsGenerator,
        (metrics) => {
          const analysis = tokenAnalyzer.analyzeToken(metrics);
          
          // Verify degen rating is one of expected values
          expect(['SAFE', 'RISKY', 'DEGEN', 'ULTRA_DEGEN']).toContain(analysis.degenRating);
          
          // Verify scores are in valid ranges
          expect(analysis.overallHype).toBeGreaterThanOrEqual(0);
          expect(analysis.overallHype).toBeLessThanOrEqual(100);
          expect(analysis.sentimentScore).toBeGreaterThanOrEqual(-100);
          expect(analysis.sentimentScore).toBeLessThanOrEqual(100);
          expect(analysis.momentumScore).toBeGreaterThanOrEqual(0);
          expect(analysis.momentumScore).toBeLessThanOrEqual(100);
          
          // Verify liquidity risk is valid
          expect(['LOW', 'MEDIUM', 'HIGH']).toContain(analysis.liquidityRisk);
          
          // Verify meme viability is valid
          expect(['WEAK', 'MODERATE', 'STRONG']).toContain(analysis.memeViability);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});