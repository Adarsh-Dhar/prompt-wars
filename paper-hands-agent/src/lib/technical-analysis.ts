/**
 * Technical Analysis Engine for PaperHands Agent
 * Implements RSI, Bollinger Bands, and other indicators with paper hands bias
 */

import { ITechnicalAnalysisEngine, TechnicalIndicators, BollingerBands, MarketData } from '../types/index.js';

export class TechnicalAnalysisEngine implements ITechnicalAnalysisEngine {
  private priceHistory: number[] = [];
  private readonly maxHistoryLength = 100;

  /**
   * Update price data for calculations
   */
  updatePriceData(prices: number[]): void {
    this.priceHistory = [...prices];
    
    // Keep only the most recent data
    if (this.priceHistory.length > this.maxHistoryLength) {
      this.priceHistory = this.priceHistory.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * Paper hands version: slightly biased towards showing overbought conditions
   */
  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      return 50; // Neutral if not enough data
    }

    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // Calculate average gains and losses
    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) {
      return 100; // All gains, definitely overbought for paper hands
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Paper hands bias: add slight upward bias to make it seem more overbought
    return Math.min(100, rsi + 2);
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices: number[], period: number = 20): BollingerBands {
    if (prices.length < period) {
      const currentPrice = prices[prices.length - 1] || 0;
      return {
        upper: currentPrice * 1.02,
        middle: currentPrice,
        lower: currentPrice * 0.98
      };
    }

    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;

    // Calculate standard deviation
    const squaredDifferences = recentPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * 2),
      middle: sma,
      lower: sma - (standardDeviation * 2)
    };
  }

  /**
   * Calculate current profit/loss percentage
   */
  getCurrentProfit(entryPrice: number, currentPrice: number): number {
    if (entryPrice <= 0) return 0;
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  }

  /**
   * Check if volatility is high (paper hands hate volatility)
   */
  isVolatilityHigh(data: MarketData): boolean {
    if (data.priceHistory.length < 10) return false;

    const recentPrices = data.priceHistory.slice(-10);
    const priceChanges = [];

    for (let i = 1; i < recentPrices.length; i++) {
      const change = Math.abs((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
      priceChanges.push(change);
    }

    const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    
    // Paper hands consider anything above 2% average change as "high volatility"
    return avgVolatility > 0.02;
  }

  /**
   * Get latest technical indicators
   */
  getLatestIndicators(): TechnicalIndicators {
    if (this.priceHistory.length === 0) {
      return {
        rsi: 50,
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        currentProfit: 0,
        volatilityScore: 0,
        priceChange24h: 0
      };
    }

    const currentPrice = this.priceHistory[this.priceHistory.length - 1];
    const price24hAgo = this.priceHistory.length >= 24 
      ? this.priceHistory[this.priceHistory.length - 24] 
      : this.priceHistory[0];

    return {
      rsi: this.calculateRSI(this.priceHistory),
      bollingerBands: this.calculateBollingerBands(this.priceHistory),
      currentProfit: 0, // Will be calculated elsewhere with entry price
      volatilityScore: this.calculateVolatilityScore(),
      priceChange24h: ((currentPrice - price24hAgo) / price24hAgo) * 100
    };
  }

  /**
   * Check if current conditions trigger sell signals
   */
  checkSellTriggers(currentPrice: number, entryPrice: number): boolean {
    const indicators = this.getLatestIndicators();
    const profit = this.getCurrentProfit(entryPrice, currentPrice);

    // Paper hands sell triggers (very conservative)
    const rsiTrigger = indicators.rsi > 60; // Lower than typical 70
    const profitTrigger = profit > 1.5; // Take profits early
    const volatilityTrigger = indicators.volatilityScore > 0.05; // 5% volatility is scary
    const negativeTrigger = indicators.priceChange24h < -1; // Any significant red

    return rsiTrigger || profitTrigger || volatilityTrigger || negativeTrigger;
  }

  /**
   * Calculate volatility score (0-1 scale)
   */
  private calculateVolatilityScore(): number {
    if (this.priceHistory.length < 10) return 0;

    const recentPrices = this.priceHistory.slice(-20); // Last 20 data points
    const priceChanges = [];

    for (let i = 1; i < recentPrices.length; i++) {
      const change = Math.abs((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
      priceChanges.push(change);
    }

    const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    
    // Normalize to 0-1 scale (0.1 = 10% average change = max volatility for paper hands)
    return Math.min(1, avgVolatility / 0.1);
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  /**
   * Check if price is near Bollinger Band extremes
   */
  checkBollingerPosition(currentPrice: number): 'UPPER' | 'LOWER' | 'MIDDLE' {
    const bands = this.calculateBollingerBands(this.priceHistory);
    
    const upperThreshold = bands.upper * 0.95; // 95% of upper band
    const lowerThreshold = bands.lower * 1.05; // 105% of lower band

    if (currentPrice >= upperThreshold) return 'UPPER';
    if (currentPrice <= lowerThreshold) return 'LOWER';
    return 'MIDDLE';
  }

  /**
   * Generate fear-based technical analysis summary
   */
  generateFearfulAnalysis(): string {
    const indicators = this.getLatestIndicators();
    const analysis: string[] = [];

    if (indicators.rsi > 60) {
      analysis.push(`RSI is ${indicators.rsi.toFixed(1)} - getting overbought! 😰`);
    }

    if (indicators.volatilityScore > 0.05) {
      analysis.push(`Volatility at ${(indicators.volatilityScore * 100).toFixed(1)}% - too chaotic! 🌪️`);
    }

    if (indicators.priceChange24h < 0) {
      analysis.push(`Down ${Math.abs(indicators.priceChange24h).toFixed(2)}% in 24h - it's dumping! 📉`);
    }

    if (analysis.length === 0) {
      analysis.push("Markets look... okay for now, but I'm still nervous! 😬");
    }

    return analysis.join(' ');
  }
}