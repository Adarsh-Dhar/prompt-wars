/**
 * Token analysis logic that prioritizes hype and sentiment over fundamentals
 */

export interface TokenMetrics {
  symbol: string;
  price: number;
  volume24h?: number;
  marketCap?: number;
  priceChange24h?: number;
  socialSentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  hypeScore?: number; // 1-100 scale
  liquidityScore?: number; // 1-100 scale
  memeScore?: number; // 1-100 scale
}

export interface HypeAnalysis {
  overallHype: number; // 1-100
  sentimentScore: number; // -100 to 100
  momentumScore: number; // 1-100
  liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  memeViability: 'WEAK' | 'MODERATE' | 'STRONG';
  degenRating: 'SAFE' | 'RISKY' | 'DEGEN' | 'ULTRA_DEGEN';
}

export class TokenAnalyzer {
  
  /**
   * Analyze token with degen priorities: hype > momentum > liquidity > memes > fundamentals
   */
  analyzeToken(metrics: TokenMetrics): HypeAnalysis {
    const hypeScore = this.calculateHypeScore(metrics);
    const sentimentScore = this.calculateSentimentScore(metrics);
    const momentumScore = this.calculateMomentumScore(metrics);
    const liquidityRisk = this.assessLiquidityRisk(metrics);
    const memeViability = this.assessMemeViability(metrics);
    const degenRating = this.calculateDegenRating(hypeScore, momentumScore, liquidityRisk);

    return {
      overallHype: hypeScore,
      sentimentScore,
      momentumScore,
      liquidityRisk,
      memeViability,
      degenRating
    };
  }

  private calculateHypeScore(metrics: TokenMetrics): number {
    let score = 50; // Base score

    // Social sentiment impact (highest priority)
    if (metrics.socialSentiment === 'BULLISH') score += 30;
    else if (metrics.socialSentiment === 'BEARISH') score -= 20;

    // Hype score from external sources
    if (metrics.hypeScore) {
      score = (score + metrics.hypeScore) / 2;
    }

    // Volume indicates interest/hype
    if (metrics.volume24h && metrics.marketCap) {
      const volumeRatio = metrics.volume24h / metrics.marketCap;
      if (volumeRatio > 0.5) score += 20; // High volume = hype
      else if (volumeRatio > 0.2) score += 10;
      else if (volumeRatio < 0.05) score -= 15; // Low volume = dead
    }

    // Price action momentum
    if (metrics.priceChange24h) {
      if (metrics.priceChange24h > 20) score += 25; // Pumping hard
      else if (metrics.priceChange24h > 5) score += 15; // Steady pump
      else if (metrics.priceChange24h < -20) score -= 25; // Dumping hard
      else if (metrics.priceChange24h < -5) score -= 15; // Steady dump
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateSentimentScore(metrics: TokenMetrics): number {
    let sentiment = 0;

    // Social sentiment is primary driver
    switch (metrics.socialSentiment) {
      case 'BULLISH': sentiment += 60; break;
      case 'BEARISH': sentiment -= 60; break;
      case 'NEUTRAL': sentiment += 0; break;
    }

    // Price momentum affects sentiment
    if (metrics.priceChange24h) {
      sentiment += metrics.priceChange24h * 2; // Amplify price impact
    }

    // Hype amplifies sentiment
    if (metrics.hypeScore && metrics.hypeScore > 70) {
      sentiment += 20;
    }

    return Math.min(100, Math.max(-100, sentiment));
  }

  private calculateMomentumScore(metrics: TokenMetrics): number {
    let momentum = 50; // Neutral base

    // Price change is primary momentum indicator
    if (metrics.priceChange24h) {
      momentum += metrics.priceChange24h * 2;
    }

    // Volume confirms momentum
    if (metrics.volume24h && metrics.marketCap) {
      const volumeRatio = metrics.volume24h / metrics.marketCap;
      if (volumeRatio > 0.3) momentum += 20; // High volume confirms momentum
      else if (volumeRatio < 0.05) momentum -= 20; // Low volume = weak momentum
    }

    return Math.min(100, Math.max(0, momentum));
  }

  private assessLiquidityRisk(metrics: TokenMetrics): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!metrics.volume24h || !metrics.marketCap) return 'HIGH';

    const volumeRatio = metrics.volume24h / metrics.marketCap;
    
    if (volumeRatio > 0.2) return 'LOW'; // Good liquidity
    if (volumeRatio > 0.05) return 'MEDIUM'; // Moderate liquidity
    return 'HIGH'; // Poor liquidity - degen territory
  }

  private assessMemeViability(metrics: TokenMetrics): 'WEAK' | 'MODERATE' | 'STRONG' {
    let memeScore = 0;

    // Meme score from external analysis
    if (metrics.memeScore) {
      memeScore = metrics.memeScore;
    } else {
      // Estimate based on other factors
      if (metrics.hypeScore && metrics.hypeScore > 80) memeScore += 40;
      if (metrics.socialSentiment === 'BULLISH') memeScore += 30;
      if (metrics.priceChange24h && metrics.priceChange24h > 50) memeScore += 30; // Explosive moves = meme potential
    }

    if (memeScore > 70) return 'STRONG';
    if (memeScore > 40) return 'MODERATE';
    return 'WEAK';
  }

  private calculateDegenRating(hype: number, momentum: number, liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH'): 'SAFE' | 'RISKY' | 'DEGEN' | 'ULTRA_DEGEN' {
    let degenPoints = 0;

    // High hype = more degen
    if (hype > 80) degenPoints += 3;
    else if (hype > 60) degenPoints += 2;
    else if (hype < 30) degenPoints -= 1;

    // Extreme momentum = degen
    if (momentum > 80 || momentum < 20) degenPoints += 2;

    // Liquidity risk adds degen points
    switch (liquidityRisk) {
      case 'HIGH': degenPoints += 3; break;
      case 'MEDIUM': degenPoints += 1; break;
      case 'LOW': degenPoints -= 1; break;
    }

    if (degenPoints >= 6) return 'ULTRA_DEGEN';
    if (degenPoints >= 4) return 'DEGEN';
    if (degenPoints >= 2) return 'RISKY';
    return 'SAFE';
  }

  /**
   * Generate degen-focused market insights
   */
  generateDegenInsights(analysis: HypeAnalysis, metrics: TokenMetrics): string[] {
    const insights: string[] = [];

    // Hype-based insights
    if (analysis.overallHype > 80) {
      insights.push("🔥 MAXIMUM HYPE DETECTED! This token is trending HARD on crypto Twitter!");
    } else if (analysis.overallHype < 30) {
      insights.push("😴 Low hype levels - might be a sleeper or just dead...");
    }

    // Momentum insights
    if (analysis.momentumScore > 80) {
      insights.push("🚀 MOMENTUM IS INSANE! Price action is going parabolic!");
    } else if (analysis.momentumScore < 20) {
      insights.push("📉 Momentum is REKT - this could be a falling knife!");
    }

    // Liquidity warnings
    if (analysis.liquidityRisk === 'HIGH') {
      insights.push("⚠️ LIQUIDITY RISK! You might get stuck in your bags!");
    }

    // Meme potential
    if (analysis.memeViability === 'STRONG') {
      insights.push("🐸 STRONG MEME POTENTIAL! This could go viral!");
    }

    // Degen rating insights
    switch (analysis.degenRating) {
      case 'ULTRA_DEGEN':
        insights.push("🎰 ULTRA DEGEN PLAY! Only diamond hands survive this!");
        break;
      case 'DEGEN':
        insights.push("💎 Classic degen territory - high risk, high reward!");
        break;
      case 'RISKY':
        insights.push("⚡ Risky but manageable - size your position accordingly!");
        break;
      case 'SAFE':
        insights.push("😇 Relatively safe play - boring but steady!");
        break;
    }

    return insights;
  }
}