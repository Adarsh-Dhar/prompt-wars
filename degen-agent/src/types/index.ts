// Core TypeScript interfaces for RektOrRich Agent

export interface TradingDecision {
  id: string;
  tokenSymbol: string;
  decision: 'LONG' | 'SHORT';
  confidence: number; // 0-100
  timestamp: Date;
  currentPrice: number;
  chainOfThought?: string; // Only populated after payment (legacy)
  chainOfThoughtParts?: ThoughtPart[]; // New Flash Thinking chain-of-thought
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

// Flash Thinking interfaces
export interface ThoughtPart {
  text: string;
  thought: boolean;
  order: number;
  timestamp: number;
  tokenCount?: number;
}

export interface DegenAnalysisResponse {
  tokenSymbol: string;
  decision: 'LONG' | 'SHORT' | 'HOLD';
  confidence: number;
  publicSummary: string;
  finalAnswer: string;
  chainOfThought: ThoughtPart[];
  marketAnalysis?: string;
  priceTargets?: { bullish: number; bearish: number };
  totalTokens: number;
  thoughtTokens: number;
}

export interface StreamingEvent {
  type: 'thinking' | 'final-part' | 'final' | 'error';
  data: {
    text?: string;
    order?: number;
    timestamp?: number;
    isComplete?: boolean;
    error?: string;
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

export interface PremiumLogEntry {
  id: string;
  agent: string;
  tokenSymbol: string;
  finalAnswer: string;
  chainOfThought: ThoughtPart[];
  publicSummary: string;
  createdAt: Date;
  isPremium: boolean;
  encrypted: boolean;
  totalTokens: number;
  thoughtTokens: number;
  transactionSignature?: string;
}