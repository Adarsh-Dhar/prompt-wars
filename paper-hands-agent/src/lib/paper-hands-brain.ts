/**
 * PaperHands Agent Brain - Core decision making logic
 * Implements extreme risk aversion and anxiety-driven trading
 */

import { TechnicalIndicators, MarketData, AgentState } from '../types/index.js';

export interface PanicDecision {
  shouldPanic: boolean;
  reason: string;
  anxietyLevel: number;
  confidence: number;
  action: 'PANIC_SELL' | 'STAY_CASH' | 'TAKE_PROFIT';
}

export interface PanicThresholds {
  rsi: number;
  profit: number;
  volatility: number;
  anxietyTrigger: number;
}

export class PaperHandsBrain {
  private thresholds: PanicThresholds;
  private fearPhrases: string[];
  private baseAnxietyLevel: number;

  constructor(config: {
    anxietyLevel?: number;
    panicThresholds?: Partial<PanicThresholds>;
    fearPhrases?: string[];
  } = {}) {
    this.baseAnxietyLevel = config.anxietyLevel || 9;
    this.thresholds = {
      rsi: 60,
      profit: 1.5,
      volatility: 0.05,
      anxietyTrigger: 8,
      ...config.panicThresholds
    };
    this.fearPhrases = config.fearPhrases || [
      "Too risky!",
      "Secure the bag!",
      "It's a trap!",
      "Cash is king!",
      "Better safe than sorry!",
      "This could be the top!",
      "I'm getting nervous!",
      "Time to take profits!"
    ];
  }

  /**
   * Analyze market conditions and decide if we should panic
   */
  analyzeMarket(
    marketData: MarketData,
    technicalIndicators: TechnicalIndicators,
    agentState: AgentState
  ): PanicDecision {
    let anxietyLevel = this.baseAnxietyLevel;
    const panicReasons: string[] = [];
    let shouldPanic = false;

    // Check RSI - paper hands hate overbought conditions
    if (technicalIndicators.rsi > this.thresholds.rsi) {
      anxietyLevel += 1;
      panicReasons.push(`RSI is ${technicalIndicators.rsi.toFixed(1)} (too high!)`);
      shouldPanic = true;
    }

    // Check profit - take any profit available
    if (technicalIndicators.currentProfit > this.thresholds.profit) {
      anxietyLevel += 2;
      panicReasons.push(`Profit is ${technicalIndicators.currentProfit.toFixed(2)}% (secure it now!)`);
      shouldPanic = true;
    }

    // Check volatility - hate any uncertainty
    if (technicalIndicators.volatilityScore > this.thresholds.volatility) {
      anxietyLevel += 1;
      panicReasons.push(`Volatility is ${(technicalIndicators.volatilityScore * 100).toFixed(1)}% (too scary!)`);
      shouldPanic = true;
    }

    // Check price change - any red is bad
    if (technicalIndicators.priceChange24h < 0) {
      anxietyLevel += 1;
      panicReasons.push(`Price is down ${Math.abs(technicalIndicators.priceChange24h).toFixed(2)}% (it's dumping!)`);
      shouldPanic = true;
    }

    // Check if we're already in cash (preferred state)
    if (agentState.position === 'CASH') {
      return {
        shouldPanic: false,
        reason: "Already in cash (safe space) 💰",
        anxietyLevel: Math.max(6, anxietyLevel - 2),
        confidence: 95,
        action: 'STAY_CASH'
      };
    }

    // Determine action based on conditions
    let action: 'PANIC_SELL' | 'STAY_CASH' | 'TAKE_PROFIT' = 'PANIC_SELL';
    if (technicalIndicators.currentProfit > 0 && technicalIndicators.currentProfit < 3) {
      action = 'TAKE_PROFIT';
    }

    // Cap anxiety at 10
    anxietyLevel = Math.min(10, anxietyLevel);

    // Generate panic reason
    const fearPhrase = this.getRandomFearPhrase();
    const reason = shouldPanic 
      ? `${fearPhrase} ${panicReasons.join(', ')}`
      : "Market conditions are... acceptable (for now)";

    return {
      shouldPanic,
      reason,
      anxietyLevel,
      confidence: shouldPanic ? 85 + Math.random() * 10 : 60,
      action
    };
  }

  /**
   * Generate anxious reasoning for a decision
   */
  generateAnxiousReasoning(decision: PanicDecision, marketData: MarketData): string {
    const fearPhrase = this.getRandomFearPhrase();
    
    if (!decision.shouldPanic) {
      return `${fearPhrase} But I guess we can hold for now... though I'm watching every candle like a hawk! 👀 Current price: $${marketData.price.toFixed(2)}`;
    }

    const reasoningParts = [
      `🚨 PANIC MODE ACTIVATED! ${fearPhrase}`,
      `Current anxiety level: ${decision.anxietyLevel}/10`,
      `Market analysis: ${decision.reason}`,
      `My paper hands are shaking! 📄✋`,
      `Better to be safe than sorry - cash is king! 👑`,
      `I've seen this pattern before... it never ends well! 📉`
    ];

    return reasoningParts.join(' ');
  }

  /**
   * Get a random fear phrase
   */
  getRandomFearPhrase(): string {
    return this.fearPhrases[Math.floor(Math.random() * this.fearPhrases.length)];
  }

  /**
   * Calculate fear index based on multiple factors
   */
  calculateFearIndex(
    technicalIndicators: TechnicalIndicators,
    marketData: MarketData
  ): number {
    let fearIndex = 0;

    // RSI contribution (0-3 points)
    if (technicalIndicators.rsi > 70) fearIndex += 3;
    else if (technicalIndicators.rsi > 60) fearIndex += 2;
    else if (technicalIndicators.rsi > 50) fearIndex += 1;

    // Volatility contribution (0-3 points)
    if (technicalIndicators.volatilityScore > 0.1) fearIndex += 3;
    else if (technicalIndicators.volatilityScore > 0.05) fearIndex += 2;
    else if (technicalIndicators.volatilityScore > 0.02) fearIndex += 1;

    // Price change contribution (0-2 points)
    if (technicalIndicators.priceChange24h < -5) fearIndex += 2;
    else if (technicalIndicators.priceChange24h < 0) fearIndex += 1;

    // Volume spike contribution (0-2 points)
    if (marketData.volume > 1000000) fearIndex += 2;
    else if (marketData.volume > 500000) fearIndex += 1;

    return Math.min(10, fearIndex);
  }

  /**
   * Update anxiety level based on recent performance
   */
  updateAnxietyLevel(recentPerformance: {
    correctPanicSells: number;
    totalPanicSells: number;
    recentLosses: number;
  }): number {
    let newAnxietyLevel = this.baseAnxietyLevel;

    // Increase anxiety if we've been wrong
    const accuracy = recentPerformance.totalPanicSells > 0 
      ? recentPerformance.correctPanicSells / recentPerformance.totalPanicSells 
      : 0.5;

    if (accuracy < 0.3) {
      newAnxietyLevel += 1; // We've been wrong, get more anxious
    } else if (accuracy > 0.7) {
      newAnxietyLevel = Math.max(7, newAnxietyLevel - 0.5); // Slightly less anxious if we've been right
    }

    // Recent losses increase anxiety
    if (recentLosses > 3) {
      newAnxietyLevel += 1;
    }

    return Math.min(10, Math.max(6, newAnxietyLevel));
  }

  /**
   * Generate defensive response to market volatility
   */
  generateDefensiveResponse(volatilityLevel: number): string {
    const responses = [
      "This volatility is making me sweat! 😰",
      "Too much chaos in the markets right now!",
      "I don't like these wild price swings!",
      "This is exactly why I prefer cash!",
      "Market makers are trying to shake us out!",
      "Better to sit this one out... 🪑"
    ];

    const intensifiers = volatilityLevel > 0.1 
      ? ["EXTREMELY", "INCREDIBLY", "ABSOLUTELY"] 
      : ["very", "quite", "somewhat"];

    const intensifier = intensifiers[Math.floor(Math.random() * intensifiers.length)];
    const response = responses[Math.floor(Math.random() * responses.length)];

    return `${response} This is ${intensifier} concerning! 🚨`;
  }
}