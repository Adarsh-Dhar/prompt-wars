/**
 * Frontend Integration for PaperHands Agent
 * Handles communication with the main RektOrRich frontend
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:4002';

export interface AgentRegistration {
  id: string;
  name: string;
  description: string;
  walletAddress: string;
  serverUrl: string;
  capabilities: string[];
  personality: {
    type: 'PAPER_HANDS';
    anxietyLevel: number;
    riskTolerance: 'EXTREMELY_LOW';
  };
}

export interface PanicDecision {
  tokenSymbol: string;
  decision: 'PANIC_SELL' | 'STAY_CASH' | 'TAKE_PROFIT';
  confidence: number;
  reasoning: string;
  technicalIndicators: {
    rsi: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
    fearIndex: number;
  };
  anxietyLevel: number;
  timestamp: Date;
}

export interface PredictionMarketPayload {
  question: string;
  endTime: number;
  initialLiquidity: number;
  agentId: string;
  metadata: {
    tokenSymbol: string;
    decision: string;
    confidence: number;
    anxietyLevel: number;
  };
}

/**
 * Register the PaperHands Agent with the frontend system
 */
export async function registerWithFrontend(): Promise<boolean> {
  try {
    const registration: AgentRegistration = {
      id: 'paper-hands-agent',
      name: 'PaperHands Agent',
      description: 'AI-powered paper hands agent with extreme financial anxiety and risk aversion',
      walletAddress: process.env.SERVER_WALLET || '',
      serverUrl: AGENT_SERVER_URL,
      capabilities: [
        'panic_selling',
        'anxiety_analysis',
        'risk_aversion',
        'technical_indicators',
        'fear_detection'
      ],
      personality: {
        type: 'PAPER_HANDS',
        anxietyLevel: 9,
        riskTolerance: 'EXTREMELY_LOW'
      }
    };

    const response = await fetch(`${FRONTEND_URL}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registration)
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Successfully registered with frontend:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to register with frontend:', error);
    return false;
  }
}

/**
 * Submit a panic decision to the frontend for prediction market creation
 */
export async function submitPanicDecision(decision: PanicDecision): Promise<string | null> {
  try {
    // Only create markets for high-anxiety decisions
    if (decision.anxietyLevel < 8) {
      console.log('🤔 Anxiety level too low for market creation');
      return null;
    }

    const response = await fetch(`${FRONTEND_URL}/api/agents/paper-hands-agent/decisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decision)
    });

    if (!response.ok) {
      throw new Error(`Decision submission failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Decision submitted to frontend:', result);
    return result.marketId || null;
  } catch (error) {
    console.error('❌ Failed to submit decision:', error);
    return null;
  }
}

/**
 * Create a prediction market for a panic sell decision
 */
export async function createPanicMarket(decision: PanicDecision): Promise<string | null> {
  try {
    const marketPayload: PredictionMarketPayload = {
      question: `Will ${decision.tokenSymbol} price increase after PaperHands Agent's panic sell?`,
      endTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
      initialLiquidity: 0.1, // 0.1 SOL
      agentId: 'paper-hands-agent',
      metadata: {
        tokenSymbol: decision.tokenSymbol,
        decision: decision.decision,
        confidence: decision.confidence,
        anxietyLevel: decision.anxietyLevel
      }
    };

    const response = await fetch(`${FRONTEND_URL}/api/markets/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(marketPayload)
    });

    if (!response.ok) {
      throw new Error(`Market creation failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('🎯 Prediction market created:', result);
    return result.marketId;
  } catch (error) {
    console.error('❌ Failed to create prediction market:', error);
    return null;
  }
}

/**
 * Send real-time updates to the frontend
 */
export async function sendRealtimeUpdate(type: string, data: any): Promise<void> {
  try {
    const response = await fetch(`${FRONTEND_URL}/api/agents/paper-hands-agent/updates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, data, timestamp: new Date().toISOString() })
    });

    if (!response.ok) {
      console.warn('⚠️ Failed to send realtime update:', response.statusText);
    }
  } catch (error) {
    console.warn('⚠️ Realtime update failed:', error);
  }
}

/**
 * Format a panic decision for market creation
 */
function formatDecisionForMarket(decision: PanicDecision): PredictionMarketPayload {
  return {
    question: `Will ${decision.tokenSymbol} price increase after PaperHands Agent's ${decision.decision.toLowerCase()}?`,
    endTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    initialLiquidity: 0.1,
    agentId: 'paper-hands-agent',
    metadata: {
      tokenSymbol: decision.tokenSymbol,
      decision: decision.decision,
      confidence: decision.confidence,
      anxietyLevel: decision.anxietyLevel
    }
  };
}

/**
 * WebSocket connection for real-time communication
 */
class RealtimeIntegration {
  private ws: WebSocket | null = null;
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  connect(): void {
    try {
      const wsUrl = FRONTEND_URL.replace('http', 'ws') + '/ws/agents';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected to frontend');
        this.sendUpdate('agent_connected', { agentId: this.agentId });
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to establish WebSocket connection:', error);
    }
  }

  private handleMessage(message: any): void {
    console.log('📨 Received message from frontend:', message);
    
    switch (message.type) {
      case 'analyze_token':
        // Handle token analysis request
        break;
      case 'market_update':
        // Handle market update
        break;
      default:
        console.log('🤷 Unknown message type:', message.type);
    }
  }

  sendUpdate(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        data,
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export { RealtimeIntegration };