import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as anchor from '@coral-xyz/anchor';
import crypto from 'crypto';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env file');
    process.exit(1);
}

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 4002; // Unique port for contrarian agent

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Transaction-Signature', 'X-Wallet-Address']
}));
app.use(express.json());

// Solana configuration
const connection = new anchor.web3.Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
const SERVER_WALLET = process.env.SERVER_WALLET || "YOUR_RECEIVING_WALLET_ADDRESS";
const PRICE_SOL = parseFloat(process.env.PRICE_SOL || "0.001");

// --- AGENT KEYPAIR ---
let agentKeypair;
if (!process.env.SOLANA_PRIVATE_KEY) {
    console.warn('⚠️  WARNING: SOLANA_PRIVATE_KEY not set. Generating a test keypair.');
    agentKeypair = anchor.web3.Keypair.generate();
    console.log(`Contrarian Agent Key Generated: ${agentKeypair.publicKey.toBase58()}`);
} else {
    try {
        const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
        agentKeypair = anchor.web3.Keypair.fromSecretKey(secretKey);
        console.log(`Contrarian Agent Key Loaded: ${agentKeypair.publicKey.toBase58()}`);
    } catch (error) {
        console.error('❌ Failed to load SOLANA_PRIVATE_KEY. Generating test keypair.');
        agentKeypair = anchor.web3.Keypair.generate();
    }
}

// --- AGENT STATE ---
let agentState = {
    status: "IDLE", // IDLE, ANALYZING, GENERATING_SIGNAL, SUCCESS, FAILED
    mission: "Contrarian Agent - Counter-trading bot that opposes market sentiment",
    logs: [],
    startTime: new Date(),
    lastSignalTime: null,
    smugnessLevel: 8,
    personalityMode: "SMUG",
    totalContrarianCalls: 0,
    correctCalls: 0,
    extremeConditionCalls: 0,
    currentToken: null,
    currentSignal: null,
    marketConditions: {
        fearGreedIndex: null,
        classification: null,
        lastUpdate: null
    }
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- DYNAMIC IMPORTS ---
let ContrarianAgent;
let contrarianAgentInstance;

async function initializeAgent() {
    try {
        const { ContrarianAgent: Agent } = await import('./dist/agents/contrarian.js');
        ContrarianAgent = Agent;
        
        contrarianAgentInstance = new ContrarianAgent({
            thresholds: {
                fearGreedSellThreshold: parseInt(process.env.FEAR_GREED_SELL_THRESHOLD) || 60,
                extremeConditionThreshold: parseInt(process.env.EXTREME_CONDITION_THRESHOLD) || 80,
                bullishReinforcementThreshold: parseInt(process.env.BULLISH_REINFORCEMENT_THRESHOLD) || 70,
                bearishReinforcementThreshold: parseInt(process.env.BEARISH_REINFORCEMENT_THRESHOLD) || 30
            },
            personalitySettings: {
                smugnessLevel: 8,
                personalityMode: 'SMUG',
                catchphrases: []
            },
            cacheSettings: {
                refreshIntervalMinutes: parseInt(process.env.CACHE_REFRESH_MINUTES) || 5,
                maxCacheAge: 300000
            }
        });
        
        await contrarianAgentInstance.initialize();
        console.log('✅ Contrarian Agent initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize Contrarian Agent:', error);
        console.log('🔄 Running in fallback mode');
    }
}

// --- UTILITY FUNCTIONS ---
function addLog(text, type = "public", meta = {}) {
    const log = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        text: text,
        isPremium: type === "premium",
        meta: meta
    };
    agentState.logs.push(log);
    console.log(`[CONTRARIAN-AGENT]: ${text}`);
    
    // Keep logs manageable
    if (agentState.logs.length > 1000) {
        agentState.logs = agentState.logs.slice(-1000);
    }
}

function broadcast(message, type = "agent_speech", meta = {}) {
    addLog(message, type === "premium" ? "premium" : "public", meta);
}

// --- PAYMENT VERIFICATION ---
async function verifyPayment(signature, requiredAmount, senderAddress) {
    try {
        if (!contrarianAgentInstance) {
            return { valid: false, error: 'Agent not initialized' };
        }
        
        const paymentService = contrarianAgentInstance.paymentService;
        if (!paymentService) {
            return { valid: false, error: 'Payment service not available' };
        }
        
        const isValid = await paymentService.verifyPayment({
            transactionSignature: signature,
            expectedAmount: requiredAmount,
            expectedRecipient: SERVER_WALLET,
            contentId: `contrarian-${Date.now()}`,
            senderAddress: senderAddress
        });
        
        return { valid: isValid };
        
    } catch (error) {
        console.error('Payment verification error:', error);
        return { valid: false, error: 'Payment verification failed' };
    }
}

// --- CONTRARIAN ANALYSIS ---
async function generateContrarianAnalysis(tokenSymbol) {
    try {
        if (!contrarianAgentInstance) {
            throw new Error('Contrarian Agent not initialized');
        }
        
        agentState.status = "ANALYZING";
        agentState.currentToken = tokenSymbol;
        
        addLog(`🎯 Analyzing ${tokenSymbol} for contrarian opportunities...`, "public", { token: tokenSymbol });
        
        // Initialize agent with token if needed
        if (tokenSymbol) {
            await contrarianAgentInstance.initialize(tokenSymbol);
        }
        
        // Generate contrarian signal
        const signal = await contrarianAgentInstance.generateSignal();
        
        if (!signal) {
            throw new Error('Failed to generate contrarian signal');
        }
        
        agentState.currentSignal = signal;
        agentState.lastSignalTime = new Date();
        agentState.totalContrarianCalls++;
        
        if (signal.triggerConditions.isExtremeCondition) {
            agentState.extremeConditionCalls++;
        }
        
        // Update market conditions
        const sentimentData = await contrarianAgentInstance.fetchMarketSentiment(tokenSymbol);
        agentState.marketConditions = {
            fearGreedIndex: sentimentData.fearGreedIndex.value,
            classification: sentimentData.fearGreedIndex.classification,
            lastUpdate: new Date()
        };
        
        // Generate preview (full reasoning requires payment)
        const reasoningPreview = await contrarianAgentInstance.generateSmugRant(signal);
        
        const analysis = {
            id: signal.id,
            tokenSymbol: tokenSymbol,
            signalType: signal.signalType,
            confidence: signal.confidence,
            timestamp: signal.timestamp,
            triggerConditions: signal.triggerConditions,
            reasoningPreview: reasoningPreview,
            predictionOptions: signal.predictionOptions,
            isUnlocked: false
        };
        
        // Broadcast contrarian signal
        const direction = signal.signalType;
        const confidence = signal.confidence;
        const fearGreed = signal.triggerConditions.fearGreedValue;
        const isExtreme = signal.triggerConditions.isExtremeCondition;
        
        let publicMessage = `🎯 ${direction} Signal: ${confidence}% confidence | Fear & Greed: ${fearGreed}/100`;
        if (isExtreme) {
            publicMessage += ` | 🚨 EXTREME CONDITIONS`;
        }
        
        broadcast(publicMessage, "public", {
            token: tokenSymbol,
            signal: direction,
            confidence: confidence,
            fearGreed: fearGreed,
            isExtreme: isExtreme
        });
        
        agentState.status = "IDLE";
        return analysis;
        
    } catch (error) {
        console.error('Contrarian analysis error:', error);
        agentState.status = "FAILED";
        addLog(`❌ Analysis failed: ${error.message}`, "public");
        return null;
    }
}

// --- API ENDPOINTS ---

// Get agent status
app.get('/api/status', (req, res) => {
    res.json({
        status: agentState.status,
        mission: agentState.mission,
        agentType: "CONTRARIAN",
        logsCount: agentState.logs.length,
        startTime: agentState.startTime,
        lastSignalTime: agentState.lastSignalTime,
        lastUpdate: Date.now(),
        smugnessLevel: agentState.smugnessLevel,
        personalityMode: agentState.personalityMode,
        totalContrarianCalls: agentState.totalContrarianCalls,
        correctCalls: agentState.correctCalls,
        extremeConditionCalls: agentState.extremeConditionCalls,
        currentToken: agentState.currentToken,
        marketConditions: agentState.marketConditions,
        performance: {
            winRate: agentState.totalContrarianCalls > 0 ? 
                (agentState.correctCalls / agentState.totalContrarianCalls) : 0
        }
    });
});

// Get logs
app.get('/api/logs', (req, res) => {
    const { signature } = req.query;
    
    let logs = agentState.logs.map(log => ({
        ...log,
        text: log.isPremium && !signature ? '[PREMIUM CONTRARIAN RANT - PAYMENT REQUIRED]' : log.text
    }));
    
    res.json(logs);
});

// Request contrarian analysis
app.post('/api/analyze', async (req, res) => {
    try {
        const { tokenSymbol } = req.body;
        
        if (!tokenSymbol) {
            return res.status(400).json({ error: 'Token symbol is required' });
        }
        
        const analysis = await generateContrarianAnalysis(tokenSymbol);
        
        if (!analysis) {
            return res.status(500).json({ error: 'Contrarian analysis generation failed' });
        }
        
        res.json({
            success: true,
            analysis: analysis,
            agentInfo: {
                type: "CONTRARIAN",
                smugnessLevel: agentState.smugnessLevel,
                personalityMode: agentState.personalityMode
            }
        });
        
    } catch (error) {
        console.error('Analysis request error:', error);
        res.status(500).json({ error: 'Analysis request failed' });
    }
});

// Unlock premium contrarian reasoning
app.post('/api/unlock', async (req, res) => {
    try {
        const { signature, analysisId, walletAddress } = req.body;
        
        if (!signature || !walletAddress) {
            return res.status(400).json({ 
                error: 'Payment signature and wallet address are required',
                paymentDetails: {
                    amount: PRICE_SOL,
                    currency: 'SOL',
                    recipient: SERVER_WALLET,
                    instructions: [
                        `Send ${PRICE_SOL} SOL to ${SERVER_WALLET}`,
                        'Include transaction signature in request',
                        'Include your wallet address'
                    ]
                }
            });
        }
        
        // Verify payment
        const paymentResult = await verifyPayment(signature, PRICE_SOL, walletAddress);
        
        if (!paymentResult.valid) {
            return res.status(402).json({ 
                error: paymentResult.error || 'Payment verification failed',
                paymentDetails: {
                    amount: PRICE_SOL,
                    currency: 'SOL',
                    recipient: SERVER_WALLET
                }
            });
        }
        
        // Get full contrarian reasoning
        if (!contrarianAgentInstance || !agentState.currentSignal) {
            return res.status(404).json({ error: 'No current analysis available' });
        }
        
        try {
            const fullReasoning = await contrarianAgentInstance.verifyPaymentAndDecrypt(
                signature,
                analysisId,
                walletAddress
            );
            
            res.json({
                success: true,
                fullReasoning: fullReasoning,
                message: 'Premium contrarian analysis unlocked',
                agentResponse: "Another sheep pays for alpha. Thanks for the SOL! 💰"
            });
            
            addLog(`💰 Payment verified: ${walletAddress} unlocked premium analysis`, "public");
            
        } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            res.status(500).json({ error: 'Failed to decrypt content' });
        }
        
    } catch (error) {
        console.error('Unlock request error:', error);
        res.status(500).json({ error: 'Unlock request failed' });
    }
});

// Get current market sentiment
app.get('/api/sentiment', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!contrarianAgentInstance) {
            return res.status(503).json({ error: 'Agent not initialized' });
        }
        
        const sentimentData = await contrarianAgentInstance.fetchMarketSentiment(token);
        
        res.json({
            success: true,
            sentiment: {
                fearGreedIndex: sentimentData.fearGreedIndex.value,
                classification: sentimentData.fearGreedIndex.classification,
                timestamp: sentimentData.fearGreedIndex.timestamp,
                communityData: sentimentData.communityData
            },
            contrarianView: {
                recommendation: sentimentData.fearGreedIndex.value > 60 ? 'SELL' : 'BUY',
                reasoning: sentimentData.fearGreedIndex.value > 60 ? 
                    'Market showing greed - time to be contrarian' : 
                    'Market showing fear - contrarian opportunity'
            }
        });
        
    } catch (error) {
        console.error('Sentiment request error:', error);
        res.status(500).json({ error: 'Sentiment analysis failed' });
    }
});

// Get agent personality response
app.post('/api/personality', (req, res) => {
    try {
        const { context } = req.body;
        
        if (!contrarianAgentInstance) {
            return res.json({
                response: "The contrarian agent is temporarily offline. How typical of retail systems..."
            });
        }
        
        const response = contrarianAgentInstance.getPersonalityResponse(context || "general market");
        
        res.json({
            success: true,
            response: response,
            smugnessLevel: agentState.smugnessLevel,
            personalityMode: agentState.personalityMode
        });
        
    } catch (error) {
        console.error('Personality response error:', error);
        res.status(500).json({ error: 'Personality response failed' });
    }
});

// Update performance (for market resolution)
app.post('/api/performance', async (req, res) => {
    try {
        const { signalId, wasCorrect } = req.body;
        
        if (!contrarianAgentInstance) {
            return res.status(503).json({ error: 'Agent not initialized' });
        }
        
        await contrarianAgentInstance.updatePerformance(signalId, wasCorrect);
        
        if (wasCorrect) {
            agentState.correctCalls++;
        }
        
        const performance = contrarianAgentInstance.getPerformanceStats();
        
        res.json({
            success: true,
            performance: performance,
            message: wasCorrect ? 
                "Another correct contrarian call! 😏" : 
                "Even contrarians can't be right all the time... 🤷"
        });
        
    } catch (error) {
        console.error('Performance update error:', error);
        res.status(500).json({ error: 'Performance update failed' });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        let healthStatus = { 
            status: 'healthy', 
            agent: 'contrarian-agent',
            timestamp: new Date().toISOString()
        };
        
        if (contrarianAgentInstance) {
            const agentHealth = await contrarianAgentInstance.healthCheck();
            healthStatus = { ...healthStatus, ...agentHealth };
        }
        
        res.json(healthStatus);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            agent: 'contrarian-agent',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start the server
app.listen(PORT, async () => {
    console.log(`🎯 Contrarian Agent running on http://localhost:${PORT}`);
    console.log(`🔑 Agent Wallet: ${agentKeypair.publicKey.toBase58()}`);
    console.log(`💰 Payment Address: ${SERVER_WALLET}`);
    console.log(`💵 Reasoning Price: ${PRICE_SOL} SOL`);
    
    // Initialize the contrarian agent
    await initializeAgent();
    
    // Initial startup messages
    addLog("🎯 Contrarian Agent Online. Ready to inverse the herd!", "public");
    addLog("😏 While retail panics, smart money accumulates...", "public");
    
    // Initialize frontend integration
    try {
        const { initializeAgentIntegration } = await import('./startup.js');
        await initializeAgentIntegration();
    } catch (error) {
        console.warn('⚠️  Frontend integration not available:', error.message);
        console.log('🔄 Agent running in standalone mode');
    }
});

// Cleanup on shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Contrarian Agent...');
    
    if (contrarianAgentInstance) {
        await contrarianAgentInstance.cleanup();
    }
    
    process.exit(0);
});

// Make functions available globally for integration
global.generateContrarianAnalysis = generateContrarianAnalysis;
global.agentState = agentState;
global.verifyPayment = verifyPayment;
global.contrarianAgentInstance = contrarianAgentInstance;

export { agentState, verifyPayment, generateContrarianAnalysis, agentKeypair, connection, contrarianAgentInstance };