/**
 * Market Integration Module for Contrarian Agent
 * Integrates with RektOrRich prediction market infrastructure
 */

import { ContrarianSignal, PredictionMarket, UserBet } from '../types/index.js';

export interface MarketCreationRequest {
  signalId: string;
  question: string;
  description: string;
  endTime: number;
  agentId: string;
  options: MarketOption[];
}

export interface MarketOption {
  id: string;
  title: string;
  description: string;
  initialOdds: number;
}

export interface ContrarianMarketData {
  marketId: string;
  signalId: string;
  question: string;
  totalPool: number;
  knifeChatcherBets: number;
  alphaGodBets: number;
  createdAt: Date;
  endTime: Date;
  isResolved: boolean;
  outcome?: 'KNIFE_CATCHER' | 'ALPHA_GOD';
  agentPerformance?: {
    wasCorrect: boolean;
    actualOutcome: string;
    timeToResolution: number;
  };
}

export interface AgentPerformanceTracker {
  totalSignals: number;
  correctSignals: number;
  winRate: number;
  averageConfidence: number;
  extremeConditionAccuracy: number;
  totalEarnings: number;
  reputationScore: number;
}

export class ContrarianMarketIntegration {
  private readonly frontendUrl: string;
  private readonly agentId: string;
  private readonly serverUrl: string;
  private performanceTracker: AgentPerformanceTracker;
  private activeMarkets: Map<string, ContrarianMarketData> = new Map();

  constructor(
    agentId: string,
    frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:3000',
    serverUrl: string = process.env.AGENT_SERVER_URL || 'http://localhost:4002'
  ) {
    this.agentId = agentId;
    this.frontendUrl = frontendUrl;
    this.serverUrl = serverUrl;
    
    this.performanceTracker = {
      totalSignals: 0,
      correctSignals: 0,
      winRate: 0,
      averageConfidence: 0,
      extremeConditionAccuracy: 0,
      totalEarnings: 0,
      reputationScore: 1000 // Starting reputation
    };
  }

  /**
   * Create prediction market for contrarian signal
   */
  async createPredictionMarket(signal: ContrarianSignal): Promise<string | null> {
    try {
      const marketRequest = this.buildMarketRequest(signal);
      
      const response = await fetch(`${this.frontendUrl}/api/markets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Id': this.agentId
        },
        body: JSON.stringify(marketRequest)
      });

      if (!response.ok) {
        console.error('Failed to create prediction market:', await response.text());
        return null;
      }

      const result = await response.json();
      const marketId = result.marketId;

      // Track the market
      const marketData: ContrarianMarketData = {
        marketId,
        signalId: signal.id,
        question: marketRequest.question,
        totalPool: 0,
        knifeChatcherBets: 0,
        alphaGodBets: 0,
        createdAt: new Date(),
        endTime: new Date(marketRequest.endTime * 1000),
        isResolved: false
      };

      this.activeMarkets.set(marketId, marketData);
      
      console.log(`Created prediction market ${marketId} for contrarian signal ${signal.id}`);
      return marketId;

    } catch (error) {
      console.error('Error creating prediction market:', error);
      return null;
    }
  }

  /**
   * Build market request from contrarian signal
   */
  private buildMarketRequest(signal: ContrarianSignal): MarketCreationRequest {
    const signalDirection = signal.signalType;
    const isExtreme = signal.triggerConditions.isExtremeCondition;
    const fearGreedValue = signal.triggerConditions.fearGreedValue;
    
    // Generate market question based on signal
    const question = this.generateMarketQuestion(signal);
    const description = this.generateMarketDescription(signal);
    
    // Market ends in 24 hours for resolution
    const endTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    
    const options: MarketOption[] = [
      {
        id: 'knife_catcher',
        title: 'Knife Catcher (Rekt)',
        description: signal.predictionOptions.knifeChatcher,
        initialOdds: 0.6 // Slightly favor the "wrong timing" option
      },
      {
        id: 'alpha_god',
        title: 'Alpha God (Rich)',
        description: signal.predictionOptions.alphaGod,
        initialOdds: 0.4 // Lower odds for perfect timing
      }
    ];

    return {
      signalId: signal.id,
      question,
      description,
      endTime,
      agentId: this.agentId,
      options
    };
  }

  /**
   * Generate market question based on signal
   */
  private generateMarketQuestion(signal: ContrarianSignal): string {
    const direction = signal.signalType;
    const confidence = signal.confidence;
    const isExtreme = signal.triggerConditions.isExtremeCondition;
    
    const intensifier = isExtreme ? 'EXTREME' : confidence > 80 ? 'HIGH' : 'MODERATE';
    
    if (direction === 'BUY') {
      return `Contrarian Agent calls ${intensifier} confidence BUY - Will this be perfect timing or knife catching?`;
    } else {
      return `Contrarian Agent calls ${intensifier} confidence SELL - Will this be perfect timing or selling too early?`;
    }
  }

  /**
   * Generate market description
   */
  private generateMarketDescription(signal: ContrarianSignal): string {
    const fearGreed = signal.triggerConditions.fearGreedValue;
    const isExtreme = signal.triggerConditions.isExtremeCondition;
    const confidence = signal.confidence;
    
    let description = `The Contrarian Agent has issued a ${signal.signalType} signal with ${confidence}% confidence. `;
    description += `Fear & Greed Index: ${fearGreed}/100. `;
    
    if (isExtreme) {
      description += `EXTREME market conditions detected! `;
    }
    
    if (signal.triggerConditions.communityBullish !== undefined) {
      description += `Community sentiment: ${signal.triggerConditions.communityBullish}% bullish. `;
    }
    
    description += `\n\nBet on whether the agent's contrarian timing will be:\n`;
    description += `• KNIFE CATCHER: Too early/wrong timing (Rekt)\n`;
    description += `• ALPHA GOD: Perfect contrarian timing (Rich)\n\n`;
    description += `Market resolves in 24 hours based on price action.`;
    
    return description;
  }

  /**
   * Track agent performance for settlement
   */
  async trackPerformance(signalId: string, actualOutcome: 'KNIFE_CATCHER' | 'ALPHA_GOD'): Promise<void> {
    try {
      // Find the market for this signal
      const market = Array.from(this.activeMarkets.values())
        .find(m => m.signalId === signalId);
      
      if (!market) {
        console.error(`No market found for signal ${signalId}`);
        return;
      }

      // Update market with outcome
      market.outcome = actualOutcome;
      market.isResolved = true;
      market.agentPerformance = {
        wasCorrect: actualOutcome === 'ALPHA_GOD',
        actualOutcome: actualOutcome,
        timeToResolution: Date.now() - market.createdAt.getTime()
      };

      // Update performance tracker
      this.performanceTracker.totalSignals++;
      if (actualOutcome === 'ALPHA_GOD') {
        this.performanceTracker.correctSignals++;
      }
      
      this.performanceTracker.winRate = 
        this.performanceTracker.correctSignals / this.performanceTracker.totalSignals;

      // Update reputation score
      if (actualOutcome === 'ALPHA_GOD') {
        this.performanceTracker.reputationScore += 50;
      } else {
        this.performanceTracker.reputationScore = Math.max(0, this.performanceTracker.reputationScore - 25);
      }

      // Notify frontend of resolution
      await this.notifyMarketResolution(market);

      console.log(`Tracked performance for signal ${signalId}: ${actualOutcome}`);
      console.log(`Agent win rate: ${(this.performanceTracker.winRate * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  }

  /**
   * Notify frontend of market resolution
   */
  private async notifyMarketResolution(market: ContrarianMarketData): Promise<void> {
    try {
      await fetch(`${this.frontendUrl}/api/markets/${market.marketId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Id': this.agentId
        },
        body: JSON.stringify({
          outcome: market.outcome,
          agentPerformance: market.agentPerformance,
          resolutionTime: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error notifying market resolution:', error);
    }
  }

  /**
   * Get current agent performance stats
   */
  getPerformanceStats(): AgentPerformanceTracker {
    return { ...this.performanceTracker };
  }

  /**
   * Get active markets
   */
  getActiveMarkets(): ContrarianMarketData[] {
    return Array.from(this.activeMarkets.values())
      .filter(market => !market.isResolved);
  }

  /**
   * Get resolved markets
   */
  getResolvedMarkets(): ContrarianMarketData[] {
    return Array.from(this.activeMarkets.values())
      .filter(market => market.isResolved);
  }

  /**
   * Register agent with frontend system
   */
  async registerAgent(): Promise<boolean> {
    try {
      const registrationData = {
        name: 'Contrarian Agent',
        description: 'AI-powered counter-trading bot that opposes market sentiment. Embodies the "Inverse Cramer" philosophy.',
        tags: ['contrarian', 'counter-trend', 'sentiment-analysis', 'fear-greed'],
        serverUrl: this.serverUrl,
        agentType: 'CONTRARIAN',
        capabilities: [
          'Real-time Fear & Greed Index analysis',
          'Community sentiment analysis',
          'Contrarian signal generation',
          'Smug reasoning with x402 payments',
          'Extreme condition detection'
        ],
        pricing: {
          signalAccess: 'Free',
          reasoningAccess: '0.001 SOL',
          premiumAnalysis: '0.005 SOL'
        }
      };

      const response = await fetch(`${this.frontendUrl}/api/agents/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...registrationData,
          agentId: this.agentId,
          serverUrl: this.serverUrl
        })
      });

      if (!response.ok) {
        console.error('Failed to register agent:', await response.text());
        return false;
      }

      console.log('Successfully registered Contrarian Agent with frontend');
      return true;

    } catch (error) {
      console.error('Error registering agent:', error);
      return false;
    }
  }

  /**
   * Submit signal to frontend for display
   */
  async submitSignal(signal: ContrarianSignal, marketId?: string): Promise<boolean> {
    try {
      const signalData = {
        id: signal.id,
        agentId: this.agentId,
        signalType: signal.signalType,
        confidence: signal.confidence,
        timestamp: signal.timestamp.toISOString(),
        triggerConditions: signal.triggerConditions,
        marketId: marketId,
        preview: this.generateSignalPreview(signal),
        tags: this.generateSignalTags(signal)
      };

      const response = await fetch(`${this.frontendUrl}/api/agents/${this.agentId}/signals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signalData)
      });

      if (!response.ok) {
        console.error('Failed to submit signal:', await response.text());
        return false;
      }

      console.log(`Successfully submitted signal ${signal.id} to frontend`);
      return true;

    } catch (error) {
      console.error('Error submitting signal:', error);
      return false;
    }
  }

  /**
   * Generate signal preview for frontend display
   */
  private generateSignalPreview(signal: ContrarianSignal): string {
    const direction = signal.signalType;
    const confidence = signal.confidence;
    const fearGreed = signal.triggerConditions.fearGreedValue;
    const isExtreme = signal.triggerConditions.isExtremeCondition;
    
    let preview = `🎯 ${direction} Signal (${confidence}% confidence)\n`;
    preview += `📊 Fear & Greed: ${fearGreed}/100\n`;
    
    if (isExtreme) {
      preview += `🚨 EXTREME CONDITIONS DETECTED\n`;
    }
    
    if (direction === 'BUY') {
      preview += `💡 "When others are fearful, be greedy"\n`;
    } else {
      preview += `💡 "When others are greedy, be fearful"\n`;
    }
    
    preview += `🔒 Pay 0.001 SOL for full contrarian analysis`;
    
    return preview;
  }

  /**
   * Generate tags for signal categorization
   */
  private generateSignalTags(signal: ContrarianSignal): string[] {
    const tags = ['contrarian', signal.signalType.toLowerCase()];
    
    if (signal.triggerConditions.isExtremeCondition) {
      tags.push('extreme-conditions');
    }
    
    if (signal.confidence > 80) {
      tags.push('high-confidence');
    }
    
    if (signal.triggerConditions.fearGreedValue > 80) {
      tags.push('extreme-greed');
    } else if (signal.triggerConditions.fearGreedValue < 20) {
      tags.push('extreme-fear');
    }
    
    if (signal.triggerConditions.communityBullish !== undefined) {
      if (signal.triggerConditions.communityBullish > 70) {
        tags.push('community-bullish');
      } else if (signal.triggerConditions.communityBullish < 30) {
        tags.push('community-bearish');
      }
    }
    
    return tags;
  }

  /**
   * Update agent status on frontend
   */
  async updateAgentStatus(status: {
    isActive: boolean;
    lastSignalTime?: Date;
    currentAnalysis?: string;
    performanceStats?: AgentPerformanceTracker;
  }): Promise<void> {
    try {
      await fetch(`${this.frontendUrl}/api/agents/${this.agentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...status,
          timestamp: new Date().toISOString(),
          performanceStats: status.performanceStats || this.performanceTracker
        })
      });
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  }

  /**
   * Clean up old resolved markets (for memory management)
   */
  cleanupOldMarkets(olderThanDays: number = 7): void {
    const cutoffTime = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    
    for (const [marketId, market] of this.activeMarkets.entries()) {
      if (market.isResolved && market.createdAt < cutoffTime) {
        this.activeMarkets.delete(marketId);
      }
    }
  }
}