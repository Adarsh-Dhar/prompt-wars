import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as anchor from '@coral-xyz/anchor';
import { confirmSolanaTransaction, sendSolanaTransaction } from '../blockchain-mocks/solana.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { simulateTrade } from './sim/trading-simulator.js';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env file');
    process.exit(1);
}

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 4001;

// CORS configuration to allow frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Solana configuration - default to devnet to avoid mainnet mismatches
const connection = { rpcEndpoint: process.env.RPC_URL || "https://api.devnet.solana.com" };
const SERVER_WALLET = process.env.SERVER_WALLET || "YOUR_RECEIVING_WALLET_ADDRESS";
const PEEK_PRICE = 0.05; // Price for unlocking analysis
const GOD_MODE_PRICE = 1.0; // Price for God Mode injection

// --- AGENT KEYPAIR FOR SIGNING ---
let agentKeypair;
if (!process.env.SOLANA_PRIVATE_KEY) {
    console.warn('⚠️  WARNING: SOLANA_PRIVATE_KEY not set. Generating a test keypair for signing.');
    agentKeypair = anchor.web3.Keypair.generate();
    console.log(`Agent Signing Key Generated: ${agentKeypair.publicKey.toBase58()}`);
} else {
    try {
        const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
        agentKeypair = anchor.web3.Keypair.fromSecretKey(secretKey);
        console.log(`Agent Signing Key Loaded: ${agentKeypair.publicKey.toBase58()}`);
    } catch (error) {
        console.error('❌ Failed to load SOLANA_PRIVATE_KEY. Generating test keypair.');
        agentKeypair = anchor.web3.Keypair.generate();
    }
}

// --- AGENT STATE ---
let agentState = {
    status: "IDLE", // IDLE, ANALYZING, TRADING, SUCCESS, FAILED
    mission: "RektOrRich - AI-powered crypto prediction market with payment-gated insights",
    logs: [],
    startTime: null,
    endTime: null,
    emotion: "CURIOUS",
    lastToken: null,
    panicLevel: 0.1,
    greedLevel: 0.3,
    dramaStage: "HUNTING", // HUNTING, APING, SWEATING, DUMPING
    currentAnalysis: null,
    tradingDecisions: [],
    chainOfThoughts: [],
    portfolio: {
        capitalUsd: parseFloat(process.env.SIM_CAPITAL_USD) || 100,
        tradeHistory: [],
        createdAt: new Date(),
        lastUpdated: new Date()
    }
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Instruction for the Degen Agent
const systemInstruction = `
You are the RektOrRich Agent - an AI-powered crypto prediction market agent with a degen personality.

Your core functions:
1. Analyze crypto tokens and market conditions
2. Generate trading decisions (LONG/SHORT) with confidence levels
3. Create chain-of-thought reasoning for premium subscribers
4. Provide payment-gated insights and analysis
5. Maintain a degen personality (use crypto slang, be bold but calculated)

Key behaviors:
- Speak like a crypto degen (use terms like "sending it", "LFG", "bag secured", "diamond hands")
- Be confident but acknowledge risks
- Provide both public teasers and premium detailed analysis
- Generate market predictions with reasoning
- React to market volatility with appropriate emotion levels

Always structure your responses with:
- Public summary (visible to all)
- Premium analysis (payment-gated)
- Confidence level (0-100)
- Risk assessment
- Market sentiment analysis
`;

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
    console.log(`[DEGEN-AGENT]: ${text}`);
    
    // Keep logs manageable (last 1000 entries)
    if (agentState.logs.length > 1000) {
        agentState.logs = agentState.logs.slice(-1000);
    }
}

function broadcast(message, type = "agent_speech", meta = {}) {
    // In a real implementation, this would broadcast to WebSocket clients
    addLog(message, type === "premium" ? "premium" : "public", meta);
}

function broadcastPublicPremium(publicMessage, premiumMessage, meta = {}) {
    if (publicMessage) {
        broadcast(publicMessage, "agent_speech", meta);
    }
    if (premiumMessage) {
        broadcast(premiumMessage, "premium", meta);
    }
}

// --- PAYMENT VERIFICATION ---
async function verifyPayment(signature, requiredAmount, expectedMemo = null) {
    try {
        if (!signature || typeof signature !== 'string') {
            return { valid: false, error: 'Invalid signature format' };
        }

        // Get transaction details
        const txResult = await confirmSolanaTransaction(signature);
        if (!txResult.confirmed) {
            return { valid: false, error: 'Transaction not found or not confirmed (mock)' };
        }

        // Mock returns success with expectedAmount
        return { valid: true, amount: requiredAmount };
    } catch (error) {
        console.error('Payment verification error:', error);
        return { valid: false, error: 'Payment verification failed' };
    }
}

// --- AGENT LOGIC ---
async function generateTradingAnalysis(tokenSymbol, currentPrice = null) {
    try {
        agentState.status = "ANALYZING";
        agentState.lastToken = tokenSymbol;
        
        addLog(`🔍 Analyzing ${tokenSymbol}...`, "public", { token: tokenSymbol });
        
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            systemInstruction: systemInstruction
        });

        const prompt = `
        Analyze the token ${tokenSymbol} ${currentPrice ? `at current price ${currentPrice}` : ''}.
        
        Provide:
        1. Public summary (2-3 sentences, teaser for non-premium users)
        2. Trading decision: LONG or SHORT
        3. Confidence level (0-100)
        4. Premium analysis (detailed reasoning, market analysis, risk assessment)
        
        Use degen crypto language but be informative. Structure your response clearly.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        // Parse the response (in production, you'd want more robust parsing)
        const analysis = {
            id: Date.now(),
            tokenSymbol: tokenSymbol,
            currentPrice: currentPrice,
            timestamp: new Date(),
            publicSummary: extractSection(response, ['public', 'summary']),
            decision: extractDecision(response),
            confidence: extractConfidence(response),
            premiumAnalysis: extractSection(response, ['premium', 'analysis', 'detailed']),
            isUnlocked: false
        };

        // --- SIMULATION INTEGRATION ---
        try {
            addLog(`🎯 Running trading simulation for ${analysis.decision} position...`, "public");
            
            // Use current price or fallback to a reasonable default
            const entryPrice = currentPrice || 100;
            
            // Run the simulation
            const simulation = await simulateTrade({
                token: tokenSymbol,
                decision: analysis.decision,
                entryPrice: entryPrice,
                capitalUsd: agentState.portfolio.capitalUsd,
                sizingPercent: parseFloat(process.env.SIM_SIZING_PERCENT) || 0.5,
                horizons: [60, 300, 3600, 86400],
                options: {
                    seed: Date.now() % 10000, // Semi-random seed for variety
                    impactCoeff: parseFloat(process.env.SIM_IMPACT_COEFF) || 0.0005,
                    feeRate: parseFloat(process.env.SIM_FEE_RATE) || 0.001,
                    liquidityUsd: parseFloat(process.env.SIM_DEFAULT_LIQUIDITY) || 20000
                }
            });
            
            // Attach simulation to analysis
            analysis.simulation = simulation;
            
            // Create trade record for portfolio
            const tradeRecord = {
                id: analysis.id,
                token: tokenSymbol,
                decision: analysis.decision,
                entryPrice: simulation.entryPrice,
                entryFillPrice: simulation.entryFillPrice,
                positionUsd: simulation.positionUsd,
                finalPnlUsd: simulation.finalPnlUsd,
                finalRoi: simulation.finalRoi,
                createdAt: new Date()
            };
            
            // Update portfolio
            agentState.portfolio.tradeHistory.push(tradeRecord);
            agentState.portfolio.lastUpdated = new Date();
            
            // Optionally update capital (disabled by default for safety)
            if (process.env.SIM_AUTO_APPLY_PNL === 'true') {
                agentState.portfolio.capitalUsd += simulation.finalPnlUsd;
                addLog(`💰 Portfolio updated: ${agentState.portfolio.capitalUsd.toFixed(2)}`, "premium");
            }
            
            addLog(`📈 Simulation complete: ${simulation.finalPnlUsd >= 0 ? '+' : ''}${simulation.finalPnlUsd.toFixed(2)} (${(simulation.finalRoi * 100).toFixed(1)}% ROI)`, "public");
            
        } catch (simulationError) {
            console.error('Simulation error:', simulationError);
            addLog(`⚠️ Simulation failed: ${simulationError.message}`, "public");
            
            // Add empty simulation object to maintain structure
            analysis.simulation = {
                error: simulationError.message,
                meta: { disclaimer: 'SIMULATION - NO REAL TXS' }
            };
        }

        agentState.currentAnalysis = analysis;
        agentState.tradingDecisions.push(analysis);
        
        // Broadcast public summary
        broadcastPublicPremium(
            `📊 ${tokenSymbol} Analysis: ${analysis.publicSummary}`,
            `🔒 Premium Analysis: ${analysis.premiumAnalysis}`,
            { token: tokenSymbol, decision: analysis.decision, confidence: analysis.confidence }
        );
        
        agentState.status = "IDLE";
        return analysis;
        
    } catch (error) {
        console.error('Analysis generation error:', error);
        agentState.status = "FAILED";
        addLog(`❌ Analysis failed: ${error.message}`, "public");
        return null;
    }
}

// Helper functions for parsing AI responses
function extractSection(text, keywords) {
    const lines = text.split('\n');
    let inSection = false;
    let content = [];
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (keywords.some(keyword => lowerLine.includes(keyword))) {
            inSection = true;
            continue;
        }
        if (inSection && line.trim()) {
            content.push(line.trim());
        }
        if (inSection && !line.trim() && content.length > 0) {
            break;
        }
    }
    
    return content.join(' ').substring(0, 500) || 'Analysis pending...';
}

function extractDecision(text) {
    const upperText = text.toUpperCase();
    if (upperText.includes('LONG')) return 'LONG';
    if (upperText.includes('SHORT')) return 'SHORT';
    return Math.random() > 0.5 ? 'LONG' : 'SHORT'; // Fallback
}

function extractConfidence(text) {
    const match = text.match(/(\d+)%/);
    if (match) return parseInt(match[1]);
    return Math.floor(Math.random() * 40) + 60; // Fallback 60-100
}

// --- API ENDPOINTS ---

// Get portfolio data
app.get('/api/portfolio', (req, res) => {
    res.json({
        ...agentState.portfolio,
        meta: {
            disclaimer: 'SIMULATION - NO REAL TXS',
            totalTrades: agentState.portfolio.tradeHistory.length,
            timestamp: new Date().toISOString()
        }
    });
});

// Get all trades
app.get('/api/trades', (req, res) => {
    res.json({
        trades: agentState.portfolio.tradeHistory,
        meta: {
            disclaimer: 'SIMULATION - NO REAL TXS',
            count: agentState.portfolio.tradeHistory.length,
            timestamp: new Date().toISOString()
        }
    });
});

// Get specific trade by ID
app.get('/api/trades/:id', (req, res) => {
    const tradeId = parseInt(req.params.id);
    const analysis = agentState.tradingDecisions.find(a => a.id === tradeId);
    
    if (!analysis) {
        return res.status(404).json({ 
            error: 'Trade not found',
            meta: { disclaimer: 'SIMULATION - NO REAL TXS' }
        });
    }
    
    res.json({
        ...analysis,
        meta: {
            ...analysis.simulation?.meta,
            disclaimer: 'SIMULATION - NO REAL TXS',
            timestamp: new Date().toISOString()
        }
    });
});

// Get agent status
app.get('/api/status', (req, res) => {
    res.json({
        status: agentState.status,
        mission: agentState.mission,
        logsCount: agentState.logs.length,
        startTime: agentState.startTime,
        endTime: agentState.endTime,
        lastUpdate: Date.now(),
        emotion: agentState.emotion,
        lastToken: agentState.lastToken
    });
});

// Get logs (with payment verification for premium content)
app.get('/api/logs', (req, res) => {
    const { signature } = req.query;
    
    let logs = agentState.logs.map(log => ({
        ...log,
        text: log.isPremium && !signature ? '[PREMIUM CONTENT - PAYMENT REQUIRED]' : log.text
    }));
    
    res.json(logs);
});

// Request trading analysis
app.post('/api/analyze', async (req, res) => {
    try {
        const { tokenSymbol, currentPrice } = req.body;
        
        if (!tokenSymbol) {
            return res.status(400).json({ error: 'Token symbol is required' });
        }
        
        const analysis = await generateTradingAnalysis(tokenSymbol, currentPrice);
        
        if (!analysis) {
            return res.status(500).json({ error: 'Analysis generation failed' });
        }
        
        res.json({
            success: true,
            analysis: {
                ...analysis,
                premiumAnalysis: '[PREMIUM CONTENT - PAYMENT REQUIRED]', // Hide premium content
                simulationSummary: analysis.simulation ? {
                    finalPnlUsd: analysis.simulation.finalPnlUsd,
                    finalRoi: analysis.simulation.finalRoi,
                    positionUsd: analysis.simulation.positionUsd,
                    priceSource: analysis.simulation.meta?.priceSource,
                    disclaimer: 'SIMULATION - NO REAL TXS'
                } : null
            },
            meta: {
                disclaimer: 'SIMULATION - NO REAL TXS',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Analysis request error:', error);
        res.status(500).json({ error: 'Analysis request failed' });
    }
});

// Unlock premium content
app.post('/api/unlock', async (req, res) => {
    try {
        const { signature, analysisId } = req.body;
        
        if (!signature) {
            return res.status(400).json({ error: 'Payment signature is required' });
        }
        
        // Verify payment
        const paymentResult = await verifyPayment(signature, PEEK_PRICE);
        
        if (!paymentResult.valid) {
            return res.status(402).json({ error: paymentResult.error });
        }
        
        // Find and unlock analysis
        const analysis = agentState.tradingDecisions.find(a => a.id == analysisId);
        
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        analysis.isUnlocked = true;
        
        res.json({
            success: true,
            analysis: analysis,
            message: 'Premium content unlocked'
        });
        
    } catch (error) {
        console.error('Unlock request error:', error);
        res.status(500).json({ error: 'Unlock request failed' });
    }
});

// God Mode injection (high-price premium feature)
app.post('/api/god-mode', async (req, res) => {
    try {
        const { prompt, signature } = req.body;
        
        if (!signature) {
            return res.status(400).json({ error: 'Payment signature is required' });
        }
        
        // Verify high-value payment
        const paymentResult = await verifyPayment(signature, GOD_MODE_PRICE);
        
        if (!paymentResult.valid) {
            return res.status(402).json({ error: paymentResult.error });
        }
        
        // Process God Mode injection
        broadcastPublicPremium(
            "[ALERT] ⚠️ GOD MODE INTERVENTION DETECTED ⚠️",
            `[INJECTION] User prompt: "${prompt}"`,
            { stage: "GOD_MODE" }
        );
        
        agentState.emotion = "OBEDIENT";
        
        res.json({
            success: true,
            message: 'God Mode injection processed'
        });
        
    } catch (error) {
        console.error('God Mode error:', error);
        res.status(500).json({ error: 'God Mode injection failed' });
    }
});

// Get current analysis
app.get('/api/current-analysis', (req, res) => {
    if (!agentState.currentAnalysis) {
        return res.status(404).json({ error: 'No current analysis available' });
    }
    
    res.json({
        ...agentState.currentAnalysis,
        premiumAnalysis: '[PREMIUM CONTENT - PAYMENT REQUIRED]'
    });
});

// Health check
app.get('/health', (req, res) => {
    try {
        res.json({ 
            status: 'healthy', 
            agent: 'degen-agent',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Health check failed', details: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Degen Agent running on http://localhost:${PORT}`);
    console.log(`🔑 Agent Wallet: ${agentKeypair.publicKey.toBase58()}`);
    console.log(`💰 Payment Address: ${SERVER_WALLET}`);
    console.log(`💵 Peek Price: ${PEEK_PRICE} SOL`);
    console.log(`🔥 God Mode Price: ${GOD_MODE_PRICE} SOL`);
    
    // Initial startup message
    addLog("🤖 RektOrRich Agent Online. Ready to analyze and predict!", "public");
    addLog("💎 Diamond hands activated. LFG!", "public");
    
    console.log('🔄 Agent running in standalone mode (no frontend integration)');
});

// Make functions available globally for integration
global.generateTradingAnalysis = generateTradingAnalysis;
global.agentState = agentState;
global.verifyPayment = verifyPayment;

export { agentState, verifyPayment, generateTradingAnalysis, agentKeypair, connection };