/**
 * Signal Generator Module
 * Processes sentiment data into contrarian trading signals
 */

import { ISignalGenerator, SentimentData, ContrarianDecision, ContrarianSignal } from '../types/index.js';

export class SignalGenerator implements ISignalGenerator {
  private readonly fearGreedSellThreshold: number;
  private readonly extremeConditionThreshold: number;
  private readonly bullishReinforcementThreshold: number;
  private readonly bearishReinforcementThreshold: number;

  constructor(
    fearGreedSellThreshold: number = 60,
    extremeConditionThreshold: number = 80,
    bullishReinforcementThreshold: number = 70,
    bearishReinforcementThreshold: number = 30
  ) {
    this.fearGreedSellThreshold = fearGreedSellThreshold;
    this.extremeConditionThreshold = extremeConditionThreshold;
    this.bullishReinforcementThreshold = bullishReinforcementThreshold;
    this.bearishReinforcementThreshold = bearishReinforcementThreshold;
  }

  /**
   * Processes sentiment data using contrarian logic
   * Core contrarian rule: >60 = SELL, ≤60 = BUY
   */
  processContrarianLogic(sentimentData: SentimentData): ContrarianDecision {
    const fearGreedValue = sentimentData.fearGreedIndex.value;
    const isExtremeCondition = this.determineExtremeConditions(fearGreedValue);
    
    // Core contrarian logic
    const signalType = fearGreedValue > this.fearGreedSellThreshold ? 'SELL' : 'BUY';
    
    // Calculate base confidence
    let confidence = this.calculateConfidence(
      fearGreedValue, 
      sentimentData.communityData?.bullishPercentage
    );
    
    // Adjust confidence for extreme conditions
    if (isExtremeCondition) {
      confidence = Math.min(100, confidence * 1.2); // Boost confidence by 20% for extreme conditions
    }
    
    // Apply sentiment reinforcement
    confidence = this.applySentimentReinforcement(
      confidence, 
      signalType, 
      sentimentData.communityData?.bullishPercentage
    );
    
    const reasoning = this.generateReasoningText(sentimentData, signalType, confidence, isExtremeCondition);
    
    return {
      signalType,
      confidence: Math.round(confidence),
      isExtremeCondition,
      reasoning
    };
  }

  /**
   * Calculates confidence level based on Fear & Greed Index and community sentiment
   */
  calculateConfidence(fearGreed: number, community?: number): number {
    // Base confidence calculation based on distance from threshold
    const distanceFromThreshold = Math.abs(fearGreed - this.fearGreedSellThreshold);
    
    // Convert distance to confidence (0-40 range becomes 60-100 confidence)
    let baseConfidence = 60 + (distanceFromThreshold * 1.0);
    baseConfidence = Math.min(100, Math.max(60, baseConfidence));
    
    // Adjust based on community sentiment if available
    if (community !== undefined) {
      const communityAlignment = this.calculateCommunityAlignment(fearGreed, community);
      baseConfidence += communityAlignment * 10; // Up to 10 point boost/penalty
    }
    
    return Math.min(100, Math.max(50, baseConfidence));
  }

  /**
   * Determines if market conditions are extreme (>80 Fear or Greed)
   */
  determineExtremeConditions(fearGreed: number): boolean {
    return fearGreed > this.extremeConditionThreshold || fearGreed < (100 - this.extremeConditionThreshold);
  }

  /**
   * Applies sentiment reinforcement based on community data
   */
  private applySentimentReinforcement(
    baseConfidence: number, 
    signalType: 'BUY' | 'SELL', 
    communityBullish?: number
  ): number {
    if (communityBullish === undefined) {
      return baseConfidence;
    }
    
    let adjustedConfidence = baseConfidence;
    
    // Bullish sentiment reinforcement for SELL signals
    if (signalType === 'SELL' && communityBullish > this.bullishReinforcementThreshold) {
      const reinforcement = (communityBullish - this.bullishReinforcementThreshold) / 30; // 0-1 scale
      adjustedConfidence += reinforcement * 15; // Up to 15 point boost
    }
    
    // Bearish sentiment reinforcement for BUY signals
    if (signalType === 'BUY' && communityBullish < this.bearishReinforcementThreshold) {
      const reinforcement = (this.bearishReinforcementThreshold - communityBullish) / 30; // 0-1 scale
      adjustedConfidence += reinforcement * 15; // Up to 15 point boost
    }
    
    return Math.min(100, adjustedConfidence);
  }

  /**
   * Calculates how well community sentiment aligns with contrarian signal
   */
  private calculateCommunityAlignment(fearGreed: number, communityBullish: number): number {
    const contrarianSignal = fearGreed > this.fearGreedSellThreshold ? 'SELL' : 'BUY';
    
    if (contrarianSignal === 'SELL') {
      // For SELL signals, higher community bullishness is better alignment
      return (communityBullish - 50) / 50; // -1 to 1 scale
    } else {
      // For BUY signals, lower community bullishness is better alignment
      return (50 - communityBullish) / 50; // -1 to 1 scale
    }
  }

  /**
   * Generates reasoning text for the contrarian decision
   */
  private generateReasoningText(
    sentimentData: SentimentData, 
    signalType: 'BUY' | 'SELL', 
    confidence: number,
    isExtremeCondition: boolean
  ): string {
    const fearGreedValue = sentimentData.fearGreedIndex.value;
    const classification = sentimentData.fearGreedIndex.classification;
    const communityData = sentimentData.communityData;
    
    let reasoning = `Fear & Greed Index: ${fearGreedValue} (${classification}). `;
    
    if (signalType === 'SELL') {
      reasoning += `Market showing ${classification.toLowerCase()}, time to be contrarian and SELL. `;
      if (fearGreedValue > this.extremeConditionThreshold) {
        reasoning += `Extreme greed detected - perfect time to fade the euphoria. `;
      }
    } else {
      reasoning += `Market showing ${classification.toLowerCase()}, contrarian opportunity to BUY. `;
      if (fearGreedValue < (100 - this.extremeConditionThreshold)) {
        reasoning += `Extreme fear detected - blood in the streets, time to buy. `;
      }
    }
    
    if (communityData) {
      reasoning += `Community sentiment: ${communityData.bullishPercentage}% bullish. `;
      
      if (signalType === 'SELL' && communityData.bullishPercentage > this.bullishReinforcementThreshold) {
        reasoning += `High community bullishness reinforces our contrarian SELL signal. `;
      } else if (signalType === 'BUY' && communityData.bullishPercentage < this.bearishReinforcementThreshold) {
        reasoning += `Low community bullishness reinforces our contrarian BUY signal. `;
      }
    }
    
    reasoning += `Confidence: ${Math.round(confidence)}%.`;
    
    if (isExtremeCondition) {
      reasoning += ` EXTREME CONDITIONS - maximum contrarian opportunity!`;
    }
    
    return reasoning;
  }

  /**
   * Creates a complete contrarian signal from sentiment data
   */
  generateContrarianSignal(
    sentimentData: SentimentData, 
    agentId: string, 
    marketPrice?: number
  ): ContrarianSignal {
    const decision = this.processContrarianLogic(sentimentData);
    const signalId = this.generateSignalId();
    
    return {
      id: signalId,
      agentId: agentId,
      signalType: decision.signalType,
      timestamp: new Date(),
      confidence: decision.confidence,
      triggerConditions: {
        fearGreedValue: sentimentData.fearGreedIndex.value,
        communityBullish: sentimentData.communityData?.bullishPercentage,
        isExtremeCondition: decision.isExtremeCondition
      },
      encryptedReasoning: '', // Will be populated by encryption module
      marketPrice: marketPrice,
      predictionOptions: {
        knifeChatcher: decision.signalType === 'BUY' 
          ? 'Agent buying too early (Rekt)' 
          : 'Agent selling too early (Rekt)',
        alphaGod: decision.signalType === 'BUY' 
          ? 'Agent buying the bottom (Rich)' 
          : 'Agent selling the top (Rich)'
      }
    };
  }

  /**
   * Generates unique signal ID
   */
  private generateSignalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `contrarian_${timestamp}_${random}`;
  }

  /**
   * Validates signal parameters are within expected ranges
   */
  validateSignalParameters(fearGreed: number, community?: number): boolean {
    if (typeof fearGreed !== 'number' || fearGreed < 0 || fearGreed > 100) {
      return false;
    }
    
    if (community !== undefined) {
      if (typeof community !== 'number' || community < 0 || community > 100) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Gets current configuration thresholds
   */
  getThresholds(): {
    fearGreedSellThreshold: number;
    extremeConditionThreshold: number;
    bullishReinforcementThreshold: number;
    bearishReinforcementThreshold: number;
  } {
    return {
      fearGreedSellThreshold: this.fearGreedSellThreshold,
      extremeConditionThreshold: this.extremeConditionThreshold,
      bullishReinforcementThreshold: this.bullishReinforcementThreshold,
      bearishReinforcementThreshold: this.bearishReinforcementThreshold
    };
  }
}