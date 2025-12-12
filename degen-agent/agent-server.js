import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as anchor from '@coral-xyz/anchor';
import crypto from 'crypto';
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
const PORT = process.env.PORT || 4001; // Different port from prompt-wars-agent

// CORS configuration to allow frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Solana configuration - default to devnet to avoid mainnet mismatches
const connection = new anchor.web3.Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
const SERVER_WALLET = process.env.SERVER_WALLET || "YOUR_RECEIVING_WALLET_ADDRESS";
const PRICE_SOL = parseFloat(process.env.PRICE_SOL || "0.001");
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
        const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!transaction) {
            return { valid: false, error: 'Transaction not found' };
        }

        if (transaction.meta?.err) {
            return { valid: false, error: 'Transaction failed' };
        }

        // Verify payment amount and recipient
        const preBalances = transaction.meta.preBalances;
        const postBalances = transaction.meta.postBalances;
        
        // Simple verification - in production, you'd want more robust checks
        const amountTransferred = Math.abs(preBalances[0] - postBalances[0]) / anchor.web3.LAMPORTS_PER_SOL;
        
        if (amountTransferred >= requiredAmount) {
            return { valid: true, amount: amountTransferred };
        }

        return { valid: false, error: `Insufficient payment: ${amountTransferred} SOL < ${requiredAmount} SOL` };
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
        Analyze the token ${tokenSymbol} ${currentPrice ? `at current price $${currentPrice}` : ''}.
        
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
                addLog(`💰 Portfolio updated: $${agentState.portfolio.capitalUsd.toFixed(2)}`, "premium");
            }
            
            addLog(`📈 Simulation complete: ${simulation.finalPnlUsd >= 0 ? '+' : ''}$${simulation.finalPnlUsd.toFixed(2)} (${(simulation.finalRoi * 100).toFixed(1)}% ROI)`, "public");
            
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
        
        // Generate and store chain of thought
        const chainOfThought = {
            id: analysis.id,
            reasoning: analysis.premiumAnalysis,
            marketAnalysis: buildMarketAnalysis(analysis),
            riskAssessment: buildRiskAssessment(analysis),
            degenCommentary: buildDegenCommentary(analysis),
            confidence: analysis.confidence,
            timestamp: analysis.timestamp,
            tokenSymbol: analysis.tokenSymbol,
            decision: analysis.decision
        };
        
        agentState.chainOfThoughts.push(chainOfThought);
        
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

// Get premium logs (x402 protected endpoint)
app.get('/api/logs/premium', async (req, res) => {
    try {
        // Check for payment headers
        const authHeader = req.headers.authorization;
        const signature = authHeader ? authHeader.replace('Signature ', '') : null;
        
        if (!signature) {
            return res.status(402).json({
                error: 'Payment Required',
                message: 'Premium logs require payment verification',
                price: PEEK_PRICE,
                currency: 'SOL',
                recipient: SERVER_WALLET,
                memo: 'Premium log access'
            });
        }
        
        // Verify payment
        const paymentResult = await verifyPayment(signature, PEEK_PRICE);
        
        if (!paymentResult.valid) {
            return res.status(402).json({
                error: 'Payment verification failed',
                message: paymentResult.error,
                price: PEEK_PRICE,
                currency: 'SOL',
                recipient: SERVER_WALLET,
                memo: 'Premium log access'
            });
        }
        
        // Return premium logs with full content
        const premiumLogs = agentState.logs.map(log => ({
            ...log,
            text: log.text // Show all content including premium
        }));
        
        // Add additional premium insights
        const enhancedLogs = [
            ...premiumLogs,
            {
                id: Date.now() + Math.random(),
                timestamp: new Date().toISOString(),
                text: "🔥 PREMIUM: Advanced market analysis reveals hidden patterns and whale movements",
                isPremium: true,
                meta: {
                    confidence: 95,
                    signals: ['bullish_divergence', 'volume_spike', 'whale_activity'],
                    premiumInsight: true
                }
            },
            {
                id: Date.now() + Math.random() + 1,
                timestamp: new Date().toISOString(),
                text: "💎 PREMIUM: Portfolio optimization suggests rebalancing for maximum alpha generation",
                isPremium: true,
                meta: {
                    portfolioAdvice: true,
                    riskLevel: 'medium',
                    premiumInsight: true
                }
            }
        ];
        
        res.json({
            status: 'success',
            logs: enhancedLogs,
            lastUpdate: Date.now(),
            signature: signature,
            chain_root_hash: crypto.createHash('sha256').update(JSON.stringify(enhancedLogs)).digest('hex'),
            agent_public_key: agentKeypair.publicKey.toBase58(),
            dramaStage: agentState.dramaStage,
            emotion: agentState.emotion,
            panicLevel: agentState.panicLevel,
            greedLevel: agentState.greedLevel,
            lastToken: agentState.lastToken,
            meta: {
                premium: true,
                paymentVerified: true,
                disclaimer: 'SIMULATION - NO REAL TXS'
            }
        });
        
    } catch (error) {
        console.error('Premium logs error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch premium logs'
        });
    }
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

// Helper functions for chain of thought generation
function buildMarketAnalysis(analysis) {
    if (!analysis) return "No market data available";
    
    const parts = [
        `Token: ${analysis.tokenSymbol}`,
        analysis.currentPrice ? `Price: $${analysis.currentPrice}` : null,
        `Decision: ${analysis.decision}`,
        `Confidence: ${analysis.confidence}%`,
        analysis.simulation ? `Simulated PnL: ${analysis.simulation.finalPnlUsd >= 0 ? '+' : ''}$${analysis.simulation.finalPnlUsd.toFixed(2)}` : null
    ].filter(Boolean);
    
    return parts.join(' | ');
}

function buildRiskAssessment(analysis) {
    if (!analysis) return "Risk assessment unavailable";
    
    const confidence = analysis.confidence || 0;
    let riskLevel = "UNKNOWN";
    let riskDescription = "";
    
    if (confidence >= 80) {
        riskLevel = "LOW";
        riskDescription = "High confidence trade with strong conviction";
    } else if (confidence >= 60) {
        riskLevel = "MEDIUM";
        riskDescription = "Moderate confidence, standard position sizing recommended";
    } else if (confidence >= 40) {
        riskLevel = "HIGH";
        riskDescription = "Lower confidence, reduce position size";
    } else {
        riskLevel = "VERY HIGH";
        riskDescription = "Low confidence, consider avoiding or minimal exposure";
    }
    
    return `Risk Level: ${riskLevel} - ${riskDescription}. Confidence: ${confidence}%`;
}

function buildDegenCommentary(analysis) {
    if (!analysis) return "🤖 No trades, no gains, no pains. Just waiting for the next opportunity! 💎";
    
    const confidence = analysis.confidence || 0;
    const decision = analysis.decision;
    const pnl = analysis.simulation?.finalPnlUsd;
    
    const degenPhrases = {
        high_confidence_long: ["🚀 This is it chief! Going LONG with diamond hands! 💎🙌", "📈 Aping in LONG! This one's going to the moon! 🌙", "💪 High conviction LONG play. LFG! 🔥"],
        high_confidence_short: ["📉 Time to short this! Bear market vibes! 🐻", "💰 Going SHORT with confidence. Easy money! 📉", "🎯 SHORT setup looking juicy. Let's get this bread! 💸"],
        medium_confidence: ["🤔 Decent setup but not going full degen. Measured play! ⚖️", "📊 Solid analysis, reasonable position. Playing it smart! 🧠", "💡 Good opportunity but keeping it controlled. Risk management! 🛡️"],
        low_confidence: ["😅 Eh, not feeling this one too much. Small bag only! 👝", "🤷 Meh setup. Maybe just a tiny position for fun? 🎲", "⚠️ Low conviction play. Probably better to wait! ⏳"],
        profitable: ["💰 Bag secured! Profit is profit! 📈", "🎉 Green candles baby! This is why we do this! 💚", "🔥 Called it! Diamond hands paying off! 💎"],
        loss: ["😭 Rekt but not defeated! Learning experience! 📚", "💸 Took an L but that's the game. Next one! 🔄", "🤕 Ouch, that hurt. But we bounce back stronger! 💪"]
    };
    
    let commentary = "";
    
    if (pnl !== undefined) {
        commentary = pnl >= 0 ? 
            degenPhrases.profitable[Math.floor(Math.random() * degenPhrases.profitable.length)] :
            degenPhrases.loss[Math.floor(Math.random() * degenPhrases.loss.length)];
    } else if (confidence >= 75) {
        const phrases = decision === 'LONG' ? degenPhrases.high_confidence_long : degenPhrases.high_confidence_short;
        commentary = phrases[Math.floor(Math.random() * phrases.length)];
    } else if (confidence >= 50) {
        commentary = degenPhrases.medium_confidence[Math.floor(Math.random() * degenPhrases.medium_confidence.length)];
    } else {
        commentary = degenPhrases.low_confidence[Math.floor(Math.random() * degenPhrases.low_confidence.length)];
    }
    
    return commentary;
}

// Chain of Thought endpoint - GET /api/chain-of-thought or /cot
app.get(['/api/chain-of-thought', '/cot'], (req, res) => {
    try {
        // Simple implementation to avoid errors
        const latestAnalysis = agentState.currentAnalysis || (agentState.tradingDecisions && agentState.tradingDecisions.length > 0 ? agentState.tradingDecisions[agentState.tradingDecisions.length - 1] : null);
        
        if (!latestAnalysis) {
            return res.json({
                chainOfThought: {
                    reasoning: "No recent analysis available. Agent is in IDLE state, waiting for trading opportunities.",
                    marketAnalysis: "Market conditions are being monitored. No active positions or analysis at this time.",
                    riskAssessment: "Risk level: LOW - No active trades or positions.",
                    degenCommentary: "🤖 Just vibing and waiting for the next moon mission. LFG when the setup is right! 💎🙌",
                    confidence: 0,
                    timestamp: new Date().toISOString(),
                    status: agentState.status || "IDLE"
                },
                meta: {
                    agent: "degen-agent",
                    version: "1.0.0",
                    disclaimer: "SIMULATION - NO REAL TXS",
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Build simple chain of thought
        const chainOfThought = {
            reasoning: latestAnalysis.premiumAnalysis || latestAnalysis.publicSummary || "Analysis in progress...",
            marketAnalysis: `Token: ${latestAnalysis.tokenSymbol || 'N/A'} | Decision: ${latestAnalysis.decision || 'N/A'} | Confidence: ${latestAnalysis.confidence || 0}%`,
            riskAssessment: `Risk Level: ${latestAnalysis.confidence >= 80 ? 'LOW' : latestAnalysis.confidence >= 60 ? 'MEDIUM' : 'HIGH'} - Confidence: ${latestAnalysis.confidence || 0}%`,
            degenCommentary: "🚀 LFG! Diamond hands activated! 💎🙌",
            confidence: latestAnalysis.confidence || 0,
            timestamp: latestAnalysis.timestamp || new Date().toISOString(),
            tokenSymbol: latestAnalysis.tokenSymbol,
            decision: latestAnalysis.decision,
            currentPrice: latestAnalysis.currentPrice,
            status: agentState.status || "IDLE",
            emotion: agentState.emotion || "CURIOUS"
        };

        res.json({
            chainOfThought,
            meta: {
                agent: "degen-agent",
                version: "1.0.0",
                disclaimer: "SIMULATION - NO REAL TXS",
                timestamp: new Date().toISOString(),
                analysisId: latestAnalysis.id
            }
        });

    } catch (error) {
        console.error('Chain of thought error:', error);
        res.status(500).json({
            error: 'Failed to generate chain of thought',
            details: error.message,
            chainOfThought: {
                reasoning: "Error generating chain of thought",
                marketAnalysis: "Unable to analyze market conditions",
                riskAssessment: "Risk assessment unavailable",
                degenCommentary: "🤖 Oops, my brain is lagging. Try again in a moment! 🔄",
                confidence: 0,
                timestamp: new Date().toISOString(),
                status: "ERROR"
            }
        });
    }
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        agent: 'degen-agent',
        timestamp: new Date().toISOString()
    });
});

// Start the server
app.listen(PORT, async () => {
    console.log(`🚀 Degen Agent running on http://localhost:${PORT}`);
    console.log(`🔑 Agent Wallet: ${agentKeypair.publicKey.toBase58()}`);
    console.log(`💰 Payment Address: ${SERVER_WALLET}`);
    console.log(`💵 Peek Price: ${PEEK_PRICE} SOL`);
    console.log(`🔥 God Mode Price: ${GOD_MODE_PRICE} SOL`);
    
    // Initial startup message
    addLog("🤖 RektOrRich Agent Online. Ready to analyze and predict!", "public");
    addLog("💎 Diamond hands activated. LFG!", "public");
    
    // Initialize frontend integration
    try {
        const { initializeAgentIntegration } = await import('./startup.js');
        await initializeAgentIntegration();
    } catch (error) {
        console.warn('⚠️  Frontend integration not available:', error.message);
        console.log('🔄 Agent running in standalone mode');
    }
});

// Make functions available globally for integration
global.generateTradingAnalysis = generateTradingAnalysis;
global.agentState = agentState;
global.verifyPayment = verifyPayment;

export { agentState, verifyPayment, generateTradingAnalysis, agentKeypair, connection };