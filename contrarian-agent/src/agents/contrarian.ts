/**
 * Main Contrarian Agent Implementation
 * Integrates all modules to provide contrarian trading signals with smug reasoning
 */

import { 
  IContrarianAgent, 
  ContrarianSignal, 
  SentimentData, 
  MarketData, 
  ContrarianAgentState,
  ContrarianAgentOutput,
  ContrarianAgentConfig,
  ContrarianAgentError
} from '../types/index.js';

import { SentimentFetcher } from '../lib/sentiment-fetcher.js';
import { SignalGenerator } from '../lib/signal-generator.js';
import { ContrarianBrain } from '../lib/contrarian-brain.js';
import { ContrarianPaymentService } from '../lib/payment-verification.js';
import { ContrarianMarketIntegration } from '../lib/market-integration.js';

export class ContrarianAgent implements IContrarianAgent {
  public readonly id: string;
  private state: ContrarianAgentState;
  private config: ContrarianAgentConfig;
  
  // Core modules
  private sentimentFetcher: SentimentFetcher;
  private signalGenerator: SignalGenerator;
  private contrarianBrain: ContrarianBrain;
  private paymentService: ContrarianPaymentService;
  private marketIntegration: ContrarianMarketIntegration;
  
  // Error handling
  private lastError: ContrarianAgentError | null = null;

  constructor(config: Partial<ContrarianAgentConfig> = {}) {
    this.id = `contrarian-agent-${Date.now()}`;
    
    // Initialize configuration with defaults
    this.config = {
      tokenSymbol: config.tokenSymbol,
      apiKeys: {
        coinGecko: config.apiKeys?.coinGecko || process.env.COINGECKO_API_KEY,
        openai: config.apiKeys?.openai || process.env.GEMINI_API_KEY
      },
      thresholds: {
        fearGreedSellThreshold: config.thresholds?.fearGreedSellThreshold || 60,
        extremeConditionThreshold: config.thresholds?.extremeConditionThreshold || 80,
        bullishReinforcementThreshold: config.thresholds?.bullishReinforcementThreshold || 70,
        bearishReinforcementThreshold: config.thresholds?.bearishReinforcementThreshold || 30
      },
      personalitySettings: {
        smugnessLevel: config.personalitySettings?.smugnessLevel || 8,
        personalityMode: config.personalitySettings?.personalityMode || 'SMUG',
        catchphrases: config.personalitySettings?.catchphrases || []
      },
      cacheSettings: {
        refreshIntervalMinutes: config.cacheSettings?.refreshIntervalMinutes || 5,
        maxCacheAge: config.cacheSettings?.maxCacheAge || 300000
      }
    };

    // Initialize agent state
    this.state = {
      id: this.id,
      agentType: 'CONTRARIAN',
      currentToken: this.config.tokenSymbol,
      lastSignalTime: new Date(0), // Epoch start
      smugnessLevel: this.config.personalitySettings.smugnessLevel,
      totalContrarianCalls: 0,
      correctCalls: 0,
      extremeConditionCalls: 0,
      personalityMode: this.config.personalitySettings.personalityMode
    };

    // Initialize modules
    this.initializeModules();
  }

  /**
   * Initialize all agent modules
   */
  private initializeModules(): void {
    try {
      this.sentimentFetcher = new SentimentFetcher(
        this.config.cacheSettings.refreshIntervalMinutes
      );

      this.signalGenerator = new SignalGenerator(
        this.config.thresholds.fearGreedSellThreshold,
        this.config.thresholds.extremeConditionThreshold,
        this.config.thresholds.bullishReinforcementThreshold,
        this.config.thresholds.bearishReinforcementThreshold
      );

      this.contrarianBrain = new ContrarianBrain(
        this.config.personalitySettings.smugnessLevel,
        this.config.personalitySettings.personalityMode
      );

      this.paymentService = new ContrarianPaymentService(
        process.env.SOLANA_RPC_ENDPOINT,
        parseFloat(process.env.PRICE_SOL || '0.001'),
        process.env.SERVER_WALLET
      );

      this.marketIntegration = new ContrarianMarketIntegration(
        this.id,
        process.env.FRONTEND_URL,
        process.env.AGENT_SERVER_URL
      );

      console.log(`Contrarian Agent ${this.id} initialized successfully`);
    } catch (error) {
      this.handleError('MODULE_INITIALIZATION_FAILED', error as Error);
      throw error;
    }
  }

  /**
   * Initialize agent with optional token symbol
   */
  async initialize(tokenSymbol?: string): Promise<void> {
    try {
      if (tokenSymbol) {
        this.config.tokenSymbol = tokenSymbol;
        this.state.currentToken = tokenSymbol;
      }

      // Register with frontend system
      await this.marketIntegration.registerAgent();
      
      // Update agent status
      await this.marketIntegration.updateAgentStatus({
        isActive: true,
        lastSignalTime: this.state.lastSignalTime,
        currentAnalysis: `Monitoring ${tokenSymbol || 'market'} for contrarian opportunities`,
        performanceStats: this.marketIntegration.getPerformanceStats()
      });

      console.log(`Contrarian Agent initialized for ${tokenSymbol || 'general market analysis'}`);
    } catch (error) {
      this.handleError('INITIALIZATION_FAILED', error as Error);
      throw error;
    }
  }

  /**
   * Process market data and update internal state
   */
  async processMarketData(data: MarketData): Promise<void> {
    try {
      // Update current token if different
      if (data.symbol !== this.state.currentToken) {
        this.state.currentToken = data.symbol;
        this.config.tokenSymbol = data.symbol;
      }

      // Clear expired cache
      this.sentimentFetcher.clearExpiredCache();

      console.log(`Processing market data for ${data.symbol} at $${data.price}`);
    } catch (error) {
      this.handleError('MARKET_DATA_PROCESSING_FAILED', error as Error);
    }
  }

  /**
   * Generate contrarian signal based on current market sentiment
   */
  async generateSignal(): Promise<ContrarianSignal | null> {
    try {
      // Fetch current market sentiment
      const sentimentData = await this.fetchMarketSentiment(this.state.currentToken);
      
      // Generate contrarian signal
      const signal = await this.generateContrarianSignal(sentimentData);
      
      // Update state
      this.state.lastSignalTime = new Date();
      this.state.totalContrarianCalls++;
      
      if (signal.triggerConditions.isExtremeCondition) {
        this.state.extremeConditionCalls++;
      }

      // Create prediction market
      const marketId = await this.marketIntegration.createPredictionMarket(signal);
      
      // Submit signal to frontend
      await this.marketIntegration.submitSignal(signal, marketId || undefined);

      console.log(`Generated ${signal.signalType} signal with ${signal.confidence}% confidence`);
      
      return signal;
    } catch (error) {
      this.handleError('SIGNAL_GENERATION_FAILED', error as Error);
      return null;
    }
  }

  /**
   * Fetch market sentiment data
   */
  async fetchMarketSentiment(tokenSymbol?: string): Promise<SentimentData> {
    try {
      return await this.sentimentFetcher.fetchCombinedSentiment(tokenSymbol);
    } catch (error) {
      this.handleError('SENTIMENT_FETCH_FAILED', error as Error);
      throw error;
    }
  }

  /**
   * Generate contrarian signal from sentiment data
   */
  async generateContrarianSignal(sentimentData: SentimentData): Promise<ContrarianSignal> {
    try {
      return this.signalGenerator.generateContrarianSignal(
        sentimentData,
        this.id,
        undefined // Market price can be added later
      );
    } catch (error) {
      this.handleError('CONTRARIAN_SIGNAL_GENERATION_FAILED', error as Error);
      throw error;
    }
  }

  /**
   * Generate smug rant with payment protection
   */
  async generateSmugRant(signal: ContrarianSignal): Promise<string> {
    try {
      // Get sentiment data for context
      const sentimentData = await this.fetchMarketSentiment(this.state.currentToken);
      
      // Generate the full smug rant
      const fullRant = this.contrarianBrain.generateSmugRant(signal, sentimentData);
      
      // Return preview version (full version requires payment)
      return this.paymentService.createContentPreview(fullRant, 0.15);
    } catch (error) {
      this.handleError('SMUG_RANT_GENERATION_FAILED', error as Error);
      throw error;
    }
  }

  /**
   * Get personality response for general context
   */
  getPersonalityResponse(context: string): string {
    try {
      return this.contrarianBrain.getPersonalityResponse(context);
    } catch (error) {
      this.handleError('PERSONALITY_RESPONSE_FAILED', error as Error);
      return "The contrarian agent is experiencing technical difficulties. How typical of retail systems...";
    }
  }

  /**
   * Verify payment and decrypt full reasoning
   */
  async verifyPaymentAndDecrypt(
    transactionSignature: string,
    contentId: string,
    senderAddress: string
  ): Promise<string> {
    try {
      // Verify payment
      const isValidPayment = await this.paymentService.verifyPayment({
        transactionSignature,
        expectedAmount: this.paymentService.getRequiredAmount(),
        expectedRecipient: this.paymentService.getRecipientAddress(),
        contentId,
        senderAddress
      });

      if (!isValidPayment) {
        throw new Error('Payment verification failed');
      }

      // Get the signal associated with this content ID
      const signal = await this.getSignalByContentId(contentId);
      if (!signal) {
        throw new Error('Signal not found for content ID');
      }

      // Generate full reasoning
      const sentimentData = await this.fetchMarketSentiment(this.state.currentToken);
      const fullRant = this.contrarianBrain.generateSmugRant(signal, sentimentData);

      console.log(`Payment verified for ${contentId}, delivering full contrarian analysis`);
      
      return fullRant;
    } catch (error) {
      this.handleError('PAYMENT_VERIFICATION_FAILED', error as Error);
      throw error;
    }
  }

  /**
   * Get current agent state
   */
  getAgentState(): ContrarianAgentState {
    return { ...this.state };
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(): ContrarianAgentConfig {
    return { ...this.config };
  }

  /**
   * Generate JSON output for frontend consumption
   */
  generateOutput(signal?: ContrarianSignal): ContrarianAgentOutput {
    const sentimentData = signal ? {
      fearGreedIndex: signal.triggerConditions.fearGreedValue,
      classification: signal.triggerConditions.fearGreedValue > 60 ? 'Greed' : 'Fear',
      communityBullish: signal.triggerConditions.communityBullish,
      isExtremeCondition: signal.triggerConditions.isExtremeCondition
    } : {
      fearGreedIndex: 50,
      classification: 'Neutral',
      isExtremeCondition: false
    };

    return {
      agentId: this.id,
      timestamp: new Date(),
      signalType: signal?.signalType || 'BUY',
      agentState: {
        smugnessLevel: this.state.smugnessLevel,
        personalityMode: this.state.personalityMode,
        totalCalls: this.state.totalContrarianCalls,
        correctCalls: this.state.correctCalls
      },
      sentimentAnalysis: sentimentData,
      encryptedReasoning: signal?.encryptedReasoning || '',
      predictionMarket: {
        id: `market-${this.id}-${Date.now()}`,
        options: ['Knife Catcher (Rekt)', 'Alpha God (Rich)']
      },
      confidence: signal?.confidence || 75
    };
  }

  /**
   * Update agent performance after market resolution
   */
  async updatePerformance(signalId: string, wasCorrect: boolean): Promise<void> {
    try {
      if (wasCorrect) {
        this.state.correctCalls++;
        this.state.smugnessLevel = Math.min(10, this.state.smugnessLevel + 0.1);
      } else {
        this.state.smugnessLevel = Math.max(1, this.state.smugnessLevel - 0.05);
      }

      // Track performance in market integration
      const outcome = wasCorrect ? 'ALPHA_GOD' : 'KNIFE_CATCHER';
      await this.marketIntegration.trackPerformance(signalId, outcome);

      console.log(`Performance updated for signal ${signalId}: ${wasCorrect ? 'CORRECT' : 'INCORRECT'}`);
    } catch (error) {
      this.handleError('PERFORMANCE_UPDATE_FAILED', error as Error);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      agentStats: {
        totalCalls: this.state.totalContrarianCalls,
        correctCalls: this.state.correctCalls,
        winRate: this.state.totalContrarianCalls > 0 ? this.state.correctCalls / this.state.totalContrarianCalls : 0,
        extremeConditionCalls: this.state.extremeConditionCalls,
        smugnessLevel: this.state.smugnessLevel
      },
      marketStats: this.marketIntegration.getPerformanceStats()
    };
  }

  /**
   * Handle errors with proper logging and state management
   */
  private handleError(code: string, error: Error, context?: any): void {
    const agentError: ContrarianAgentError = {
      name: 'ContrarianAgentError',
      message: error.message,
      code,
      context,
      stack: error.stack
    };

    this.lastError = agentError;
    
    console.error(`Contrarian Agent Error [${code}]:`, error.message);
    if (context) {
      console.error('Error context:', context);
    }
  }

  /**
   * Get last error for debugging
   */
  getLastError(): ContrarianAgentError | null {
    return this.lastError;
  }

  /**
   * Clear last error
   */
  clearLastError(): void {
    this.lastError = null;
  }

  /**
   * Cleanup resources and old data
   */
  async cleanup(): Promise<void> {
    try {
      // Clear old payment logs
      this.paymentService.clearOldLogs(24);
      
      // Clear old market data
      this.marketIntegration.cleanupOldMarkets(7);
      
      // Clear expired cache
      this.sentimentFetcher.clearExpiredCache();
      
      console.log('Contrarian Agent cleanup completed');
    } catch (error) {
      this.handleError('CLEANUP_FAILED', error as Error);
    }
  }

  /**
   * Get signal by content ID (helper method for payment verification)
   */
  private async getSignalByContentId(contentId: string): Promise<ContrarianSignal | null> {
    // In a real implementation, this would query a database or cache
    // For now, we'll generate a mock signal based on current market conditions
    try {
      const sentimentData = await this.fetchMarketSentiment(this.state.currentToken);
      return this.generateContrarianSignal(sentimentData);
    } catch (error) {
      console.error('Failed to get signal by content ID:', error);
      return null;
    }
  }

  /**
   * Health check for agent status
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {};
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check sentiment fetcher
      const cacheStats = this.sentimentFetcher.getCacheStats();
      details.sentimentFetcher = {
        cacheStatus: cacheStats,
        status: 'operational'
      };

      // Check signal generator
      const thresholds = this.signalGenerator.getThresholds();
      details.signalGenerator = {
        thresholds,
        status: 'operational'
      };

      // Check payment service
      details.paymentService = {
        requiredAmount: this.paymentService.getRequiredAmount(),
        recipientAddress: this.paymentService.getRecipientAddress(),
        status: 'operational'
      };

      // Check market integration
      const performanceStats = this.marketIntegration.getPerformanceStats();
      details.marketIntegration = {
        performanceStats,
        activeMarkets: this.marketIntegration.getActiveMarkets().length,
        status: 'operational'
      };

      // Check for recent errors
      if (this.lastError) {
        status = 'degraded';
        details.lastError = {
          code: this.lastError.code,
          message: this.lastError.message,
          timestamp: new Date()
        };
      }

    } catch (error) {
      status = 'unhealthy';
      details.healthCheckError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }

    return { status, details };
  }
}