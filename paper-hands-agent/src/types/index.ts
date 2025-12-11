// Core Agent Types
export interface IAgent {
  id: string;
  initialize(tokenSymbol: string): Promise<void>;
  processMarketData(data: MarketData): Promise<void>;
  generateSignal(): Promise<PanicSignal | null>;
  getPersonalityResponse(context: string): string;
}

export interface AgentState {
  id: string;
  agentType: 'PAPER_HANDS';
  currentToken: string;
  entryPrice: number | null;
  currentPrice: number;
  position: 'LONG' | 'CASH';
  anxietyLevel: number; // 1-10 scale
  lastSignalTime: Date;
  totalPanicSells: number;
  totalCorrectCalls: number;
}

// Technical Analysis Types
export interface ITechnicalAnalysis {
  calculateRSI(prices: number[], period: number): number;
  calculateBollingerBands(prices: number[], period: number): BollingerBands;
  getCurrentProfit(entryPrice: number, currentPrice: number): number;
  isVolatilityHigh(data: MarketData): boolean;
}

export interface TechnicalIndicators {
  rsi: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  currentProfit: number;
  volatilityScore: number;
  priceChange24h: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

// Market Data Types
export interface MarketData {
  symbol: string;
  price: number;
  timestamp: Date;
  volume: number;
  priceHistory: number[];
  change24h: number;
}

// Signal Types
export interface PanicSignal {
  id: string;
  agentId: string;
  signalType: 'PANIC_SELL' | 'TAKE_PROFIT' | 'STAY_CASH';
  timestamp: Date;
  triggerConditions: {
    rsi?: number;
    profit?: number;
    volatility?: number;
    fearFactor: number;
  };
  encryptedReasoning: string;
  marketPrice: number;
  predictedOutcome: 'PAPER_HANDS' | 'SAVED_BAG';
}

export interface ChainOfThought {
  signalId: string;
  reasoning: string;
  technicalAnalysis: TechnicalIndicators;
  emotionalFactors: string[];
  riskAssessment: string;
  finalDecision: string;
  confidenceLevel: number;
}

// Personality Types
export interface PersonalityTraits {
  anxietyLevel: number;
  riskAversion: number;
  fearPhrases: string[];
  panicThresholds: {
    rsiThreshold: number;
    profitThreshold: number;
    volatilityThreshold: number;
  };
}

// Prediction Market Types
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

// JSON Output Types
export interface AgentOutput {
  agentId: string;
  timestamp: Date;
  signalType?: 'PANIC_SELL' | 'TAKE_PROFIT' | 'STAY_CASH';
  agentState: {
    position: 'LONG' | 'CASH';
    anxietyLevel: number;
    currentPrice: number;
    panicLevel?: number;
    emotionalState?: string;
  };
  technicalAnalysis?: TechnicalIndicators;
  encryptedReasoning?: string;
  predictionMarket?: {
    id: string;
    options: string[];
  };
}

// Error Types
export interface AgentError extends Error {
  code: string;
  context?: any;
}

// Configuration Types
export interface AgentConfig {
  tokenSymbol: string;
  rsiPeriod: number;
  bollingerPeriod: number;
  panicThresholds: {
    rsi: number;
    profit: number;
    volatility: number;
  };
  personalitySettings: {
    anxietyLevel: number;
    fearPhrases: string[];
  };
}