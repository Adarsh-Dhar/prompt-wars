import * as anchor from '@coral-xyz/anchor';

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

export interface AgentRegistrationData {
  name: string;
  description: string;
  tags: string[];
  serverUrl: string;
  walletAddress: string;
}

// Integration utilities
export class FrontendIntegration {
  private agentWallet: anchor.web3.Keypair;
  private connection: anchor.web3.Connection;

  constructor(agentWallet: anchor.web3.Keypair, connection: anchor.web3.Connection) {
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
          walletAddress: this.agentWallet.publicKey.toBase58(),
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
      const response = await fetch(`${FRONTEND_CONFIG.url}/api/agents/${this.agentWallet.publicKey.toBase58()}/decisions`, {
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
      const response = await fetch(`${FRONTEND_CONFIG.url}/api/agents/${this.agentWallet.publicKey.toBase58()}/status`);
      
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
      await fetch(`${FRONTEND_CONFIG.url}/api/agents/${this.agentWallet.publicKey.toBase58()}/activity`, {
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

export default FrontendIntegration;