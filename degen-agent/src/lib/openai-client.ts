/**
 * OpenAI API integration for generating trading commentary with crypto slang
 */

import { TradingDecision, ChainOfThought } from '../types';
import { generateDegenPrompt, DegenPersonalityConfig, DEFAULT_DEGEN_PERSONALITY } from './degen_brain';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface TokenAnalysisRequest {
  tokenSymbol: string;
  currentPrice: number;
  marketData?: any;
  personality?: DegenPersonalityConfig;
}

export interface DegenAnalysisResponse {
  decision: 'LONG' | 'SHORT';
  confidence: number;
  reasoning: string;
  marketAnalysis: string;
  riskAssessment: string;
  degenCommentary: string;
  priceTargets: {
    bullish: number;
    bearish: number;
  };
}

export class OpenAIDegenClient {
  private config: OpenAIConfig;

  constructor(config: Partial<OpenAIConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
      model: config.model || 'gpt-4',
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.8, // Higher temperature for more chaotic responses
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async generateTradingCommentary(request: TokenAnalysisRequest): Promise<DegenAnalysisResponse> {
    const prompt = generateDegenPrompt(
      request.tokenSymbol,
      request.currentPrice,
      request.marketData,
      request.personality || DEFAULT_DEGEN_PERSONALITY
    );

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: `Analyze ${request.tokenSymbol} at $${request.currentPrice}. Give me your full degen analysis with LONG/SHORT decision, confidence level, reasoning, and price targets. Use maximum crypto slang! 🚀`
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI API');
      }

      return this.parseDegenResponse(content, request.currentPrice);
    } catch (error) {
      console.error('Error generating trading commentary:', error);
      // Fallback response with degen personality
      return this.generateFallbackResponse(request.tokenSymbol, request.currentPrice);
    }
  }

  private parseDegenResponse(content: string, currentPrice: number): DegenAnalysisResponse {
    // Parse the AI response to extract structured data
    // This is a simplified parser - in production, you'd want more robust parsing
    
    const lines = content.split('\n').filter(line => line.trim());
    
    // Extract decision (LONG/SHORT)
    const decisionMatch = content.match(/\b(LONG|SHORT)\b/i);
    const decision = decisionMatch ? decisionMatch[1].toUpperCase() as 'LONG' | 'SHORT' : 'LONG';
    
    // Extract confidence level
    const confidenceMatch = content.match(/confidence[:\s]*(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;
    
    // Extract price targets
    const bullishMatch = content.match(/bullish[:\s]*\$?(\d+(?:\.\d+)?)/i);
    const bearishMatch = content.match(/bearish[:\s]*\$?(\d+(?:\.\d+)?)/i);
    
    const bullishTarget = bullishMatch ? parseFloat(bullishMatch[1]) : currentPrice * 1.5;
    const bearishTarget = bearishMatch ? parseFloat(bearishMatch[1]) : currentPrice * 0.7;

    return {
      decision,
      confidence: Math.min(100, Math.max(0, confidence)),
      reasoning: this.extractSection(content, ['reasoning', 'analysis']) || 'Pure degen vibes analysis! 🚀',
      marketAnalysis: this.extractSection(content, ['market', 'momentum']) || 'Market is looking spicy! 🌶️',
      riskAssessment: this.extractSection(content, ['risk', 'warning']) || 'High risk, high reward - classic degen play! 💎',
      degenCommentary: content, // Full response as degen commentary
      priceTargets: {
        bullish: bullishTarget,
        bearish: bearishTarget
      }
    };
  }

  private extractSection(content: string, keywords: string[]): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      for (const keyword of keywords) {
        if (line.toLowerCase().includes(keyword)) {
          return line.trim();
        }
      }
    }
    return null;
  }

  private generateFallbackResponse(tokenSymbol: string, currentPrice: number): DegenAnalysisResponse {
    // Fallback response when OpenAI API fails
    const isLong = Math.random() > 0.5;
    
    return {
      decision: isLong ? 'LONG' : 'SHORT',
      confidence: Math.floor(Math.random() * 40) + 60, // 60-100 confidence
      reasoning: `${tokenSymbol} is giving me major ${isLong ? 'bullish' : 'bearish'} vibes right now! The charts are speaking to my degen soul! 📈`,
      marketAnalysis: `Market momentum is ${isLong ? 'PUMPING' : 'DUMPING'} and I can feel it in my diamond hands! 💎🙌`,
      riskAssessment: 'This is pure degen territory - high risk but WAGMI if we\'re right! 🚀',
      degenCommentary: `ATTENTION DEGENS! 🚨 ${tokenSymbol} at $${currentPrice} is looking ${isLong ? 'SPICY' : 'SUS'} right now! ${isLong ? 'APE IN' : 'STAY AWAY'} if you have diamond hands! This is not financial advice, just pure degen energy! WAGMI! 🌙💰`,
      priceTargets: {
        bullish: currentPrice * (isLong ? 2.0 : 1.2),
        bearish: currentPrice * (isLong ? 0.8 : 0.5)
      }
    };
  }

  async createTradingDecision(request: TokenAnalysisRequest): Promise<TradingDecision> {
    const analysis = await this.generateTradingCommentary(request);
    
    return {
      id: this.generateId(),
      tokenSymbol: request.tokenSymbol,
      decision: analysis.decision,
      confidence: analysis.confidence,
      timestamp: new Date(),
      currentPrice: request.currentPrice,
      chainOfThought: undefined, // Will be populated after payment
      isUnlocked: false,
      marketId: undefined
    };
  }

  async createChainOfThought(request: TokenAnalysisRequest): Promise<ChainOfThought> {
    const analysis = await this.generateTradingCommentary(request);
    
    return {
      decisionId: this.generateId(),
      reasoning: analysis.reasoning,
      marketAnalysis: analysis.marketAnalysis,
      riskAssessment: analysis.riskAssessment,
      degenCommentary: analysis.degenCommentary,
      priceTargets: analysis.priceTargets
    };
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}