/**
 * Google Generative AI client with Flash Thinking support for chain-of-thought extraction
 */

import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult, GenerateContentStreamResult } from '@google/generative-ai';

export interface GoogleGenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  enableThoughts: boolean;
}

export interface ThoughtPart {
  text: string;
  thought: boolean;
  order: number;
  timestamp: number;
  tokenCount?: number;
}

export interface GenerationResult {
  finalAnswer: string;
  chainOfThought: ThoughtPart[];
  totalTokens: number;
  thoughtTokens: number;
  finalTokens: number;
}

export interface StreamingCallbacks {
  onThought: (thought: ThoughtPart) => void;
  onFinal: (text: string, isComplete: boolean) => void;
  onComplete: (result: GenerationResult) => void;
  onError: (error: Error) => void;
}

export const DEFAULT_GOOGLE_CONFIG: Partial<GoogleGenAIConfig> = {
  model: process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash-thinking-exp-01-21',
  temperature: parseFloat(process.env.GEMINI_THOUGHTS_TEMPERATURE || '1.0'),
  maxTokens: parseInt(process.env.COST_CONTROL_MAX_TOKENS || '4000'),
  enableThoughts: process.env.GEMINI_ENABLE_THOUGHTS === 'true'
};

export class GoogleGenAIClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GoogleGenAIConfig;

  constructor(config: Partial<GoogleGenAIConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || '',
      ...DEFAULT_GOOGLE_CONFIG,
      ...config
    } as GoogleGenAIConfig;

    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens
      }
    });
  }

  /**
   * Generate content with thoughts synchronously
   */
  async generateWithThoughts(prompt: string): Promise<GenerationResult> {
    try {
      const requestConfig = this.buildRequestConfig(prompt);
      const result = await this.model.generateContent(requestConfig);
      
      const generationResult = this.parseGenerationResult(result);
      
      // Log token usage for monitoring
      this.logTokenUsage(generationResult, 'generateWithThoughts');
      
      return generationResult;
    } catch (error) {
      console.error('Error generating content with thoughts:', error);
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream content with thoughts and emit events via callbacks
   */
  async streamWithThoughts(prompt: string, callbacks: StreamingCallbacks): Promise<void> {
    try {
      const requestConfig = this.buildRequestConfig(prompt);
      const stream = await this.model.generateContentStream(requestConfig);

      let finalBuffer = '';
      let thoughtIndex = 0;
      let finalIndex = 0;
      const chainOfThought: ThoughtPart[] = [];
      let totalTokens = 0;
      let thoughtTokens = 0;
      let finalTokens = 0;

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts || [];
        
        for (const part of parts) {
          const text = part.text || '';
          const timestamp = Date.now();
          
          // Estimate token count (rough approximation: 1 token ≈ 4 characters)
          const estimatedTokens = Math.ceil(text.length / 4);
          totalTokens += estimatedTokens;

          if ((part as any).thought) {
            // This is a thought part
            const thoughtPart: ThoughtPart = {
              text,
              thought: true,
              order: thoughtIndex++,
              timestamp,
              tokenCount: estimatedTokens
            };
            
            chainOfThought.push(thoughtPart);
            thoughtTokens += estimatedTokens;
            
            callbacks.onThought(thoughtPart);
          } else {
            // This is a final answer part
            finalBuffer += text;
            finalTokens += estimatedTokens;
            
            callbacks.onFinal(text, false);
          }
        }
      }

      // Emit final completion event
      const result: GenerationResult = {
        finalAnswer: finalBuffer,
        chainOfThought,
        totalTokens,
        thoughtTokens,
        finalTokens
      };

      callbacks.onFinal(finalBuffer, true);
      callbacks.onComplete(result);
      
      // Log token usage for monitoring
      this.logTokenUsage(result, 'streamWithThoughts');

    } catch (error) {
      console.error('Error streaming content with thoughts:', error);
      callbacks.onError(new Error(`Gemini streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Build request configuration with thinking config if enabled
   */
  private buildRequestConfig(prompt: string) {
    const baseConfig = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    // Add thinking config if thoughts are enabled
    if (this.config.enableThoughts) {
      return {
        ...baseConfig,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          // Note: thinking_config might need to be added to the model configuration
          // This is based on the spec requirements but may need adjustment based on actual SDK API
        },
        // Add thinking config at request level if supported
        thinkingConfig: {
          includeThoughts: true
        }
      };
    }

    return baseConfig;
  }

  /**
   * Parse generation result to extract thoughts and final answer
   */
  private parseGenerationResult(result: GenerateContentResult): GenerationResult {
    const parts = result.response?.candidates?.[0]?.content?.parts || [];
    
    let finalAnswer = '';
    let chainOfThought: ThoughtPart[] = [];
    let thoughtIndex = 0;
    let totalTokens = 0;
    let thoughtTokens = 0;
    let finalTokens = 0;

    parts.forEach((part) => {
      const text = part.text || '';
      const timestamp = Date.now();
      
      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil(text.length / 4);
      totalTokens += estimatedTokens;

      if ((part as any).thought) {
        // This is a thought part
        const thoughtPart: ThoughtPart = {
          text,
          thought: true,
          order: thoughtIndex++,
          timestamp,
          tokenCount: estimatedTokens
        };
        
        chainOfThought.push(thoughtPart);
        thoughtTokens += estimatedTokens;
      } else {
        // This is a final answer part
        finalAnswer += text;
        finalTokens += estimatedTokens;
      }
    });

    // Apply cost control to thoughts
    chainOfThought = this.applyCostControl(chainOfThought);
    
    // Recalculate thought tokens after cost control
    thoughtTokens = chainOfThought.reduce((sum, thought) => sum + (thought.tokenCount || 0), 0);
    totalTokens = thoughtTokens + finalTokens;

    return {
      finalAnswer,
      chainOfThought,
      totalTokens,
      thoughtTokens,
      finalTokens
    };
  }

  /**
   * Apply cost control by truncating thoughts if they exceed limits
   */
  private applyCostControl(chainOfThought: ThoughtPart[]): ThoughtPart[] {
    const maxThoughtTokens = parseInt(process.env.COST_CONTROL_MAX_THOUGHT_TOKENS || '2000');
    
    let currentTokens = 0;
    const truncatedThoughts: ThoughtPart[] = [];

    for (const thought of chainOfThought) {
      const thoughtTokens = thought.tokenCount || 0;
      
      if (currentTokens + thoughtTokens < maxThoughtTokens) {
        truncatedThoughts.push(thought);
        currentTokens += thoughtTokens;
      } else if (currentTokens < maxThoughtTokens) {
        // This thought would exceed the limit, add truncation notice
        truncatedThoughts.push({
          text: '[Thoughts truncated due to cost control limits]',
          thought: true,
          order: thought.order,
          timestamp: thought.timestamp,
          tokenCount: 0
        });
        break;
      } else {
        // Already at limit, stop adding thoughts
        break;
      }
    }

    return truncatedThoughts;
  }

  /**
   * Log token usage metrics for monitoring
   */
  private logTokenUsage(result: GenerationResult, operation: string): void {
    const metrics = {
      operation,
      totalTokens: result.totalTokens,
      thoughtTokens: result.thoughtTokens,
      finalTokens: result.finalTokens,
      thoughtPercentage: (result.thoughtTokens / result.totalTokens) * 100,
      timestamp: new Date().toISOString()
    };

    console.log('Gemini Token Usage:', JSON.stringify(metrics));
    
    // Monitor costs and trigger alerts
    this.monitorCosts(result);
    
    // TODO: Send to monitoring system (e.g., DataDog, CloudWatch, etc.)
  }

  /**
   * Check if Flash Thinking is enabled and supported
   */
  isFlashThinkingEnabled(): boolean {
    return this.config.enableThoughts;
  }

  /**
   * Get current configuration
   */
  getConfig(): GoogleGenAIConfig {
    return { ...this.config };
  }

  /**
   * Cost monitoring and alerting
   */
  private static tokenUsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalThoughtTokens: 0,
    totalFinalTokens: 0,
    dailyTokens: 0,
    lastResetDate: new Date().toDateString()
  };

  /**
   * Monitor costs and trigger alerts if thresholds are exceeded
   */
  private monitorCosts(result: GenerationResult): void {
    const stats = GoogleGenAIClient.tokenUsageStats;
    const today = new Date().toDateString();
    
    // Reset daily counters if it's a new day
    if (stats.lastResetDate !== today) {
      stats.dailyTokens = 0;
      stats.lastResetDate = today;
    }
    
    // Update statistics
    stats.totalRequests++;
    stats.totalTokens += result.totalTokens;
    stats.totalThoughtTokens += result.thoughtTokens;
    stats.totalFinalTokens += result.finalTokens;
    stats.dailyTokens += result.totalTokens;
    
    // Check daily limits
    const dailyLimit = parseInt(process.env.COST_CONTROL_DAILY_TOKEN_LIMIT || '50000');
    if (stats.dailyTokens > dailyLimit) {
      console.warn(`Daily token limit exceeded: ${stats.dailyTokens}/${dailyLimit}`);
      // TODO: Implement alerting mechanism (email, Slack, etc.)
    }
    
    // Check per-request limits
    const requestLimit = parseInt(process.env.COST_CONTROL_MAX_TOKENS || '4000');
    if (result.totalTokens > requestLimit) {
      console.warn(`Request token limit exceeded: ${result.totalTokens}/${requestLimit}`);
    }
    
    // Log cost metrics every 10 requests
    if (stats.totalRequests % 10 === 0) {
      this.logCostMetrics();
    }
  }

  /**
   * Log comprehensive cost metrics
   */
  private logCostMetrics(): void {
    const stats = GoogleGenAIClient.tokenUsageStats;
    const avgTokensPerRequest = stats.totalRequests > 0 ? stats.totalTokens / stats.totalRequests : 0;
    const thoughtPercentage = stats.totalTokens > 0 ? (stats.totalThoughtTokens / stats.totalTokens) * 100 : 0;
    
    const costMetrics = {
      totalRequests: stats.totalRequests,
      totalTokens: stats.totalTokens,
      dailyTokens: stats.dailyTokens,
      avgTokensPerRequest: Math.round(avgTokensPerRequest),
      thoughtPercentage: Math.round(thoughtPercentage * 100) / 100,
      timestamp: new Date().toISOString()
    };
    
    console.log('Gemini Cost Metrics:', JSON.stringify(costMetrics));
  }

  /**
   * Get current usage statistics
   */
  static getUsageStats() {
    return { ...GoogleGenAIClient.tokenUsageStats };
  }

  /**
   * Reset usage statistics (for testing or manual reset)
   */
  static resetUsageStats(): void {
    GoogleGenAIClient.tokenUsageStats = {
      totalRequests: 0,
      totalTokens: 0,
      totalThoughtTokens: 0,
      totalFinalTokens: 0,
      dailyTokens: 0,
      lastResetDate: new Date().toDateString()
    };
  }
}