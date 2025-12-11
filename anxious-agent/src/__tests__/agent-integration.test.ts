/**
 * Integration tests for PaperHands Agent
 */

import { PaperHandsBrain } from '../lib/paper-hands-brain';
import { TechnicalAnalysisEngine } from '../lib/technical-analysis';
import { AgentState, MarketData, TechnicalIndicators } from '../types/index';

describe('PaperHands Agent Integration', () => {
  let brain: PaperHandsBrain;
  let techAnalysis: TechnicalAnalysisEngine;

  beforeEach(() => {
    brain = new PaperHandsBrain({
      anxietyLevel: 9,
      panicThresholds: {
        rsi: 60,
        profit: 1.5,
        volatility: 0.05,
        anxietyTrigger: 8
      }
    });

    techAnalysis = new TechnicalAnalysisEngine();
  });

  describe('Brain Decision Making', () => {
    it('should panic when RSI is high', () => {
      const mockMarketData: MarketData = {
        symbol: 'BTC',
        price: 45000,
        timestamp: new Date(),
        volume: 1000000,
        priceHistory: [44000, 44500, 45000],
        change24h: 2.3
      };

      const mockIndicators: TechnicalIndicators = {
        rsi: 65, // Above panic threshold of 60
        bollingerBands: { upper: 46000, middle: 45000, lower: 44000 },
        currentProfit: 0.5,
        volatilityScore: 0.03,
        priceChange24h: 2.3
      };

      const mockAgentState: AgentState = {
        id: 'test-agent',
        agentType: 'PAPER_HANDS',
        currentToken: 'BTC',
        entryPrice: 44000,
        currentPrice: 45000,
        position: 'LONG',
        anxietyLevel: 9,
        lastSignalTime: new Date(),
        totalPanicSells: 0,
        totalCorrectCalls: 0
      };

      const decision = brain.analyzeMarket(mockMarketData, mockIndicators, mockAgentState);

      expect(decision.shouldPanic).toBe(true);
      expect(decision.anxietyLevel).toBeGreaterThan(9);
      expect(decision.reason).toContain('RSI');
    });

    it('should stay calm when in cash position', () => {
      const mockMarketData: MarketData = {
        symbol: 'BTC',
        price: 45000,
        timestamp: new Date(),
        volume: 1000000,
        priceHistory: [44000, 44500, 45000],
        change24h: 2.3
      };

      const mockIndicators: TechnicalIndicators = {
        rsi: 65,
        bollingerBands: { upper: 46000, middle: 45000, lower: 44000 },
        currentProfit: 0,
        volatilityScore: 0.03,
        priceChange24h: 2.3
      };

      const mockAgentState: AgentState = {
        id: 'test-agent',
        agentType: 'PAPER_HANDS',
        currentToken: 'BTC',
        entryPrice: null,
        currentPrice: 45000,
        position: 'CASH', // Already in cash
        anxietyLevel: 7,
        lastSignalTime: new Date(),
        totalPanicSells: 0,
        totalCorrectCalls: 0
      };

      const decision = brain.analyzeMarket(mockMarketData, mockIndicators, mockAgentState);

      expect(decision.shouldPanic).toBe(false);
      expect(decision.action).toBe('STAY_CASH');
      expect(decision.reason).toContain('cash');
    });
  });

  describe('Technical Analysis', () => {
    it('should calculate RSI correctly', () => {
      const prices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 47.37, 47.23, 46.08, 47.03, 47.69, 47.54, 49.25];
      const rsi = techAnalysis.calculateRSI(prices);
      
      expect(rsi).toBeGreaterThan(0);
      expect(rsi).toBeLessThan(100);
      expect(typeof rsi).toBe('number');
    });

    it('should calculate Bollinger Bands', () => {
      const prices = Array.from({length: 25}, (_, i) => 45000 + (Math.random() - 0.5) * 1000);
      const bands = techAnalysis.calculateBollingerBands(prices);
      
      expect(bands.upper).toBeGreaterThan(bands.middle);
      expect(bands.middle).toBeGreaterThan(bands.lower);
      expect(typeof bands.upper).toBe('number');
      expect(typeof bands.middle).toBe('number');
      expect(typeof bands.lower).toBe('number');
    });

    it('should detect high volatility', () => {
      const highVolatilityData: MarketData = {
        symbol: 'BTC',
        price: 45000,
        timestamp: new Date(),
        volume: 1000000,
        priceHistory: [40000, 45000, 42000, 47000, 41000, 46000, 43000, 48000, 44000, 49000],
        change24h: 10
      };

      const isHighVol = techAnalysis.isVolatilityHigh(highVolatilityData);
      expect(isHighVol).toBe(true);
    });
  });

  describe('Fear Responses', () => {
    it('should generate anxious phrases', () => {
      const fearPhrase = brain.getRandomFearPhrase();
      
      expect(typeof fearPhrase).toBe('string');
      expect(fearPhrase.length).toBeGreaterThan(0);
    });

    it('should generate defensive responses to volatility', () => {
      const response = brain.generateDefensiveResponse(0.15);
      
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response).toContain('🚨');
    });
  });
});