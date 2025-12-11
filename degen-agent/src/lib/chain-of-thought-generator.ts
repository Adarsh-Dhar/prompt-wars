/**
 * Chain of Thought generator that produces reasoning in Degen personality style
 */

import { ChainOfThought, TradingDecision } from '../types';
import { TokenMetrics, HypeAnalysis, TokenAnalyzer } from './token-analysis';
import { OpenAIDegenClient, TokenAnalysisRequest } from './openai-client';

export interface ChainOfThoughtConfig {
  includeRiskWarnings: boolean;
  maxReasoningLength: number;
  slangIntensity: number; // 1-10
  includeEmojis: boolean;
}

export const DEFAULT_COT_CONFIG: ChainOfThoughtConfig = {
  includeRiskWarnings: true,
  maxReasoningLength: 500,
  slangIntensity: 9,
  includeEmojis: true
};

export class ChainOfThoughtGenerator {
  private tokenAnalyzer: TokenAnalyzer;
  private openaiClient: OpenAIDegenClient | null;

  constructor(openaiApiKey?: string) {
    this.tokenAnalyzer = new TokenAnalyzer();
    this.openaiClient = openaiApiKey ? new OpenAIDegenClient({ apiKey: openaiApiKey }) : null;
  }

  /**
   * Generate Chain of Thought reasoning for a trading decision
   */
  async generateChainOfThought(
    decision: TradingDecision,
    tokenMetrics: TokenMetrics,
    config: ChainOfThoughtConfig = DEFAULT_COT_CONFIG
  ): Promise<ChainOfThought> {
    
    // Analyze token with degen priorities
    const hypeAnalysis = this.tokenAnalyzer.analyzeToken(tokenMetrics);
    
    // Generate AI-powered reasoning if available
    if (this.openaiClient) {
      return await this.generateAIChainOfThought(decision, tokenMetrics, hypeAnalysis, config);
    }
    
    // Fallback to rule-based generation
    return this.generateRuleBasedChainOfThought(decision, tokenMetrics, hypeAnalysis, config);
  }

  private async generateAIChainOfThought(
    decision: TradingDecision,
    tokenMetrics: TokenMetrics,
    hypeAnalysis: HypeAnalysis,
    config: ChainOfThoughtConfig
  ): Promise<ChainOfThought> {
    
    const request: TokenAnalysisRequest = {
      tokenSymbol: decision.tokenSymbol,
      currentPrice: decision.currentPrice,
      marketData: { ...tokenMetrics, ...hypeAnalysis }
    };

    try {
      const aiAnalysis = await this.openaiClient!.generateTradingCommentary(request);
      
      return {
        decisionId: decision.id,
        reasoning: this.formatReasoning(aiAnalysis.reasoning, config),
        marketAnalysis: this.formatMarketAnalysis(aiAnalysis.marketAnalysis, hypeAnalysis, config),
        riskAssessment: this.formatRiskAssessment(aiAnalysis.riskAssessment, hypeAnalysis, config),
        degenCommentary: this.formatDegenCommentary(aiAnalysis.degenCommentary, config),
        priceTargets: aiAnalysis.priceTargets
      };
    } catch (error) {
      console.error('AI Chain of Thought generation failed, using fallback:', error);
      return this.generateRuleBasedChainOfThought(decision, tokenMetrics, hypeAnalysis, config);
    }
  }

  private generateRuleBasedChainOfThought(
    decision: TradingDecision,
    tokenMetrics: TokenMetrics,
    hypeAnalysis: HypeAnalysis,
    config: ChainOfThoughtConfig
  ): Promise<ChainOfThought> {
    
    const insights = this.tokenAnalyzer.generateDegenInsights(hypeAnalysis, tokenMetrics);
    const emojis = config.includeEmojis;
    
    const reasoning = this.buildReasoning(decision, hypeAnalysis, insights, emojis);
    const marketAnalysis = this.buildMarketAnalysis(tokenMetrics, hypeAnalysis, emojis);
    const riskAssessment = this.buildRiskAssessment(hypeAnalysis, config);
    const degenCommentary = this.buildDegenCommentary(decision, hypeAnalysis, insights, emojis);
    
    const priceTargets = this.calculatePriceTargets(decision, hypeAnalysis);

    return Promise.resolve({
      decisionId: decision.id,
      reasoning: this.truncateText(reasoning, config.maxReasoningLength),
      marketAnalysis,
      riskAssessment,
      degenCommentary,
      priceTargets
    });
  }

  private buildReasoning(
    decision: TradingDecision,
    analysis: HypeAnalysis,
    insights: string[],
    useEmojis: boolean
  ): string {
    const emoji = useEmojis ? (decision.decision === 'LONG' ? '🚀' : '📉') : '';
    const slang = decision.decision === 'LONG' ? 'APE IN' : 'STAY AWAY';
    
    let reasoning = `${emoji} ${slang} SIGNAL on ${decision.tokenSymbol}! `;
    
    // Add hype-based reasoning
    if (analysis.overallHype > 70) {
      reasoning += `The hype is UNREAL right now - crypto Twitter is going CRAZY! `;
    } else if (analysis.overallHype < 40) {
      reasoning += `Hype levels are pretty dead, but that could mean opportunity... `;
    }
    
    // Add momentum reasoning
    if (analysis.momentumScore > 70) {
      reasoning += `Momentum is PUMPING HARD and showing no signs of slowing down! `;
    } else if (analysis.momentumScore < 30) {
      reasoning += `Momentum is completely REKT - this could be a falling knife situation! `;
    }
    
    // Add sentiment reasoning
    if (analysis.sentimentScore > 50) {
      reasoning += `Market sentiment is BULLISH AF - everyone's got diamond hands! `;
    } else if (analysis.sentimentScore < -50) {
      reasoning += `Sentiment is BEARISH - lots of paper hands selling! `;
    }
    
    // Add insights
    if (insights.length > 0) {
      reasoning += insights.slice(0, 2).join(' ');
    }
    
    return reasoning;
  }

  private buildMarketAnalysis(
    metrics: TokenMetrics,
    analysis: HypeAnalysis,
    useEmojis: boolean
  ): string {
    const emoji = useEmojis ? '📊' : '';
    
    let analysis_text = `${emoji} Market Analysis: `;
    
    // Volume analysis
    if (metrics.volume24h && metrics.marketCap) {
      const volumeRatio = metrics.volume24h / metrics.marketCap;
      if (volumeRatio > 0.3) {
        analysis_text += `Volume is INSANE (${(volumeRatio * 100).toFixed(1)}% of market cap)! `;
      } else if (volumeRatio < 0.05) {
        analysis_text += `Volume is pretty dead (${(volumeRatio * 100).toFixed(1)}% of market cap)... `;
      }
    }
    
    // Price action
    if (metrics.priceChange24h) {
      if (metrics.priceChange24h > 20) {
        analysis_text += `Price is MOONING with ${metrics.priceChange24h.toFixed(1)}% gains! `;
      } else if (metrics.priceChange24h < -20) {
        analysis_text += `Price got REKT with ${Math.abs(metrics.priceChange24h).toFixed(1)}% losses! `;
      }
    }
    
    // Liquidity warning
    if (analysis.liquidityRisk === 'HIGH') {
      analysis_text += `⚠️ LIQUIDITY RISK IS HIGH - you might get stuck in your bags! `;
    }
    
    return analysis_text;
  }

  private buildRiskAssessment(
    analysis: HypeAnalysis,
    config: ChainOfThoughtConfig
  ): string {
    let risk = `Degen Rating: ${analysis.degenRating} `;
    
    switch (analysis.degenRating) {
      case 'ULTRA_DEGEN':
        risk += `🎰 This is MAXIMUM RISK territory! Only bet what you can afford to lose completely! `;
        break;
      case 'DEGEN':
        risk += `💎 High risk but potential for massive gains - classic degen play! `;
        break;
      case 'RISKY':
        risk += `⚡ Moderate risk - size your position carefully! `;
        break;
      case 'SAFE':
        risk += `😇 Relatively low risk - boring but steady! `;
        break;
    }
    
    if (config.includeRiskWarnings) {
      risk += `Remember: This is pure speculation, not financial advice! DYOR and never invest more than you can afford to lose! `;
    }
    
    return risk;
  }

  private buildDegenCommentary(
    decision: TradingDecision,
    analysis: HypeAnalysis,
    insights: string[],
    useEmojis: boolean
  ): string {
    const emojis = useEmojis ? ['🚀', '💎', '🙌', '🔥', '💰', '🌙'] : [];
    const randomEmoji = () => emojis.length > 0 ? emojis[Math.floor(Math.random() * emojis.length)] : '';
    
    let commentary = `${randomEmoji()} DEGEN ALERT! ${randomEmoji()} `;
    
    commentary += `${decision.tokenSymbol} at $${decision.currentPrice} is looking `;
    commentary += decision.decision === 'LONG' ? 'SPICY' : 'SUS';
    commentary += ` right now! `;
    
    // Add confidence-based commentary
    if (decision.confidence > 80) {
      commentary += `I'm ${decision.confidence}% confident - this is DIAMOND HANDS territory! `;
    } else if (decision.confidence < 60) {
      commentary += `Only ${decision.confidence}% confident - proceed with caution, fellow degens! `;
    }
    
    // Add action recommendation
    if (decision.decision === 'LONG') {
      commentary += `Time to APE IN if you've got the diamond hands for it! `;
    } else {
      commentary += `STAY AWAY or consider shorting if you're feeling extra degen! `;
    }
    
    // Add WAGMI or warning
    if (analysis.overallHype > 60 && decision.decision === 'LONG') {
      commentary += `WAGMI if this plays out! `;
    } else if (analysis.degenRating === 'ULTRA_DEGEN') {
      commentary += `Don't get REKT - this is maximum degen territory! `;
    }
    
    commentary += `${randomEmoji()} Not financial advice, just pure degen energy! ${randomEmoji()}`;
    
    return commentary;
  }

  private calculatePriceTargets(
    decision: TradingDecision,
    analysis: HypeAnalysis
  ): { bullish: number; bearish: number } {
    const currentPrice = decision.currentPrice;
    
    // Base multipliers
    let bullishMultiplier = 1.5;
    let bearishMultiplier = 0.7;
    
    // Adjust based on hype and momentum
    if (analysis.overallHype > 80) {
      bullishMultiplier += 0.5; // More aggressive targets for high hype
    }
    
    if (analysis.momentumScore > 80) {
      bullishMultiplier += 0.3;
    }
    
    // Adjust based on degen rating
    switch (analysis.degenRating) {
      case 'ULTRA_DEGEN':
        bullishMultiplier *= 2; // 100x potential
        bearishMultiplier *= 0.5; // But could go to zero
        break;
      case 'DEGEN':
        bullishMultiplier *= 1.5;
        bearishMultiplier *= 0.7;
        break;
    }
    
    return {
      bullish: currentPrice * bullishMultiplier,
      bearish: currentPrice * bearishMultiplier
    };
  }

  private formatReasoning(reasoning: string, config: ChainOfThoughtConfig): string {
    return this.truncateText(reasoning, config.maxReasoningLength);
  }

  private formatMarketAnalysis(analysis: string, hypeAnalysis: HypeAnalysis, config: ChainOfThoughtConfig): string {
    return analysis;
  }

  private formatRiskAssessment(assessment: string, hypeAnalysis: HypeAnalysis, config: ChainOfThoughtConfig): string {
    if (config.includeRiskWarnings && !assessment.includes('not financial advice')) {
      assessment += ' Remember: This is not financial advice, DYOR!';
    }
    return assessment;
  }

  private formatDegenCommentary(commentary: string, config: ChainOfThoughtConfig): string {
    return commentary;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}