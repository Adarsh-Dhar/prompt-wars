import { ThoughtPart, PremiumLogEntry, DegenAnalysisResponse } from '../types';
import { ContentEncryption } from './content-encryption';
import { PaymentVerificationService } from './payment-verification';

// Configuration for integration with the frontend prediction market system
export const FRONTEND_CONFIG = {
  url: process.env.FRONTEND_URL || 'http://localhost:3000',
  agentServerUrl: process.env.AGENT_SERVER_URL || 'http://localhost:4001',
  predictionMarketProgramId: process.env.PREDICTION_MARKET_PROGRAM_ID,
  agentRegistryProgramId: process.env.AGENT_REGISTRY_PROGRAM_ID,
};

// Types for integration
export interface MarketCreationRequest {
  question: string;
  endTime: number;
  initialLiquidity: number;
  agentId: string;
}

export interface TradingDecisionPayload {
  tokenSymbol: string;
  decision: 'LONG' | 'SHORT';
  confidence: number;
  reasoning: string;
  marketId?: string;
  timestamp: Date;
}

export interface PremiumLogStorageRequest {
  analysisResponse: DegenAnalysisResponse;
  transactionSignature?: string;
  userId?: string;
  metadata?: any;
}

export interface PublicContentOptions {
  includeTeaser: boolean;
  includePreview: boolean;
  customizationLevel: 'basic' | 'enhanced' | 'premium';
  userContext?: {
    previousPurchases?: number;
    engagementLevel?: 'low' | 'medium' | 'high';
    preferredStyle?: 'technical' | 'casual' | 'aggressive';
  };
}

export interface PublicContentResult {
  publicSummary: string;
  teaserContent?: string;
  contentPreview?: string;
  conversionTeaser?: string;
  validationResult?: {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  };
}

export interface AgentRegistrationData {
  name: string;
  description: string;
  tags: string[];
  serverUrl: string;
  walletAddress: string;
}

// Integration utilities
export class FrontendIntegration {
  // Use loose types to avoid hard dependency on anchor in mock environment
  private agentWallet: any;
  private connection: any;

  constructor(agentWallet: any, connection: any) {
    this.agentWallet = agentWallet;
    this.connection = connection;
  }

  /**
   * Register this agent with the frontend's agent registry
   */
  async registerWithFrontend(registrationData: AgentRegistrationData): Promise<boolean> {
    try {
      const response = await fetch(`${FRONTEND_CONFIG.url}/api/agents/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...registrationData,
          walletAddress: typeof this.agentWallet?.publicKey?.toBase58 === 'function' ? this.agentWallet.publicKey.toBase58() : String(this.agentWallet?.publicKey || this.agentWallet),
          serverUrl: FRONTEND_CONFIG.agentServerUrl,
        }),
      });

      if (!response.ok) {
        console.error('Failed to register with frontend:', await response.text());
        return false;
      }

      const result = await response.json();
      console.log('Successfully registered with frontend:', result);
      return true;
    } catch (error) {
      console.error('Error registering with frontend:', error);
      return false;
    }
  }

  /**
   * Create a prediction market for a trading decision
   */
  async createPredictionMarket(request: MarketCreationRequest): Promise<string | null> {
    try {
      const response = await fetch(`${FRONTEND_CONFIG.url}/api/markets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          agentWallet: this.agentWallet.publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to create prediction market:', await response.text());
        return null;
      }

      const result = await response.json();
      return result.marketId;
    } catch (error) {
      console.error('Error creating prediction market:', error);
      return null;
    }
  }

  /**
   * Submit a trading decision to the frontend
   */
    async submitTradingDecision(decision: TradingDecisionPayload): Promise<boolean> {
    try {
      const walletAddress = typeof this.agentWallet?.publicKey?.toBase58 === 'function' ? this.agentWallet.publicKey.toBase58() : String(this.agentWallet?.publicKey || this.agentWallet);
      const response = await fetch(`${FRONTEND_CONFIG.url}/api/agents/${walletAddress}/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(decision),
      });

      if (!response.ok) {
        console.error('Failed to submit trading decision:', await response.text());
        return false;
      }

      console.log('Successfully submitted trading decision');
      return true;
    } catch (error) {
      console.error('Error submitting trading decision:', error);
      return false;
    }
    }

  /**
   * Get agent status from the frontend
   */
    async getAgentStatus(): Promise<any> {
    try {
      const walletAddress = typeof this.agentWallet?.publicKey?.toBase58 === 'function' ? this.agentWallet.publicKey.toBase58() : String(this.agentWallet?.publicKey || this.agentWallet);
      const response = await fetch(`${FRONTEND_CONFIG.url}/api/agents/${walletAddress}/status`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting agent status:', error);
      return null;
    }
    }

  /**
   * Notify frontend of agent activity
   */
    async notifyActivity(activity: {
    type: 'analysis' | 'decision' | 'market_creation' | 'status_update';
    data: any;
    timestamp: Date;
    }): Promise<void> {
    try {
      const walletAddress = typeof this.agentWallet?.publicKey?.toBase58 === 'function' ? this.agentWallet.publicKey.toBase58() : String(this.agentWallet?.publicKey || this.agentWallet);
      await fetch(`${FRONTEND_CONFIG.url}/api/agents/${walletAddress}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activity),
      });
    } catch (error) {
      console.error('Error notifying frontend of activity:', error);
    }
    }
}

// Utility functions for market integration
export function generateMarketQuestion(tokenSymbol: string, decision: 'LONG' | 'SHORT', timeframe: string = '24h'): string {
  const direction = decision === 'LONG' ? 'increase' : 'decrease';
  return `Will ${tokenSymbol} ${direction} in value over the next ${timeframe}?`;
}

export function calculateMarketEndTime(hours: number = 24): number {
  return Math.floor(Date.now() / 1000) + (hours * 60 * 60);
}

export function formatDecisionForMarket(analysis: any): TradingDecisionPayload {
  return {
    tokenSymbol: analysis.tokenSymbol,
    decision: analysis.decision,
    confidence: analysis.confidence,
    reasoning: analysis.premiumAnalysis || analysis.publicSummary,
    timestamp: new Date(analysis.timestamp),
  };
}

// WebSocket integration for real-time updates
export class RealtimeIntegration {
  private ws: WebSocket | null = null;
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  connect(): void {
    try {
      const wsUrl = FRONTEND_CONFIG.url.replace('http', 'ws') + `/ws/agents/${this.agentId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to frontend WebSocket');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from frontend WebSocket');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'market_request':
        // Handle request to create a new market
        console.log('Received market creation request:', message.data);
        break;
      case 'analysis_request':
        // Handle request for token analysis
        console.log('Received analysis request:', message.data);
        break;
      case 'status_request':
        // Handle status update request
        console.log('Received status request');
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  sendUpdate(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, agentId: this.agentId }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Premium Log Manager for Flash Thinking chain-of-thought persistence
 */
export class PremiumLogManager {
  private encryption: ContentEncryption;
  private paymentService: PaymentVerificationService;
  private logs: Map<string, PremiumLogEntry> = new Map();

  constructor() {
    this.encryption = new ContentEncryption();
    this.paymentService = new PaymentVerificationService();
  }

  /**
   * Store premium log with encrypted chain-of-thought
   */
  async storePremiumLog(request: PremiumLogStorageRequest): Promise<string> {
    try {
      const logId = this.generateLogId();
      const now = new Date();

      let encryptedChainOfThought = null;
      let encryptedFinalAnswer = null;

      // Encrypt content if transaction signature is provided
      if (request.transactionSignature) {
        encryptedChainOfThought = this.encryption.encryptThoughtParts(
          request.analysisResponse.chainOfThought,
          request.transactionSignature
        );
        encryptedFinalAnswer = this.encryption.encrypt(
          request.analysisResponse.finalAnswer,
          request.transactionSignature
        );
      }

      // Create extended log entry with proper encrypted storage
      const logEntry: PremiumLogEntry & { encryptedChainOfThought?: string } = {
        id: logId,
        agent: 'degen-agent',
        tokenSymbol: request.analysisResponse.tokenSymbol,
        finalAnswer: encryptedFinalAnswer ? JSON.stringify(encryptedFinalAnswer) : request.analysisResponse.finalAnswer,
        chainOfThought: encryptedChainOfThought ? [] : request.analysisResponse.chainOfThought,
        publicSummary: request.analysisResponse.publicSummary,
        createdAt: now,
        isPremium: !!request.transactionSignature,
        encrypted: !!request.transactionSignature,
        totalTokens: request.analysisResponse.totalTokens,
        thoughtTokens: request.analysisResponse.thoughtTokens,
        transactionSignature: request.transactionSignature
      };

      // Store encrypted chain-of-thought separately if encrypted
      if (encryptedChainOfThought) {
        (logEntry as any).encryptedChainOfThought = JSON.stringify(encryptedChainOfThought);
      }

      // Store in memory (in production, this would go to a database)
      this.logs.set(logId, logEntry);

      // Also send to frontend if configured
      await this.sendLogToFrontend(logEntry, request.metadata);

      console.log(`Premium log stored: ${logId} (encrypted: ${logEntry.encrypted})`);
      return logId;

    } catch (error) {
      console.error('Error storing premium log:', error);
      throw new Error(`Failed to store premium log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve premium log with decryption if payment is verified
   */
  async retrievePremiumLog(
    logId: string, 
    transactionSignature?: string,
    verifyPayment: boolean = true
  ): Promise<PremiumLogEntry | null> {
    try {
      const logEntry = this.logs.get(logId) as (PremiumLogEntry & { encryptedChainOfThought?: string });
      
      if (!logEntry) {
        return null;
      }

      // If not encrypted, return as-is (but protect premium content)
      if (!logEntry.encrypted || !transactionSignature) {
        return {
          ...logEntry,
          chainOfThought: logEntry.isPremium ? [] : logEntry.chainOfThought,
          finalAnswer: logEntry.isPremium ? '[PREMIUM CONTENT - PAYMENT REQUIRED]' : logEntry.finalAnswer
        };
      }

      // Verify payment if required
      if (verifyPayment && logEntry.transactionSignature !== transactionSignature) {
        // In production, you'd verify the new transaction signature
        console.warn('Transaction signature mismatch for log retrieval');
        return {
          ...logEntry,
          chainOfThought: [],
          finalAnswer: '[PREMIUM CONTENT - PAYMENT REQUIRED]'
        };
      }

      // Decrypt content
      const decryptedFinalAnswer = this.encryption.decrypt(
        JSON.parse(logEntry.finalAnswer),
        transactionSignature
      );

      // Decrypt chain-of-thought from separate encrypted field
      let decryptedChainOfThought: ThoughtPart[] = [];
      if (logEntry.encryptedChainOfThought) {
        decryptedChainOfThought = this.encryption.decryptThoughtParts(
          JSON.parse(logEntry.encryptedChainOfThought),
          transactionSignature
        );
      }

      return {
        ...logEntry,
        finalAnswer: decryptedFinalAnswer,
        chainOfThought: decryptedChainOfThought
      };

    } catch (error) {
      console.error('Error retrieving premium log:', error);
      return null;
    }
  }

  /**
   * Get public preview of premium log
   */
  getPublicPreview(logId: string): Partial<PremiumLogEntry> | null {
    const logEntry = this.logs.get(logId);
    
    if (!logEntry) {
      return null;
    }

    return {
      id: logEntry.id,
      agent: logEntry.agent,
      tokenSymbol: logEntry.tokenSymbol,
      publicSummary: logEntry.publicSummary,
      createdAt: logEntry.createdAt,
      isPremium: logEntry.isPremium,
      totalTokens: logEntry.totalTokens,
      thoughtTokens: logEntry.thoughtTokens,
      // Don't include encrypted content or transaction signature
    };
  }

  /**
   * List premium logs with optional filtering
   */
  listPremiumLogs(filters?: {
    tokenSymbol?: string;
    isPremium?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Partial<PremiumLogEntry>[] {
    let logs = Array.from(this.logs.values());

    // Apply filters
    if (filters) {
      if (filters.tokenSymbol) {
        logs = logs.filter(log => log.tokenSymbol === filters.tokenSymbol);
      }
      if (filters.isPremium !== undefined) {
        logs = logs.filter(log => log.isPremium === filters.isPremium);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.createdAt <= filters.endDate!);
      }
    }

    // Sort by creation date (newest first)
    logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    // Return public previews only
    return logs.map(log => this.getPublicPreview(log.id)!);
  }

  /**
   * Send log to frontend for persistence
   */
  private async sendLogToFrontend(logEntry: PremiumLogEntry, metadata?: any): Promise<void> {
    try {
      // Only send non-sensitive data to frontend
      const frontendPayload = {
        id: logEntry.id,
        agent: logEntry.agent,
        tokenSymbol: logEntry.tokenSymbol,
        publicSummary: logEntry.publicSummary,
        createdAt: logEntry.createdAt,
        isPremium: logEntry.isPremium,
        totalTokens: logEntry.totalTokens,
        thoughtTokens: logEntry.thoughtTokens,
        metadata: metadata
      };

      const response = await fetch(`${FRONTEND_CONFIG.url}/api/agents/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frontendPayload),
      });

      if (!response.ok) {
        console.warn('Failed to send log to frontend:', response.status);
      }

    } catch (error) {
      console.warn('Error sending log to frontend:', error);
      // Don't throw - frontend integration failures shouldn't break core functionality
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalLogs: number;
    premiumLogs: number;
    encryptedLogs: number;
    totalTokens: number;
    thoughtTokens: number;
  } {
    const logs = Array.from(this.logs.values());
    
    return {
      totalLogs: logs.length,
      premiumLogs: logs.filter(log => log.isPremium).length,
      encryptedLogs: logs.filter(log => log.encrypted).length,
      totalTokens: logs.reduce((sum, log) => sum + log.totalTokens, 0),
      thoughtTokens: logs.reduce((sum, log) => sum + log.thoughtTokens, 0)
    };
  }

  /**
   * Generate analysis response with proper chain-of-thought handling
   */
  async generateAnalysisResponse(
    tokenSymbol: string,
    chainOfThought: ThoughtPart[],
    finalAnswer: string,
    publicSummary: string,
    totalTokens: number,
    thoughtTokens: number,
    transactionSignature?: string,
    options?: PublicContentOptions
  ): Promise<DegenAnalysisResponse> {
    // Generate enhanced public content
    const publicContent = this.generatePublicContent(
      tokenSymbol,
      chainOfThought,
      finalAnswer,
      totalTokens,
      thoughtTokens,
      true
    );

    // Always use generated public summary to ensure it contains required information
    // The provided publicSummary is only used as a fallback if generation fails
    const enhancedPublicSummary = publicContent.publicSummary || publicSummary || 
      `🚀 ${tokenSymbol} Analysis: ${this.extractDecisionFromAnswer(finalAnswer)} signal detected! Premium insights available with detailed reasoning. Unlock full breakdown! 💎🧠`;

    // Create the analysis response
    const analysisResponse: DegenAnalysisResponse = {
      tokenSymbol,
      decision: this.extractDecisionFromAnswer(finalAnswer),
      confidence: this.extractConfidenceFromAnswer(finalAnswer),
      publicSummary: enhancedPublicSummary,
      finalAnswer,
      chainOfThought,
      totalTokens,
      thoughtTokens
    };

    // Store the premium log
    await this.storePremiumLog({
      analysisResponse,
      transactionSignature,
      metadata: {
        timestamp: new Date(),
        source: 'gemini-flash-thinking',
        publicContentOptions: options
      }
    });

    // Return appropriate response based on payment status
    if (!transactionSignature) {
      // Non-premium user - return limited content with enhanced teaser
      const teaserContent = options?.userContext ? 
        this.generateConversionTeaser(chainOfThought, finalAnswer, options.userContext) :
        this.generateTeaserContent(enhancedPublicSummary, chainOfThought, finalAnswer);

      return {
        ...analysisResponse,
        chainOfThought: [], // Empty for non-premium users
        finalAnswer: teaserContent
      };
    }

    return analysisResponse;
  }

  /**
   * Extract trading decision from final answer
   */
  private extractDecisionFromAnswer(finalAnswer: string): 'LONG' | 'SHORT' | 'HOLD' {
    const answer = finalAnswer.toLowerCase();
    if (answer.includes('long') || answer.includes('buy')) return 'LONG';
    if (answer.includes('short') || answer.includes('sell')) return 'SHORT';
    return 'HOLD';
  }

  /**
   * Extract confidence from final answer
   */
  private extractConfidenceFromAnswer(finalAnswer: string): number {
    // Simple regex to find confidence percentages
    const confidenceMatch = finalAnswer.match(/(\d+)%/);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]);
    }
    
    // Default confidence based on decision strength
    const answer = finalAnswer.toLowerCase();
    if (answer.includes('strong') || answer.includes('high')) return 85;
    if (answer.includes('moderate') || answer.includes('medium')) return 65;
    if (answer.includes('weak') || answer.includes('low')) return 45;
    
    return 70; // Default moderate confidence
  }

  /**
   * Generate public summary for non-premium users
   */
  private generatePublicSummary(
    tokenSymbol: string,
    chainOfThought: ThoughtPart[],
    finalAnswer: string,
    totalTokens: number,
    thoughtTokens: number
  ): string {
    // Handle edge cases with minimal input
    const safeTokenSymbol = tokenSymbol && tokenSymbol.trim().length > 0 ? tokenSymbol.trim() : 'TOKEN';
    const decision = this.extractDecisionFromAnswer(finalAnswer);
    const confidence = this.extractConfidenceFromAnswer(finalAnswer);
    
    // Extract key themes from chain of thought without revealing content
    const thoughtCount = chainOfThought.length;
    
    // Generate degen-style summary based on decision and confidence
    let summary = `🚀 ${safeTokenSymbol} DEGEN ANALYSIS: ${decision} signal with ${confidence}% confidence! `;
    
    if (thoughtCount > 0) {
      summary += `Our AI went full degen mode analyzing ${thoughtCount} key factors - `;
      summary += `market vibes, technical wizardry, and risk calculations. `;
      
      if (thoughtTokens > 0 && totalTokens > 0 && thoughtTokens > totalTokens * 0.7) {
        summary += `MASSIVE brain power deployed (${thoughtTokens} tokens) for this deep dive! `;
      }
      
      // Add some degen flair based on thought complexity
      if (thoughtCount >= 10) {
        summary += `This analysis is THICC with insights! `;
      } else if (thoughtCount >= 5) {
        summary += `Solid reasoning process detected! `;
      } else if (thoughtCount > 0) {
        summary += `Focused analysis with key insights! `;
      }
    } else {
      // Handle case with no chain of thought
      summary += `Quick degen analysis complete - market signals processed! `;
    }
    
    // Add decision-specific degen insights
    switch (decision) {
      case 'LONG':
        summary += `💎 Bullish vibes detected - potential moon mission incoming! `;
        if (confidence >= 80) {
          summary += `HIGH CONVICTION PLAY! `;
        }
        break;
      case 'SHORT':
        summary += `📉 Bearish signals flashing - might be time to take profits! `;
        if (confidence >= 80) {
          summary += `STRONG SELL SIGNAL! `;
        }
        break;
      case 'HOLD':
        summary += `🤔 Mixed signals - sideways action expected. `;
        summary += `Sometimes the best move is no move! `;
        break;
      default:
        summary += `🎯 Market analysis complete with actionable insights! `;
        break;
    }
    
    // Add engagement hook
    summary += `Want the full degen breakdown? Unlock premium for complete chain-of-thought! 🧠💰`;
    
    const finalSummary = summary.trim();
    
    // Ensure minimum length requirement is met
    if (finalSummary.length <= 10) {
      return `🚀 ${safeTokenSymbol} Analysis: ${decision} signal detected! Premium insights available with detailed reasoning and market analysis. Unlock full degen breakdown! 💎🧠`;
    }
    
    return finalSummary;
  }

  /**
   * Generate teaser content for non-premium users
   */
  private generateTeaserContent(
    publicSummary: string,
    chainOfThought: ThoughtPart[],
    finalAnswer: string
  ): string {
    let teaser = publicSummary + '\n\n';
    
    // Add chain-of-thought preview if available
    if (chainOfThought.length > 0) {
      teaser += '🧠 **DEGEN AI REASONING PREVIEW:**\n';
      teaser += `• ${chainOfThought.length} big brain analytical steps performed\n`;
      teaser += `• Key factors analyzed: market vibes, chart wizardry, risk calculations\n`;
      
      // Show a glimpse of the first thought (first 60 characters for better preview)
      const firstThought = chainOfThought[0];
      if (firstThought && firstThought.text.length > 20) {
        const preview = firstThought.text.substring(0, 60).replace(/\n/g, ' ') + '...';
        teaser += `• Sample degen insight: "${preview}"\n`;
      }
      
      // Add reasoning complexity indicator
      if (chainOfThought.length >= 8) {
        teaser += `• 🔥 PREMIUM TIER ANALYSIS - Maximum brain power deployed!\n`;
      } else if (chainOfThought.length >= 5) {
        teaser += `• 💪 SOLID ANALYSIS - Comprehensive reasoning included!\n`;
      } else {
        teaser += `• 🎯 FOCUSED ANALYSIS - Key insights identified!\n`;
      }
      
      teaser += '\n';
    }
    
    // Add premium upgrade call-to-action with degen flair
    teaser += '🔒 **UNLOCK FULL DEGEN ANALYSIS**\n';
    teaser += '• 🧠 Complete step-by-step chain-of-thought reasoning\n';
    teaser += '• 📊 Detailed market sentiment and technical analysis\n';
    teaser += '• ⚠️ Risk assessment and position sizing recommendations\n';
    teaser += '• 🎯 Bullish and bearish price target calculations\n';
    teaser += '• 💎 Diamond hands vs paper hands probability analysis\n';
    teaser += '• 🚀 Moon mission potential and exit strategy\n';
    teaser += '\n💰 **Pay 0.5 USDC to unlock premium degen insights!**\n';
    teaser += '🔥 Full chain-of-thought analysis reveals the complete reasoning process!\n';
    teaser += '⚡ Get the edge you need to make informed degen plays! WAGMI! 🚀';
    
    return teaser;
  }

  /**
   * Create content preview for payment conversion
   */
  generateContentPreview(chainOfThought: ThoughtPart[], finalAnswer: string): string {
    if (chainOfThought.length === 0) {
      return '🚀 Premium degen analysis available with detailed reasoning and alpha insights! Pay to unlock the full brain dump! 💎';
    }
    
    let preview = '🔍 **DEGEN ANALYSIS PREVIEW:**\n\n';
    
    // Show structure without revealing content
    preview += `🧠 **Reasoning Steps:** ${chainOfThought.length} big brain analytical phases\n`;
    preview += `🎯 **Final Degen Decision:** Available in full premium analysis\n`;
    preview += `📈 **Market Alpha:** Comprehensive technical wizardry and fundamental deep dive\n`;
    preview += `⚠️ **Risk Assessment:** Detailed risk/reward calculations for maximum gains\n`;
    preview += `💰 **Position Sizing:** Optimal entry and exit strategies\n`;
    preview += `🚀 **Moon Potential:** Upside targets and diamond hands probability\n\n`;
    
    // Add teaser from first and last thoughts with better formatting
    if (chainOfThought.length >= 2) {
      const firstThought = chainOfThought[0].text.substring(0, 50).replace(/\n/g, ' ') + '...';
      const lastThought = chainOfThought[chainOfThought.length - 1].text.substring(0, 50).replace(/\n/g, ' ') + '...';
      
      preview += `💭 **REASONING SAMPLE (${chainOfThought.length} total steps):**\n`;
      preview += `🔸 Step 1: "${firstThought}"\n`;
      preview += `🔸 ...\n`;
      preview += `🔸 Final Step: "${lastThought}"\n\n`;
    } else if (chainOfThought.length === 1) {
      const singleThought = chainOfThought[0].text.substring(0, 60).replace(/\n/g, ' ') + '...';
      preview += `💭 **REASONING SAMPLE:**\n`;
      preview += `🔸 "${singleThought}"\n\n`;
    }
    
    // Add token usage stats for transparency
    const totalThoughtTokens = chainOfThought.reduce((sum, thought) => sum + (thought.tokenCount || 0), 0);
    if (totalThoughtTokens > 0) {
      preview += `📊 **Analysis Depth:** ${totalThoughtTokens} tokens of pure degen reasoning\n\n`;
    }
    
    // Enhanced call-to-action
    preview += '🔓 **UNLOCK COMPLETE DEGEN ANALYSIS FOR 0.5 USDC**\n';
    preview += '💎 Get the full chain-of-thought breakdown!\n';
    preview += '🚀 Make informed degen plays with complete reasoning!\n';
    preview += '⚡ WAGMI together with premium alpha insights!';
    
    return preview;
  }

  /**
   * Generate public content for non-premium users (public method)
   */
  public generatePublicContent(
    tokenSymbol: string,
    chainOfThought: ThoughtPart[],
    finalAnswer: string,
    totalTokens: number,
    thoughtTokens: number,
    includeTeaser: boolean = true
  ): {
    publicSummary: string;
    teaserContent?: string;
    contentPreview?: string;
  } {
    const publicSummary = this.generatePublicSummary(
      tokenSymbol,
      chainOfThought,
      finalAnswer,
      totalTokens,
      thoughtTokens
    );

    const result: any = { publicSummary };

    if (includeTeaser) {
      result.teaserContent = this.generateTeaserContent(publicSummary, chainOfThought, finalAnswer);
      result.contentPreview = this.generateContentPreview(chainOfThought, finalAnswer);
    }

    return result;
  }

  /**
   * Create a non-premium analysis response with appropriate content gating
   */
  public createNonPremiumResponse(
    tokenSymbol: string,
    chainOfThought: ThoughtPart[],
    finalAnswer: string,
    totalTokens: number,
    thoughtTokens: number
  ): DegenAnalysisResponse {
    const publicContent = this.generatePublicContent(
      tokenSymbol,
      chainOfThought,
      finalAnswer,
      totalTokens,
      thoughtTokens,
      true
    );

    return {
      tokenSymbol,
      decision: this.extractDecisionFromAnswer(finalAnswer),
      confidence: this.extractConfidenceFromAnswer(finalAnswer),
      publicSummary: publicContent.publicSummary,
      finalAnswer: publicContent.teaserContent || publicContent.publicSummary,
      chainOfThought: [], // Empty for non-premium users
      totalTokens,
      thoughtTokens
    };
  }

  /**
   * Validate that public content provides value without revealing premium insights
   */
  public validatePublicContent(publicSummary: string, chainOfThought: ThoughtPart[]): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check minimum content length
    if (publicSummary.length < 50) {
      issues.push('Public summary too short - should provide meaningful value');
      suggestions.push('Add more context about the analysis approach and key factors considered');
    }

    // Check for premium content leakage
    const premiumKeywords = ['step-by-step', 'detailed reasoning', 'complete analysis', 'full breakdown'];
    const hasLeakage = premiumKeywords.some(keyword => 
      publicSummary.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasLeakage) {
      issues.push('Public summary may be revealing too much premium content');
      suggestions.push('Focus on high-level insights rather than detailed methodology');
    }

    // Check for engagement elements
    const hasEngagement = publicSummary.includes('unlock') || 
                         publicSummary.includes('premium') || 
                         publicSummary.includes('pay');
    
    if (!hasEngagement) {
      suggestions.push('Consider adding a subtle call-to-action for premium content');
    }

    // Check for degen personality
    const degenElements = ['🚀', '💎', 'degen', 'moon', 'WAGMI'];
    const hasDegenFlair = degenElements.some(element => publicSummary.includes(element));
    
    if (!hasDegenFlair) {
      suggestions.push('Add more degen personality elements to match agent character');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Generate conversion-optimized teaser based on user behavior
   */
  public generateConversionTeaser(
    chainOfThought: ThoughtPart[],
    finalAnswer: string,
    userContext?: {
      previousPurchases?: number;
      engagementLevel?: 'low' | 'medium' | 'high';
      preferredStyle?: 'technical' | 'casual' | 'aggressive';
    }
  ): string {
    const basePreview = this.generateContentPreview(chainOfThought, finalAnswer);
    
    if (!userContext) {
      return basePreview;
    }

    let enhancedTeaser = basePreview;

    // Customize based on user engagement level
    if (userContext.engagementLevel === 'high') {
      enhancedTeaser += '\n\n🔥 **HIGH-VALUE USER BONUS:**\n';
      enhancedTeaser += '• Priority access to new analysis features\n';
      enhancedTeaser += '• Enhanced reasoning depth for complex trades\n';
      enhancedTeaser += '• Early access to market sentiment indicators';
    } else if (userContext.engagementLevel === 'low') {
      enhancedTeaser += '\n\n💡 **NEW USER SPECIAL:**\n';
      enhancedTeaser += '• First premium analysis includes bonus market overview\n';
      enhancedTeaser += '• Learn how our AI reasoning process works\n';
      enhancedTeaser += '• Get familiar with advanced degen strategies';
    }

    // Add urgency for returning users
    if (userContext.previousPurchases && userContext.previousPurchases > 0) {
      enhancedTeaser += '\n\n⚡ **RETURNING DEGEN DETECTED:**\n';
      enhancedTeaser += `• You've unlocked ${userContext.previousPurchases} premium analyses\n`;
      enhancedTeaser += '• This analysis builds on previous insights\n';
      enhancedTeaser += '• Continue your winning streak with full reasoning!';
    }

    return enhancedTeaser;
  }

  /**
   * Clean up old logs (for memory management)
   */
  cleanupOldLogs(maxAge: number = 7 * 24 * 60 * 60 * 1000): number { // Default 7 days
    const cutoffDate = new Date(Date.now() - maxAge);
    let removedCount = 0;

    for (const [logId, logEntry] of this.logs.entries()) {
      if (logEntry.createdAt < cutoffDate) {
        this.logs.delete(logId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old premium logs`);
    }

    return removedCount;
  }
}

/**
 * Utility class for public content generation across the application
 */
export class PublicContentGenerator {
  private logManager: PremiumLogManager;

  constructor() {
    this.logManager = new PremiumLogManager();
  }

  /**
   * Generate complete public content package for non-premium users
   */
  generatePublicContentPackage(
    tokenSymbol: string,
    chainOfThought: ThoughtPart[],
    finalAnswer: string,
    totalTokens: number,
    thoughtTokens: number,
    options: PublicContentOptions = {
      includeTeaser: true,
      includePreview: true,
      customizationLevel: 'enhanced'
    }
  ): PublicContentResult {
    // Generate base public content
    const publicContent = this.logManager.generatePublicContent(
      tokenSymbol,
      chainOfThought,
      finalAnswer,
      totalTokens,
      thoughtTokens,
      options.includeTeaser
    );

    const result: PublicContentResult = {
      publicSummary: publicContent.publicSummary,
      teaserContent: publicContent.teaserContent,
      contentPreview: publicContent.contentPreview
    };

    // Add conversion-optimized teaser if user context is provided
    if (options.userContext) {
      result.conversionTeaser = this.logManager.generateConversionTeaser(
        chainOfThought,
        finalAnswer,
        options.userContext
      );
    }

    // Add validation if enhanced customization is requested
    if (options.customizationLevel === 'enhanced' || options.customizationLevel === 'premium') {
      result.validationResult = this.logManager.validatePublicContent(
        publicContent.publicSummary,
        chainOfThought
      );
    }

    return result;
  }

  /**
   * Create a non-premium response with optimized public content
   */
  createOptimizedNonPremiumResponse(
    tokenSymbol: string,
    chainOfThought: ThoughtPart[],
    finalAnswer: string,
    totalTokens: number,
    thoughtTokens: number,
    options?: PublicContentOptions
  ): DegenAnalysisResponse {
    const contentPackage = this.generatePublicContentPackage(
      tokenSymbol,
      chainOfThought,
      finalAnswer,
      totalTokens,
      thoughtTokens,
      options || { includeTeaser: true, includePreview: true, customizationLevel: 'enhanced' }
    );

    // Choose the best content based on options
    let finalContent = contentPackage.publicSummary;
    
    if (options?.userContext && contentPackage.conversionTeaser) {
      finalContent = contentPackage.conversionTeaser;
    } else if (contentPackage.teaserContent) {
      finalContent = contentPackage.teaserContent;
    }

    return {
      tokenSymbol,
      decision: this.extractDecisionFromAnswer(finalAnswer),
      confidence: this.extractConfidenceFromAnswer(finalAnswer),
      publicSummary: contentPackage.publicSummary,
      finalAnswer: finalContent,
      chainOfThought: [], // Always empty for non-premium
      totalTokens,
      thoughtTokens
    };
  }

  /**
   * Extract decision from final answer (delegated to log manager)
   */
  private extractDecisionFromAnswer(finalAnswer: string): 'LONG' | 'SHORT' | 'HOLD' {
    const answer = finalAnswer.toLowerCase();
    if (answer.includes('long') || answer.includes('buy')) return 'LONG';
    if (answer.includes('short') || answer.includes('sell')) return 'SHORT';
    return 'HOLD';
  }

  /**
   * Extract confidence from final answer (delegated to log manager)
   */
  private extractConfidenceFromAnswer(finalAnswer: string): number {
    // Simple regex to find confidence percentages
    const confidenceMatch = finalAnswer.match(/(\d+)%/);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]);
    }
    
    // Default confidence based on decision strength
    const answer = finalAnswer.toLowerCase();
    if (answer.includes('strong') || answer.includes('high')) return 85;
    if (answer.includes('moderate') || answer.includes('medium')) return 65;
    if (answer.includes('weak') || answer.includes('low')) return 45;
    
    return 70; // Default moderate confidence
  }

  /**
   * Test public content generation with sample data
   */
  testPublicContentGeneration(): void {
    const sampleChainOfThought: ThoughtPart[] = [
      {
        text: "Looking at the current market conditions for BTC, I need to analyze several key factors...",
        thought: true,
        order: 1,
        timestamp: Date.now(),
        tokenCount: 25
      },
      {
        text: "The technical indicators are showing mixed signals with RSI at 65 and MACD crossing bullish...",
        thought: true,
        order: 2,
        timestamp: Date.now() + 1000,
        tokenCount: 30
      },
      {
        text: "Market sentiment on crypto Twitter is extremely bullish with #Bitcoin trending...",
        thought: true,
        order: 3,
        timestamp: Date.now() + 2000,
        tokenCount: 20
      }
    ];

    const sampleFinalAnswer = "Based on my analysis, I'm going LONG on BTC with 85% confidence. The combination of technical breakout, positive sentiment, and institutional buying pressure suggests a strong upward move is likely.";

    console.log('=== PUBLIC CONTENT GENERATION TEST ===');
    
    const contentPackage = this.generatePublicContentPackage(
      'BTC',
      sampleChainOfThought,
      sampleFinalAnswer,
      150,
      75,
      {
        includeTeaser: true,
        includePreview: true,
        customizationLevel: 'premium',
        userContext: {
          previousPurchases: 2,
          engagementLevel: 'high',
          preferredStyle: 'aggressive'
        }
      }
    );

    console.log('Public Summary:', contentPackage.publicSummary);
    console.log('\nTeaser Content:', contentPackage.teaserContent);
    console.log('\nContent Preview:', contentPackage.contentPreview);
    console.log('\nConversion Teaser:', contentPackage.conversionTeaser);
    console.log('\nValidation Result:', contentPackage.validationResult);
  }
}

export default FrontendIntegration;