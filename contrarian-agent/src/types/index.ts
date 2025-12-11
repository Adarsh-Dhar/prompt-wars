// Core TypeScript interfaces for Contrarian Agent

// Base Agent Interface (following existing patterns)
export interface IAgent {
  id: string;
  initialize(tokenSymbol?: string): Promise<void>;
  processMarketData(data: MarketData): Promise<void>;
  generateSignal(): Promise<ContrarianSignal | null>;
  getPersonalityResponse(context: string): string;
}

// Extended Contrarian Agent Interface
export interface IContrarianAgent extends IAgent {
  fetchMarketSentiment(tokenSymbol?: string): Promise<SentimentData>;
  generateContrarianSignal(sentimentData: SentimentData): Promise<ContrarianSignal>;
  generateSmugRant(signal: ContrarianSignal): Promise<string>;
}

// Sentiment Data Interfaces
export interface SentimentData {
  fearGreedIndex: {
    value: number;        // 0-100 scale
    classification: string; // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
    timestamp: Date;
  };
  communityData?: {
    tokenSymbol: string;
    sentiment: number;    // 0-100 scale
    bullishPercentage: number;
    bearishPercentage: number;
    source: 'coingecko' | 'alternative';
  };
}

export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

export interface CommunityData {
  tokenSymbol: string;
  sentiment: number;
  bullishPercentage: number;
  bearishPercentage: number;
  source: 'coingecko' | 'alternative';
}

// Signal Interfaces
export interface ContrarianSignal {
  id: string;
  agentId: string;
  signalType: 'BUY' | 'SELL';
  timestamp: Date;
  confidence: number;   // 0-100
  triggerConditions: {
    fearGreedValue: number;
    communityBullish?: number;
    isExtremeCondition: boolean;
  };
  encryptedReasoning: string;
  marketPrice?: number;
  predictionOptions: {
    knifeChatcher: string;  // "Agent buying too early (Rekt)"
    alphaGod: string;       // "Agent buying the bottom (Rich)"
  };
}

export interface ContrarianDecision {
  signalType: 'BUY' | 'SELL';
  confidence: number;
  isExtremeCondition: boolean;
  reasoning: string;
}

// Agent State Interface
export interface ContrarianAgentState {
  id: string;
  agentType: 'CONTRARIAN';
  currentToken?: string;
  lastSignalTime: Date;
  smugnessLevel: number;  // 1-10 scale
  totalContrarianCalls: number;
  correctCalls: number;
  extremeConditionCalls: number;
  personalityMode: 'SMUG' | 'SUPERIOR' | 'CYNICAL';
}

// Market Data Interface (compatible with existing agents)
export interface MarketData {
  symbol: string;
  price: number;
  timestamp: Date;
  volume: number;
  priceHistory: number[];
  change24h: number;
}

// Service Interfaces
export interface ISentimentFetcher {
  getFearGreedIndex(): Promise<FearGreedData>;
  getCommunitysentiment(tokenSymbol: string): Promise<CommunityData>;
  validateSentimentData(data: any): boolean;
}

export interface ISignalGenerator {
  processContrarianLogic(sentimentData: SentimentData): ContrarianDecision;
  calculateConfidence(fearGreed: number, community?: number): number;
  determineExtremeConditions(fearGreed: number): boolean;
}

export interface IContrarianBrain {
  generateSmugRant(signal: ContrarianSignal, sentimentData: SentimentData): string;
  getPersonalityResponse(context: string): string;
  getContrarianPhrases(isExtreme: boolean): string[];
}

// Prediction Market Interfaces (compatible with existing system)
export interface PredictionMarket {
  id: string;
  signalId: string;
  title: string;
  description: string;
  options: PredictionOption[];
  createdAt: Date;
  resolvedAt?: Date;
  outcome?: string;
}

export interface PredictionOption {
  id: string;
  title: string;
  description: string;
  odds: number;
}

export interface UserBet {
  id: string;
  userId: string;
  marketId: string;
  prediction: 'KNIFE_CATCHER' | 'ALPHA_GOD';
  amount: number;
  timestamp: Date;
  isWinning?: boolean;
  payout?: number;
}

// Payment Interfaces (compatible with existing x402 system)
export interface PaymentVerification {
  transactionSignature: string;
  amount: number;
  sender: string;
  recipient: string;
  timestamp: Date;
  isVerified: boolean;
  contentId: string;
}

// JSON Output Interface
export interface ContrarianAgentOutput {
  agentId: string;
  timestamp: Date;
  signalType: 'BUY' | 'SELL';
  agentState: {
    smugnessLevel: number;
    personalityMode: string;
    totalCalls: number;
    correctCalls: number;
  };
  sentimentAnalysis: {
    fearGreedIndex: number;
    classification: string;
    communityBullish?: number;
    isExtremeCondition: boolean;
  };
  encryptedReasoning: string;
  predictionMarket: {
    id: string;
    options: string[];
  };
  confidence: number;
}

// Error Interface
export interface ContrarianAgentError extends Error {
  code: string;
  context?: any;
}

// Configuration Interface
export interface ContrarianAgentConfig {
  tokenSymbol?: string;
  apiKeys: {
    coinGecko?: string;
    openai?: string;
  };
  thresholds: {
    fearGreedSellThreshold: number;  // Default: 60
    extremeConditionThreshold: number; // Default: 80
    bullishReinforcementThreshold: number; // Default: 70
    bearishReinforcementThreshold: number; // Default: 30
  };
  personalitySettings: {
    smugnessLevel: number;
    personalityMode: 'SMUG' | 'SUPERIOR' | 'CYNICAL';
    catchphrases: string[];
  };
  cacheSettings: {
    refreshIntervalMinutes: number; // Default: 5
    maxCacheAge: number; // Default: 300000 (5 minutes in ms)
  };
}

// Cache Interface
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

export interface SentimentCache {
  fearGreedIndex?: CacheEntry<FearGreedData>;
  communityData?: Map<string, CacheEntry<CommunityData>>;
}