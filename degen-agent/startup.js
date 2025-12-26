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

// Validate Gemini API connectivity and configuration
async function validateGeminiConnectivity() {
  console.log('🔍 Validating Gemini API configuration...');
  
  // Check required environment variables
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required. Get one from https://aistudio.google.com/app/apikey');
  }
  
  if (!process.env.GEMINI_FLASH_MODEL) {
    console.warn('⚠️  GEMINI_FLASH_MODEL not set, using default: gemini-2.0-flash-thinking-exp-01-21');
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const modelName = process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash-thinking-exp-01-21';
    
    // Test basic connectivity with a simple generation
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: parseFloat(process.env.GEMINI_THOUGHTS_TEMPERATURE) || 1.0,
        maxOutputTokens: 100, // Small test
      }
    });
    
    console.log(`📡 Testing connectivity to model: ${modelName}`);
    
    // Test basic generation
    const testResult = await model.generateContent('Test connectivity');
    if (testResult.response.text()) {
      console.log('✅ Gemini API connectivity validated');
    } else {
      throw new Error('Empty response from Gemini API');
    }

    // Validate Flash Thinking configuration
    const enableThoughts = process.env.GEMINI_ENABLE_THOUGHTS === 'true';
    if (enableThoughts) {
      console.log('🧠 Gemini Flash Thinking is enabled');
      
      // Validate thinking-specific configuration
      const maxTokens = parseInt(process.env.COST_CONTROL_MAX_TOKENS) || 4000;
      const maxThoughtTokens = parseInt(process.env.COST_CONTROL_MAX_THOUGHT_TOKENS) || 2000;
      const temperature = parseFloat(process.env.GEMINI_THOUGHTS_TEMPERATURE) || 1.0;
      
      console.log(`   📊 Max tokens: ${maxTokens} (thoughts: ${maxThoughtTokens})`);
      console.log(`   🌡️  Temperature: ${temperature}`);
      
      // Test Flash Thinking capability
      try {
        const thinkingModel = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: 50,
          },
          systemInstruction: {
            parts: [{ text: "Think step by step about this simple question." }]
          }
        });
        
        const thinkingResult = await thinkingModel.generateContent({
          contents: [{ parts: [{ text: "What is 2+2?" }] }],
          generationConfig: {
            candidateCount: 1,
            maxOutputTokens: 50,
          }
        });
        
        if (thinkingResult.response.text()) {
          console.log('✅ Flash Thinking capability validated');
        }
      } catch (thinkingError) {
        console.warn('⚠️  Flash Thinking test failed, but basic API works:', thinkingError.message);
        console.warn('   This may indicate the model doesn\'t support thinking or needs different configuration');
      }
      
      // Validate cost control settings
      if (maxTokens > 8000) {
        console.warn('⚠️  COST_CONTROL_MAX_TOKENS is high (>8000), monitor costs carefully');
      }
      
      if (maxThoughtTokens > maxTokens) {
        console.warn('⚠️  COST_CONTROL_MAX_THOUGHT_TOKENS exceeds COST_CONTROL_MAX_TOKENS');
      }
      
    } else {
      console.log('📝 Using standard Gemini generation (Flash Thinking disabled)');
      console.log('   To enable Flash Thinking, set GEMINI_ENABLE_THOUGHTS=true');
    }
    
    // Validate model name format
    if (!modelName.includes('gemini')) {
      console.warn('⚠️  Model name doesn\'t appear to be a Gemini model:', modelName);
    }
    
    if (enableThoughts && !modelName.includes('thinking')) {
      console.warn('⚠️  Flash Thinking enabled but model name doesn\'t include "thinking"');
      console.warn('   Ensure you\'re using a thinking-capable model like gemini-2.0-flash-thinking-exp-01-21');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Gemini API validation failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('   💡 Check your GEMINI_API_KEY in .env file');
      console.error('   💡 Get a new key from: https://aistudio.google.com/app/apikey');
    } else if (error.message.includes('MODEL_NOT_FOUND')) {
      console.error('   💡 Check your GEMINI_FLASH_MODEL in .env file');
      console.error('   💡 Available models: gemini-2.0-flash-thinking-exp-01-21');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.error('   💡 Gemini API quota exceeded, check your usage limits');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.error('   💡 API key doesn\'t have permission for this model');
    }
    
    throw error;
  }
}

// Initialize agent integration
async function initializeAgentIntegration() {
  try {
    console.log('🚀 Initializing Degen Agent integration with frontend...');
    
    // Validate Gemini API first
    await validateGeminiConnectivity();

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
-    const connection = new anchor.web3.Connection(
-      process.env.RPC_URL || "https://api.devnet.solana.com"
-    );
+    // Replace real Solana Connection with a deterministic mock connection object to avoid RPCs.
+    // Use MOCK_CHAIN_FAIL=true to simulate connection failures if needed.
+    const mockFail = process.env.MOCK_CHAIN_FAIL === 'true';
+    const connection = mockFail ? { rpcEndpoint: 'mock-failed' } : { rpcEndpoint: process.env.RPC_URL || 'mock-solana-devnet' };

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

          if
