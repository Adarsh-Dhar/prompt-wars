/**
 * Property-based tests for the Degen Trading Simulator
 * 
 * **Feature: degen-trading-simulator**
 * 
 * These tests verify the correctness properties defined in the design document
 * using property-based testing with fast-check.
 */

import fc from 'fast-check';
import {
  simulateTrade,
  generateSyntheticSeries,
  calculatePnL,
  DEFAULT_CONFIG
} from '../trading-simulator.js';

describe('Degen Trading Simulator - Property Tests', () => {
  
  /**
   * **Feature: degen-trading-simulator, Property 1: Position Creation Consistency**
   * **Validates: Requirements 1.1, 1.2, 1.3**
   * 
   * For any valid trading decision (LONG/SHORT) with specified capital and sizing,
   * the simulator should create a position with entry price, fill price (including impact),
   * and position size that follow the mathematical formulas.
   */
  describe('Property 1: Position Creation Consistency', () => {
    test('should create consistent positions following mathematical formulas', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('LONG', 'SHORT'), // decision
          fc.float({ min: 0.01, max: 1000 }), // entryPrice
          fc.float({ min: 10, max: 10000 }), // capitalUsd
          fc.float({ min: 0.01, max: 1.0 }), // sizingPercent
          fc.float({ min: 0.0001, max: 0.01 }), // impactCoeff
          fc.float({ min: 0.0001, max: 0.01 }), // feeRate
          fc.float({ min: 1000, max: 100000 }), // liquidityUsd
          fc.integer({ min: 1, max: 1000 }), // seed
          async (decision, entryPrice, capitalUsd, sizingPercent, impactCoeff, feeRate, liquidityUsd, seed) => {
            const result = await simulateTrade({
              token: 'TEST',
              decision,
              entryPrice,
              capitalUsd,
              sizingPercent,
              horizons: [60], // Use single horizon for faster testing
              options: {
                seed,
                impactCoeff,
                feeRate,
                liquidityUsd
              }
            });
            
            // Verify position size calculation
            const expectedPositionUsd = capitalUsd * sizingPercent;
            expect(result.positionUsd).toBeCloseTo(expectedPositionUsd, 6);
            
            // Verify price impact calculation
            const expectedPriceImpact = impactCoeff * (expectedPositionUsd / liquidityUsd);
            expect(result.meta.impactApplied).toBeCloseTo(expectedPriceImpact, 6);
            
            // Verify entry fill price calculation
            const sign = decision === 'LONG' ? 1 : -1;
            const expectedEntryFillPrice = entryPrice * (1 + sign * expectedPriceImpact);
            expect(result.entryFillPrice).toBeCloseTo(expectedEntryFillPrice, 6);
            
            // Verify fee calculation
            const expectedFees = expectedPositionUsd * feeRate * 2; // roundtrip
            expect(result.meta.feesApplied).toBeCloseTo(expectedFees, 6);
            
            // Verify basic result structure
            expect(result.decision).toBe(decision);
            expect(result.entryPrice).toBe(entryPrice);
            expect(result.capitalUsd).toBe(capitalUsd);
            expect(result.snapshots).toBeInstanceOf(Array);
            expect(result.snapshots.length).toBeGreaterThan(0);
            expect(result.meta.disclaimer).toBe('SIMULATION - NO REAL TXS');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    test('should handle edge cases in position creation', async () => {
      // Test minimum values
      const minResult = await simulateTrade({
        token: 'TEST',
        decision: 'LONG',
        entryPrice: 0.001,
        capitalUsd: 1,
        sizingPercent: 0.01,
        horizons: [60],
        options: { seed: 42 }
      });
      
      expect(minResult.positionUsd).toBeCloseTo(0.01, 6);
      expect(minResult.entryFillPrice).toBeGreaterThan(0);
      
      // Test maximum reasonable values
      const maxResult = await simulateTrade({
        token: 'TEST',
        decision: 'SHORT',
        entryPrice: 100000,
        capitalUsd: 1000000,
        sizingPercent: 1.0,
        horizons: [60],
        options: { seed: 42 }
      });
      
      expect(maxResult.positionUsd).toBeCloseTo(1000000, 6);
      expect(maxResult.entryFillPrice).toBeGreaterThan(0);
    });
  });
  
  /**
   * **Feature: degen-trading-simulator, Property 4: Deterministic Synthetic Generation**
   * **Validates: Requirements 2.4, 6.4**
   * 
   * For any seed value, synthetic price series generation should produce
   * identical results across multiple runs.
   */
  describe('Property 4: Deterministic Synthetic Generation', () => {
    test('should generate identical synthetic series with same seed', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 1000 }), // seedPrice
          fc.integer({ min: 10, max: 1000 }), // points
          fc.integer({ min: 1, max: 10000 }), // seed
          (seedPrice, points, seed) => {
            const series1 = generateSyntheticSeries(seedPrice, points, seed);
            const series2 = generateSyntheticSeries(seedPrice, points, seed);
            
            expect(series1.length).toBe(series2.length);
            expect(series1.length).toBe(points);
            
            for (let i = 0; i < series1.length; i++) {
              expect(series1[i].price).toBeCloseTo(series2[i].price, 10);
              expect(series1[i].timestamp).toBe(series2[i].timestamp);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
    
    test('should generate different series with different seeds', () => {
      const seedPrice = 100;
      const points = 100;
      
      const series1 = generateSyntheticSeries(seedPrice, points, 42);
      const series2 = generateSyntheticSeries(seedPrice, points, 43);
      
      expect(series1.length).toBe(series2.length);
      
      // At least some prices should be different
      let differences = 0;
      for (let i = 1; i < series1.length; i++) { // Skip first point (same seed price)
        if (Math.abs(series1[i].price - series2[i].price) > 0.001) {
          differences++;
        }
      }
      
      expect(differences).toBeGreaterThan(points * 0.1); // At least 10% different
    });
  });
  
  /**
   * **Feature: degen-trading-simulator, Property 8: LONG/SHORT Symmetry**
   * **Validates: Requirements 6.1, 6.2**
   * 
   * For any identical market conditions, LONG and SHORT positions should
   * produce inverse PnL results (excluding fees).
   */
  describe('Property 8: LONG/SHORT Symmetry', () => {
    test('should produce inverse PnL for LONG vs SHORT positions', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.01, max: 1000 }), // entryPrice
          fc.float({ min: 0.01, max: 1000 }), // marketPrice
          fc.float({ min: 10, max: 1000 }), // positionUsd
          (entryPrice, marketPrice, positionUsd) => {
            // Calculate PnL for LONG position (no fees for symmetry test)
            const longPnL = calculatePnL('LONG', entryPrice, marketPrice, positionUsd, 0);
            
            // Calculate PnL for SHORT position (no fees for symmetry test)
            const shortPnL = calculatePnL('SHORT', entryPrice, marketPrice, positionUsd, 0);
            
            // PnL should be inverse (opposite signs, same magnitude)
            expect(longPnL.pnlUsd).toBeCloseTo(-shortPnL.pnlUsd, 4);
            expect(longPnL.roi).toBeCloseTo(-shortPnL.roi, 4);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
  
  /**
   * Mathematical formula validation tests
   */
  describe('Mathematical Formula Validation', () => {
    test('PnL calculation should be mathematically correct', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('LONG', 'SHORT'),
          fc.float({ min: 0.01, max: 1000 }),
          fc.float({ min: 0.01, max: 1000 }),
          fc.float({ min: 10, max: 1000 }),
          fc.float({ min: 0, max: 10 }),
          (decision, entryPrice, currentPrice, positionUsd, fees) => {
            const result = calculatePnL(decision, entryPrice, currentPrice, positionUsd, fees);
            
            // Verify PnL calculation
            let expectedPnL;
            if (decision === 'LONG') {
              expectedPnL = (currentPrice / entryPrice - 1) * positionUsd - fees;
            } else {
              expectedPnL = (entryPrice / currentPrice - 1) * positionUsd - fees;
            }
            
            expect(result.pnlUsd).toBeCloseTo(expectedPnL, 6);
            expect(result.roi).toBeCloseTo(expectedPnL / positionUsd, 6);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Input validation tests
   */
  describe('Input Validation', () => {
    test('should reject invalid simulation options', async () => {
      // Missing required fields
      await expect(simulateTrade({})).rejects.toThrow('Token symbol is required');
      
      await expect(simulateTrade({
        token: 'TEST'
      })).rejects.toThrow('Decision must be LONG or SHORT');
      
      await expect(simulateTrade({
        token: 'TEST',
        decision: 'INVALID'
      })).rejects.toThrow('Decision must be LONG or SHORT');
      
      await expect(simulateTrade({
        token: 'TEST',
        decision: 'LONG',
        entryPrice: -1
      })).rejects.toThrow('Entry price must be positive');
      
      await expect(simulateTrade({
        token: 'TEST',
        decision: 'LONG',
        entryPrice: 100,
        capitalUsd: -1
      })).rejects.toThrow('Invalid capital or sizing parameters');
      
      await expect(simulateTrade({
        token: 'TEST',
        decision: 'LONG',
        entryPrice: 100,
        capitalUsd: 100,
        sizingPercent: 1.5
      })).rejects.toThrow('Invalid capital or sizing parameters');
    });
  });
});