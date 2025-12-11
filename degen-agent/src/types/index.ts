// Core TypeScript interfaces for RektOrRich Agent

export interface TradingDecision {
  id: string;
  tokenSymbol: string;
  decision: 'LONG' | 'SHORT';
  confidence: number; // 0-100
  timestamp: Date;
  currentPrice: number;
  chainOfThought?: string; // Only populated after payment
  isUnlocked: boolean;
  marketId?: string;
}

export interface ChainOfThought {
  decisionId: string;
  reasoning: string;
  marketAnalysis: string;
  riskAssessment: string;
  degenCommentary: string;
  priceTargets: {
    bullish: number;
    bearish: number;
  };
}

export interface PredictionMarket {
  id: string;
  decisionId: string;
  totalPool: number;
  winBets: number;
  lossBets: number;
  resolutionTime: Date;
  isResolved: boolean;
  outcome?: 'WIN' | 'LOSS';
}

export interface UserBet {
  id: string;
  userId: string;
  marketId: string;
  prediction: 'WIN' | 'LOSS';
  amount: number;
  timestamp: Date;
  isWinning?: boolean;
  payout?: number;
}

export interface DegenAgent {
  personality: {
    riskTolerance: 'EXTREME' | 'HIGH' | 'MODERATE';
    tradingStyle: 'MOMENTUM' | 'CONTRARIAN' | 'HYPE_DRIVEN';
    slangIntensity: number; // 1-10 scale
  };
  performance: {
    totalPredictions: number;
    correctPredictions: number;
    averageReturn: number;
    winStreak: number;
  };
}

export interface PaymentVerification {
  transactionSignature: string;
  amount: number;
  sender: string;
  recipient: string;
  timestamp: Date;
  isVerified: boolean;
  contentId: string;
}