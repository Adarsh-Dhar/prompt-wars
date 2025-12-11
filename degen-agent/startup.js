import { agentState } from './agent-server.js';
import FrontendIntegration, { 
  RealtimeIntegration, 
  generateMarketQuestion, 
  calculateMarketEndTime,
  formatDecisionForMarket 
} from './src/lib/frontend-integration.ts';
import * as anchor from '@coral-xyz/anchor';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

// Initialize agent integration
async function initializeAgentIntegration() {
  try {
    console.log('🚀 Initializing Degen Agent integration with frontend...');

    // Setup agent keypair
    let agentKeypair;
    if (process.env.SOLANA_PRIVATE_KEY) {
      const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
      agentKeypair = anchor.web3.Keypair.fromSecretKey(secretKey);
    } else {
      agentKeypair = anchor.web3.Keypair.generate();
      console.warn('⚠️  Using generated keypair for development');
    }

    // Setup connection
    const connection = new anchor.web3.Connection(
      process.env.RPC_URL || "https://api.devnet.solana.com"
    );

    // Initialize frontend integration
    const frontendIntegration = new FrontendIntegration(agentKeypair, connection);

    // Register agent with frontend
    const registrationSuccess = await frontendIntegration.registerWithFrontend({
      name: "RektOrRich Agent",
      description: "AI-powered crypto prediction market agent with payment-gated insights",
      tags: ["crypto", "trading", "prediction", "degen", "ai"],
      serverUrl: process.env.AGENT_SERVER_URL || 'http://localhost:4001',
      walletAddress: agentKeypair.publicKey.toBase58(),
    });

    if (registrationSuccess) {
      console.log('✅ Successfully registered with frontend');
    } else {
      console.warn('⚠️  Failed to register with frontend, continuing anyway...');
    }

    // Setup real-time integration
    const realtimeIntegration = new RealtimeIntegration(agentKeypair.publicKey.toBase58());
    realtimeIntegration.connect();

    // Enhanced agent functions for frontend integration
    const originalGenerateTradingAnalysis = global.generateTradingAnalysis;
    
    global.generateTradingAnalysis = async function(tokenSymbol, currentPrice = null) {
      const analysis = await originalGenerateTradingAnalysis(tokenSymbol, currentPrice);
      
      if (analysis) {
        // Submit decision to frontend
        const decisionPayload = formatDecisionForMarket(analysis);
        await frontendIntegration.submitTradingDecision(decisionPayload);

        // Create prediction market if confidence is high enough
        if (analysis.confidence >= 75) {
          const marketQuestion = generateMarketQuestion(tokenSymbol, analysis.decision);
          const endTime = calculateMarketEndTime(24); // 24 hour market
          
          const marketId = await frontendIntegration.createPredictionMarket({
            question: marketQuestion,
            endTime: endTime,
            initialLiquidity: 0.1, // 0.1 SOL initial liquidity
            agentId: agentKeypair.publicKey.toBase58(),
          });

          if (marketId) {
            analysis.marketId = marketId;
            console.log(`📊 Created prediction market: ${marketId}`);
            
            // Notify real-time subscribers
            realtimeIntegration.sendUpdate('market_created', {
              marketId,
              analysis,
              question: marketQuestion,
            });
          }
        }

        // Notify frontend of analysis completion
        await frontendIntegration.notifyActivity({
          type: 'analysis',
          data: analysis,
          timestamp: new Date(),
        });

        // Send real-time update
        realtimeIntegration.sendUpdate('analysis_complete', analysis);
      }

      return analysis;
    };

    // Periodic status updates to frontend
    setInterval(async () => {
      await frontendIntegration.notifyActivity({
        type: 'status_update',
        data: {
          status: agentState.status,
          emotion: agentState.emotion,
          lastToken: agentState.lastToken,
          logsCount: agentState.logs.length,
        },
        timestamp: new Date(),
      });
    }, 30000); // Every 30 seconds

    console.log('🎯 Degen Agent integration initialized successfully');
    console.log(`🔑 Agent ID: ${agentKeypair.publicKey.toBase58()}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔗 Agent Server: ${process.env.AGENT_SERVER_URL || 'http://localhost:4001'}`);

    return {
      agentKeypair,
      connection,
      frontendIntegration,
      realtimeIntegration,
    };

  } catch (error) {
    console.error('❌ Failed to initialize agent integration:', error);
    process.exit(1);
  }
}

// Auto-initialize if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAgentIntegration();
}

export { initializeAgentIntegration };