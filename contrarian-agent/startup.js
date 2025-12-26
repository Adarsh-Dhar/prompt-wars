import { agentState, contrarianAgentInstance } from './agent-server.js';
import * as anchor from '@coral-xyz/anchor';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

// Initialize contrarian agent integration
async function initializeAgentIntegration() {
  try {
    console.log('🎯 Initializing Contrarian Agent integration with frontend...');

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
    // Use a mock connection object to avoid any real network calls or transactions.
    const mockFail = process.env.MOCK_CHAIN_FAIL === 'true';
    const connection = mockFail ? { rpcEndpoint: 'mock-failed' } : { rpcEndpoint: process.env.RPC_URL || 'mock-solana-devnet' };

    // Wait for agent instance to be ready
    let retries = 0;
    while (!contrarianAgentInstance && retries < 10) {
      console.log('⏳ Waiting for Contrarian Agent to initialize...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (!contrarianAgentInstance) {
      throw new Error('Contrarian Agent failed to initialize');
    }

    // Register agent with frontend through market integration
    try {
      const registrationSuccess = await contrarianAgentInstance.marketIntegration.registerAgent();
      
      if (registrationSuccess) {
        console.log('✅ Successfully registered Contrarian Agent with frontend');
      } else {
        console.warn('⚠️  Failed to register with frontend, continuing anyway...');
      }
    } catch (regError) {
      console.warn('⚠️  Registration error:', regError.message);
    }

    // Enhanced agent functions for frontend integration
    const originalGenerateContrarianAnalysis = global.generateContrarianAnalysis;
    
    global.generateContrarianAnalysis = async function(tokenSymbol) {
      const analysis = await originalGenerateContrarianAnalysis(tokenSymbol);
      
      if (analysis && contrarianAgentInstance) {
        try {
          // Update agent status
          await contrarianAgentInstance.marketIntegration.updateAgentStatus({
            isActive: true,
            lastSignalTime: new Date(),
            currentAnalysis: `Generated ${analysis.signalType} signal for ${tokenSymbol}`,
            performanceStats: contrarianAgentInstance.marketIntegration.getPerformanceStats()
          });

          console.log(`📊 Updated frontend with ${analysis.signalType} signal for ${tokenSymbol}`);
          
        } catch (updateError) {
          console.warn('⚠️  Failed to update frontend:', updateError.message);
        }
      }

      return analysis;
    };

    // Periodic status updates to frontend
    setInterval(async () => {
      if (contrarianAgentInstance) {
        try {
          await contrarianAgentInstance.marketIntegration.updateAgentStatus({
            isActive: true,
            lastSignalTime: agentState.lastSignalTime,
            currentAnalysis: agentState.currentToken ? 
              `Monitoring ${agentState.currentToken} for contrarian opportunities` : 
              'Monitoring market for contrarian opportunities',
            performanceStats: contrarianAgentInstance.marketIntegration.getPerformanceStats()
          });
        } catch (statusError) {
          console.warn('⚠️  Status update failed:', statusError.message);
        }
      }
    }, 60000); // Every 60 seconds

    // Periodic cleanup
    setInterval(async () => {
      if (contrarianAgentInstance) {
        try {
          await contrarianAgentInstance.cleanup();
          console.log('🧹 Performed periodic cleanup');
        } catch (cleanupError) {
          console.warn('⚠️  Cleanup failed:', cleanupError.message);
        }
      }
    }, 3600000); // Every hour

    console.log('🎯 Contrarian Agent integration initialized successfully');
    console.log(`🔑 Agent ID: ${agentKeypair.publicKey.toBase58()}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔗 Agent Server: ${process.env.AGENT_SERVER_URL || 'http://localhost:4002'}`);
    console.log(`😏 Smugness Level: ${agentState.smugnessLevel}/10`);
    console.log(`🎭 Personality Mode: ${agentState.personalityMode}`);

    return {
      agentKeypair,
      connection,
      contrarianAgent: contrarianAgentInstance,
    };

  } catch (error) {
    console.error('❌ Failed to initialize Contrarian Agent integration:', error);
    console.log('🔄 Continuing in standalone mode...');
    
    // Don't exit on integration failure, allow standalone operation
    return {
      agentKeypair: null,
      connection: null,
      contrarianAgent: contrarianAgentInstance,
    };
  }
}

// Health monitoring
async function monitorAgentHealth() {
  if (!contrarianAgentInstance) {
    return;
  }

  try {
    const health = await contrarianAgentInstance.healthCheck();
    
    if (health.status === 'unhealthy') {
      console.error('🚨 Contrarian Agent health check failed:', health.details);
    } else if (health.status === 'degraded') {
      console.warn('⚠️  Contrarian Agent performance degraded:', health.details);
    }
    
  } catch (healthError) {
    console.error('❌ Health check error:', healthError.message);
  }
}

// Start health monitoring
setInterval(monitorAgentHealth, 300000); // Every 5 minutes

// Auto-initialize if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeAgentIntegration();
}

export { initializeAgentIntegration, monitorAgentHealth };