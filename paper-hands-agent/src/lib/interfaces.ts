import {
  IAgent,
  ITechnicalAnalysis,
  AgentState,
  MarketData,
  PanicSignal,
  ChainOfThought,
  PersonalityTraits,
  TechnicalIndicators,
  PredictionMarket,
  AgentOutput
} from '../types/index.js';

/**
 * Core agent interface that all trading agents must implement
 */
export interface IPaperHandsAgent extends IAgent {
  getState(): AgentState;
  updateAnxietyLevel(level: number): void;
  isInPanicMode(): boolean;
}

/**
 * Technical analysis engine interface
 */
export interface ITechnicalAnalysisEngine extends ITechnicalAnalysis {
  updatePriceData(prices: number[]): void;
  getLatestIndicators(): TechnicalIndicators;
  checkSellTriggers(currentPrice: number, entryPrice: number): boolean;
}

/**
 * Personality generator interface for creating anxious responses
 */
export interface IPersonalityGenerator {
  generateResponse(context: string, anxietyLevel: number): string;
  getRandomFearPhrase(): string;
  generateDefensiveResponse(volatilityLevel: number): string;
  isResponseConsistent(response: string): boolean;
}

/**
 * Signal generator interface for creating panic sell signals
 */
export interface ISignalGenerator {
  createPanicSignal(
    agentId: string,
    triggerConditions: any,
    marketPrice: number
  ): PanicSignal;
  encryptReasoning(reasoning: ChainOfThought): string;
  validateSignal(signal: PanicSignal): boolean;
}

/**
 * Chain of thought processor interface
 */
export interface IChainOfThoughtProcessor {
  generateReasoning(
    technicalAnalysis: TechnicalIndicators,
    marketData: MarketData,
    agentState: AgentState
  ): ChainOfThought;
  includeEmotionalFactors(reasoning: ChainOfThought, anxietyLevel: number): ChainOfThought;
  validateReasoningCompleteness(reasoning: ChainOfThought): boolean;
}

/**
 * Content encryption service interface
 */
export interface IContentEncryption {
  encrypt(content: string): string;
  decrypt(encryptedContent: string): string;
  isValidEncryption(encryptedContent: string): boolean;
}

/**
 * Payment verification interface
 */
export interface IPaymentVerification {
  verifyPayment(paymentId: string): Promise<boolean>;
  isPaymentRequired(contentId: string): boolean;
  gateContent(content: string, paymentId: string): string;
}

/**
 * Prediction market interface
 */
export interface IPredictionMarket {
  createMarket(signal: PanicSignal): Promise<PredictionMarket>;
  recordBet(marketId: string, userId: string, option: string, amount: number): Promise<void>;
  resolveMarket(marketId: string, outcome: string): Promise<void>;
  getMarketById(marketId: string): Promise<PredictionMarket | null>;
}

/**
 * JSON output formatter interface
 */
export interface IOutputFormatter {
  formatAgentOutput(
    agentState: AgentState,
    signal?: PanicSignal,
    technicalAnalysis?: TechnicalIndicators
  ): AgentOutput;
  validateOutputFormat(output: AgentOutput): boolean;
  includeEncryptedReasoning(output: AgentOutput, encryptedReasoning: string): AgentOutput;
}

/**
 * Volatility detector interface
 */
export interface IVolatilityDetector {
  detectVolatility(marketData: MarketData): number;
  isHighVolatility(volatilityScore: number): boolean;
  generateVolatilityResponse(volatilityScore: number): string;
}