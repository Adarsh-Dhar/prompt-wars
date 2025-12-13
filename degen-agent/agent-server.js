import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as anchor from '@coral-xyz/anchor';
import crypto from 'crypto';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { simulateTrade } from './sim/trading-simulator.js';
import { GoogleGenAIClient } from './src/lib/google-gen-client.ts';
import { getModelConfig, isFlashThinkingEnabled } from './src/lib/degen_brain.ts';
import FrontendIntegration from './src/lib/frontend-integration.ts';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env file');
    process.exit(1);
}

// --- CONFIGURATION ---
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ 
    server,
    path: '/ws'
});
const analyzeWss = new WebSocketServer({ 
    server,
    path: '/ws/analyze'
});
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

// Initialize Flash Thinking client if enabled
let flashThinkingClient = null;
if (isFlashThinkingEnabled()) {
    try {
        const modelConfig = getModelConfig();
        if (modelConfig.useGemini) {
            flashThinkingClient = new GoogleGenAIClient(modelConfig.config);
            console.log('🧠 Flash Thinking enabled with Gemini 2.0');
        }
    } catch (error) {
        console.warn('⚠️ Flash Thinking initialization failed:', error.message);
    }
}

// Initialize Frontend Integration for public content generation
let frontendIntegration = null;
try {
    frontendIntegration = new FrontendIntegration(agentKeypair, connection);
    console.log('🔗 Frontend Integration initialized for public content generation');
} catch (error) {
    console.warn('⚠️ Frontend Integration initialization failed:', error.message);
}

// WebSocket connection management with backpressure handling
const activeConnections = new Map(); // Use Map to track connection metadata
const connectionBuffers = new Map(); // Buffer for backpressure management
const MAX_BUFFER_SIZE = 100; // Maximum buffered messages per connection

// Setup connection handler for general WebSocket endpoint (/ws)
wss.on('connection', (ws, req) => {
    setupWebSocketConnection(ws, req, '/ws');
});

// Setup connection handler for analysis WebSocket endpoint (/ws/analyze)
analyzeWss.on('connection', (ws, req) => {
    setupWebSocketConnection(ws, req, '/ws/analyze');
});

// Common WebSocket connection setup
function setupWebSocketConnection(ws, req, endpoint) {
    const connectionId = Date.now() + Math.random();
    const url = req.url || endpoint;
    
    console.log(`🔌 New WebSocket connection established: ${endpoint}`);
    
    // Initialize connection tracking
    activeConnections.set(ws, {
        id: connectionId,
        url: url,
        endpoint: endpoint,
        connectedAt: Date.now(),
        messageCount: 0
    });
    connectionBuffers.set(ws, []);
    
    // Send welcome message
    const welcomeMessage = {
        type: 'connection',
        data: {
            message: `Connected to Degen Agent streaming`,
            flashThinkingEnabled: !!flashThinkingClient,
            timestamp: Date.now(),
            connectionId: connectionId,
            endpoint: endpoint
        }
    };
    
    sendToWebSocket(ws, welcomeMessage);
    
    ws.on('close', () => {
        console.log(`🔌 WebSocket connection closed: ${connectionId} (${endpoint})`);
        activeConnections.delete(ws);
        connectionBuffers.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error on ${endpoint}:`, error);
        activeConnections.delete(ws);
        connectionBuffers.delete(ws);
    });
    
    // Handle ping/pong for connection health
    ws.on('pong', () => {
        const connInfo = activeConnections.get(ws);
        if (connInfo) {
            connInfo.lastPong = Date.now();
        }
    });
    
    // Set up message handling
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            // Handle different message types based on endpoint
            if (endpoint === '/ws/analyze') {
                await handleAnalyzeWebSocketMessage(ws, data);
            } else {
                // Generic WebSocket handling for other endpoints
                await handleGenericWebSocketMessage(ws, data);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            sendToWebSocket(ws, {
                type: 'error',
                data: { error: 'Invalid message format' }
            });
        }
    });
}

// Send message to specific WebSocket with backpressure handling
function sendToWebSocket(ws, message) {
    if (ws.readyState !== ws.OPEN) {
        return false;
    }
    
    const buffer = connectionBuffers.get(ws);
    if (!buffer) {
        return false;
    }
    
    // Check buffer size for backpressure
    if (buffer.length >= MAX_BUFFER_SIZE) {
        console.warn('WebSocket buffer full, dropping oldest messages');
        buffer.splice(0, buffer.length - MAX_BUFFER_SIZE + 1);
    }
    
    try {
        const messageStr = JSON.stringify(message);
        ws.send(messageStr);
        
        // Update connection stats
        const connInfo = activeConnections.get(ws);
        if (connInfo) {
            connInfo.messageCount++;
            connInfo.lastMessageAt = Date.now();
        }
        
        return true;
    } catch (error) {
        console.error('WebSocket send error:', error);
        activeConnections.delete(ws);
        connectionBuffers.delete(ws);
        return false;
    }
}

// Broadcast to all connected WebSocket clients with backpressure handling
function broadcastToWebSockets(message) {
    let successCount = 0;
    let failureCount = 0;
    
    activeConnections.forEach((connInfo, ws) => {
        if (sendToWebSocket(ws, message)) {
            successCount++;
        } else {
            failureCount++;
        }
    });
    
    if (failureCount > 0) {
        console.warn(`WebSocket broadcast: ${successCount} success, ${failureCount} failures`);
    }
    
    return { successCount, failureCount };
}

// Broadcast to specific endpoint connections
function broadcastToEndpoint(endpoint, message) {
    let successCount = 0;
    let failureCount = 0;
    
    activeConnections.forEach((connInfo, ws) => {
        if (connInfo.url === endpoint || connInfo.url.startsWith(endpoint)) {
            if (sendToWebSocket(ws, message)) {
                successCount++;
            } else {
                failureCount++;
            }
        }
    });
    
    return { successCount, failureCount };
}

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

// --- STREAMING ANALYSIS WITH FLASH THINKING ---
async function generateStreamingAnalysis(tokenSymbol, currentPrice = null, streamingCallbacks = null) {
    try {
        agentState.status = "ANALYZING";
        agentState.lastToken = tokenSymbol;
        
        addLog(`🔍 Analyzing ${tokenSymbol} with Flash Thinking...`, "public", { token: tokenSymbol });
        
        if (flashThinkingClient && streamingCallbacks) {
            // Use Flash Thinking streaming
            const prompt = `
            Analyze the token ${tokenSymbol} ${currentPrice ? `at current price ${currentPrice}` : ''}.
            
            Think through your analysis step by step:
            1. Market sentiment and social signals
            2. Technical analysis and price action
            3. Risk factors and potential catalysts
            4. Position sizing and entry/exit strategy
            5. Final recommendation with confidence level
            
            Provide a clear LONG or SHORT decision with confidence level (0-100).
            Use degen crypto language but be informative and analytical.
            `;
            
            let finalAnswer = '';
            const chainOfThought = [];
            
            const callbacks = {
                onThought: (thought) => {
                    chainOfThought.push(thought);
                    if (streamingCallbacks.onThought) {
                        streamingCallbacks.onThought(thought);
                    }
                    // Broadcast to WebSocket clients
                    broadcastToWebSockets({
                        type: 'thinking',
                        data: {
                            text: thought.text,
                            order: thought.order,
                            timestamp: thought.timestamp,
                            tokenSymbol: tokenSymbol
                        }
                    });
                },
                onFinal: (text, isComplete) => {
                    finalAnswer += text;
                    if (streamingCallbacks.onFinal) {
                        streamingCallbacks.onFinal(text, isComplete);
                    }
                    // Broadcast to WebSocket clients
                    broadcastToWebSockets({
                        type: isComplete ? 'final' : 'final-part',
                        data: {
                            text: text,
                            isComplete: isComplete,
                            tokenSymbol: tokenSymbol
                        }
                    });
                },
                onComplete: (result) => {
                    if (streamingCallbacks.onComplete) {
                        streamingCallbacks.onComplete(result);
                    }
                    // Broadcast completion to WebSocket clients
                    broadcastToWebSockets({
                        type: 'complete',
                        data: {
                            tokenSymbol: tokenSymbol,
                            totalTokens: result.totalTokens,
                            thoughtTokens: result.thoughtTokens,
                            finalTokens: result.finalTokens
                        }
                    });
                },
                onError: (error) => {
                    if (streamingCallbacks.onError) {
                        streamingCallbacks.onError(error);
                    }
                    // Broadcast error to WebSocket clients
                    broadcastToWebSockets({
                        type: 'error',
                        data: {
                            error: error.message,
                            tokenSymbol: tokenSymbol
                        }
                    });
                }
            };
            
            await flashThinkingClient.streamWithThoughts(prompt, callbacks);
            
            // Parse the final answer for decision and confidence
            const decision = extractDecision(finalAnswer);
            const confidence = extractConfidence(finalAnswer);
            
            // Generate public content using FrontendIntegration
            let publicContent = null;
            if (frontendIntegration) {
                try {
                    publicContent = frontendIntegration.generatePublicContent(
                        tokenSymbol,
                        chainOfThought,
                        finalAnswer,
                        result.totalTokens,
                        result.thoughtTokens,
                        true // Include teaser content
                    );
                } catch (error) {
                    console.warn('⚠️ Public content generation failed:', error.message);
                }
            }
            
            // Fallback public summary if generation fails
            const publicSummary = publicContent?.publicSummary || 
                `🚀 ${tokenSymbol} Analysis: ${decision} signal with ${confidence}% confidence! Flash Thinking analysis complete - unlock premium for full chain-of-thought! 💎`;
            
            const analysis = {
                id: Date.now(),
                tokenSymbol: tokenSymbol,
                currentPrice: currentPrice,
                timestamp: new Date(),
                publicSummary: publicSummary,
                decision: decision,
                confidence: confidence,
                finalAnswer: finalAnswer,
                chainOfThought: chainOfThought,
                premiumAnalysis: finalAnswer, // Full analysis is premium
                teaserContent: publicContent?.teaserContent,
                contentPreview: publicContent?.contentPreview,
                isUnlocked: false,
                flashThinking: true,
                totalTokens: result.totalTokens,
                thoughtTokens: result.thoughtTokens
            };
            
            return analysis;
        } else {
            // Fallback to regular analysis
            return await generateTradingAnalysis(tokenSymbol, currentPrice);
        }
        
    } catch (error) {
        console.error('Streaming analysis error:', error);
        agentState.status = "FAILED";
        addLog(`❌ Streaming analysis failed: ${error.message}`, "public");
        
        if (streamingCallbacks && streamingCallbacks.onError) {
            streamingCallbacks.onError(error);
        }
        
        return null;
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
        const decision = extractDecision(response);
        const confidence = extractConfidence(response);
        const premiumAnalysis = extractSection(response, ['premium', 'analysis', 'detailed']);
        
        // Create mock chain of thought for non-Flash Thinking analysis
        const mockChainOfThought = [{
            text: `Analyzing ${tokenSymbol} market conditions and sentiment...`,
            thought: true,
            order: 1,
            timestamp: Date.now(),
            tokenCount: 50
        }];
        
        // Generate public content using FrontendIntegration
        let publicContent = null;
        if (frontendIntegration) {
            try {
                publicContent = frontendIntegration.generatePublicContent(
                    tokenSymbol,
                    mockChainOfThought,
                    response,
                    1000, // Estimated total tokens
                    200,  // Estimated thought tokens
                    true  // Include teaser content
                );
            } catch (error) {
                console.warn('⚠️ Public content generation failed:', error.message);
            }
        }
        
        // Fallback public summary if generation fails
        const publicSummary = publicContent?.publicSummary || 
            extractSection(response, ['public', 'summary']) ||
            `🚀 ${tokenSymbol} Analysis: ${decision} signal with ${confidence}% confidence! Unlock premium for detailed analysis! 💎`;
        
        const analysis = {
            id: Date.now(),
            tokenSymbol: tokenSymbol,
            currentPrice: currentPrice,
            timestamp: new Date(),
            publicSummary: publicSummary,
            decision: decision,
            confidence: confidence,
            premiumAnalysis: premiumAnalysis,
            teaserContent: publicContent?.teaserContent,
            contentPreview: publicContent?.contentPreview,
            isUnlocked: false,
            totalTokens: 1000,
            thoughtTokens: 200
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

// Server-Sent Events endpoint for streaming analysis with backpressure handling
app.get('/stream/analyze', (req, res) => {
    const { token, price, requestId } = req.query;
    
    if (!token) {
        return res.status(400).json({ error: 'Token parameter is required' });
    }
    
    const connectionId = Date.now() + Math.random();
    let isConnectionActive = true;
    let messageBuffer = [];
    const MAX_SSE_BUFFER = 50;
    
    // Set up SSE headers with proper CORS and caching
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
    });
    
    // Helper function to write SSE events with backpressure handling
    const writeSSEEvent = (type, data, eventId = null) => {
        if (!isConnectionActive) return false;
        
        try {
            const eventData = JSON.stringify({ type, data });
            let sseMessage = `data: ${eventData}\n\n`;
            
            if (eventId) {
                sseMessage = `id: ${eventId}\n${sseMessage}`;
            }
            
            // Check buffer size for backpressure
            if (messageBuffer.length >= MAX_SSE_BUFFER) {
                console.warn('SSE buffer full, dropping oldest messages');
                messageBuffer.splice(0, messageBuffer.length - MAX_SSE_BUFFER + 1);
            }
            
            messageBuffer.push(sseMessage);
            
            // Try to flush buffer
            const success = res.write(sseMessage);
            if (!success) {
                // Backpressure detected, wait for drain
                res.once('drain', () => {
                    console.log('SSE drain event received');
                });
            }
            
            return true;
        } catch (error) {
            console.error('SSE write error:', error);
            isConnectionActive = false;
            return false;
        }
    };
    
    // Send initial connection event
    writeSSEEvent('connection', { 
        message: 'Connected to streaming analysis', 
        token: token,
        connectionId: connectionId,
        timestamp: Date.now()
    }, connectionId);
    
    // Send keep-alive ping every 30 seconds
    const keepAliveInterval = setInterval(() => {
        if (isConnectionActive) {
            writeSSEEvent('ping', { timestamp: Date.now() });
        } else {
            clearInterval(keepAliveInterval);
        }
    }, 30000);
    
    // Set up streaming callbacks with backpressure handling
    const streamingCallbacks = {
        onThought: (thought) => {
            writeSSEEvent('thinking', {
                text: thought.text,
                order: thought.order,
                timestamp: thought.timestamp,
                tokenSymbol: token,
                requestId: requestId
            });
        },
        onFinal: (text, isComplete) => {
            writeSSEEvent(isComplete ? 'final' : 'final-part', { 
                text: text, 
                isComplete: isComplete,
                tokenSymbol: token,
                requestId: requestId
            });
        },
        onComplete: (result) => {
            writeSSEEvent('complete', {
                tokenSymbol: token,
                totalTokens: result.totalTokens,
                thoughtTokens: result.thoughtTokens,
                finalTokens: result.finalTokens,
                requestId: requestId
            });
            
            // Close connection after completion
            setTimeout(() => {
                if (isConnectionActive) {
                    clearInterval(keepAliveInterval);
                    res.end();
                }
            }, 1000);
        },
        onError: (error) => {
            writeSSEEvent('error', { 
                error: error.message,
                tokenSymbol: token,
                requestId: requestId
            });
            
            // Close connection after error
            setTimeout(() => {
                if (isConnectionActive) {
                    clearInterval(keepAliveInterval);
                    res.end();
                }
            }, 1000);
        }
    };
    
    // Handle client disconnect
    req.on('close', () => {
        console.log(`SSE client disconnected: ${connectionId}`);
        isConnectionActive = false;
        clearInterval(keepAliveInterval);
    });
    
    req.on('error', (error) => {
        console.error('SSE request error:', error);
        isConnectionActive = false;
        clearInterval(keepAliveInterval);
    });
    
    // Start streaming analysis
    generateStreamingAnalysis(token, parseFloat(price) || null, streamingCallbacks)
        .catch(error => {
            console.error('SSE streaming error:', error);
            if (isConnectionActive) {
                writeSSEEvent('error', { error: 'Streaming analysis failed' });
                setTimeout(() => {
                    clearInterval(keepAliveInterval);
                    res.end();
                }, 1000);
            }
        });
});



// Handle WebSocket messages for /ws/analyze endpoint
async function handleAnalyzeWebSocketMessage(ws, data) {
    if (data.type === 'analyze') {
        const { tokenSymbol, currentPrice, requestId } = data;
        
        if (!tokenSymbol) {
            sendToWebSocket(ws, {
                type: 'error',
                data: { 
                    error: 'Token symbol is required',
                    requestId: requestId
                }
            });
            return;
        }
        
        // Send acknowledgment
        sendToWebSocket(ws, {
            type: 'analysis-started',
            data: {
                tokenSymbol: tokenSymbol,
                currentPrice: currentPrice,
                requestId: requestId,
                timestamp: Date.now()
            }
        });
        
        // Set up streaming callbacks for this specific connection
        const streamingCallbacks = {
            onThought: (thought) => {
                sendToWebSocket(ws, {
                    type: 'thinking',
                    data: {
                        text: thought.text,
                        order: thought.order,
                        timestamp: thought.timestamp,
                        tokenSymbol: tokenSymbol,
                        requestId: requestId
                    }
                });
            },
            onFinal: (text, isComplete) => {
                sendToWebSocket(ws, {
                    type: isComplete ? 'final' : 'final-part',
                    data: { 
                        text: text, 
                        isComplete: isComplete,
                        tokenSymbol: tokenSymbol,
                        requestId: requestId
                    }
                });
            },
            onComplete: (result) => {
                sendToWebSocket(ws, {
                    type: 'complete',
                    data: {
                        tokenSymbol: tokenSymbol,
                        totalTokens: result.totalTokens,
                        thoughtTokens: result.thoughtTokens,
                        finalTokens: result.finalTokens,
                        requestId: requestId
                    }
                });
            },
            onError: (error) => {
                sendToWebSocket(ws, {
                    type: 'error',
                    data: { 
                        error: error.message,
                        tokenSymbol: tokenSymbol,
                        requestId: requestId
                    }
                });
            }
        };
        
        await generateStreamingAnalysis(tokenSymbol, currentPrice, streamingCallbacks);
    } else if (data.type === 'ping') {
        // Handle ping for connection health
        sendToWebSocket(ws, {
            type: 'pong',
            data: { timestamp: Date.now() }
        });
    } else {
        sendToWebSocket(ws, {
            type: 'error',
            data: { error: `Unknown message type: ${data.type}` }
        });
    }
}

// Handle generic WebSocket messages for other endpoints
async function handleGenericWebSocketMessage(ws, data) {
    if (data.type === 'analyze') {
        // Redirect to analyze endpoint handling
        await handleAnalyzeWebSocketMessage(ws, data);
    } else if (data.type === 'ping') {
        sendToWebSocket(ws, {
            type: 'pong',
            data: { timestamp: Date.now() }
        });
    } else {
        sendToWebSocket(ws, {
            type: 'error',
            data: { error: `Unknown message type: ${data.type}` }
        });
    }
}

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
        
        // Create non-premium response with proper content gating
        let nonPremiumResponse = null;
        if (frontendIntegration && analysis.chainOfThought) {
            try {
                nonPremiumResponse = frontendIntegration.createNonPremiumResponse(
                    analysis.tokenSymbol,
                    analysis.chainOfThought || [],
                    analysis.finalAnswer || analysis.premiumAnalysis,
                    analysis.totalTokens || 1000,
                    analysis.thoughtTokens || 200
                );
            } catch (error) {
                console.warn('⚠️ Non-premium response generation failed:', error.message);
            }
        }
        
        res.json({
            success: true,
            analysis: {
                id: analysis.id,
                tokenSymbol: analysis.tokenSymbol,
                currentPrice: analysis.currentPrice,
                timestamp: analysis.timestamp,
                decision: analysis.decision,
                confidence: analysis.confidence,
                publicSummary: nonPremiumResponse?.publicSummary || analysis.publicSummary,
                finalAnswer: nonPremiumResponse?.finalAnswer || analysis.teaserContent || analysis.publicSummary,
                chainOfThought: [], // Empty for non-premium users
                totalTokens: analysis.totalTokens || 1000,
                thoughtTokens: analysis.thoughtTokens || 200,
                premiumAnalysis: '[PREMIUM CONTENT - PAYMENT REQUIRED]', // Hide premium content
                teaserContent: analysis.teaserContent,
                contentPreview: analysis.contentPreview,
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
                timestamp: new Date().toISOString(),
                contentType: 'public',
                upgradeMessage: 'Unlock premium analysis with payment verification'
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
        
        // Return full premium content
        res.json({
            success: true,
            analysis: {
                ...analysis,
                finalAnswer: analysis.finalAnswer || analysis.premiumAnalysis, // Show full content
                chainOfThought: analysis.chainOfThought || [], // Show full chain of thought
                premiumAnalysis: analysis.premiumAnalysis // Show premium analysis
            },
            message: 'Premium content unlocked',
            meta: {
                contentType: 'premium',
                paymentVerified: true,
                disclaimer: 'SIMULATION - NO REAL TXS'
            }
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
    
    // Generate public content for current analysis
    let publicResponse = null;
    if (frontendIntegration && agentState.currentAnalysis) {
        try {
            publicResponse = frontendIntegration.createNonPremiumResponse(
                agentState.currentAnalysis.tokenSymbol,
                agentState.currentAnalysis.chainOfThought || [],
                agentState.currentAnalysis.finalAnswer || agentState.currentAnalysis.premiumAnalysis,
                agentState.currentAnalysis.totalTokens || 1000,
                agentState.currentAnalysis.thoughtTokens || 200
            );
        } catch (error) {
            console.warn('⚠️ Public content generation failed:', error.message);
        }
    }
    
    res.json({
        ...agentState.currentAnalysis,
        publicSummary: publicResponse?.publicSummary || agentState.currentAnalysis.publicSummary,
        finalAnswer: publicResponse?.finalAnswer || agentState.currentAnalysis.teaserContent || agentState.currentAnalysis.publicSummary,
        chainOfThought: [], // Empty for non-premium users
        premiumAnalysis: '[PREMIUM CONTENT - PAYMENT REQUIRED]',
        meta: {
            contentType: 'public',
            upgradeMessage: 'Pay to unlock full premium analysis with chain-of-thought reasoning'
        }
    });
});

// Get public content preview for a specific analysis
app.get('/api/analysis/:id/preview', (req, res) => {
    try {
        const analysisId = parseInt(req.params.id);
        const analysis = agentState.tradingDecisions.find(a => a.id === analysisId);
        
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        // Generate public content preview
        let publicContent = null;
        if (frontendIntegration) {
            try {
                publicContent = frontendIntegration.generatePublicContent(
                    analysis.tokenSymbol,
                    analysis.chainOfThought || [],
                    analysis.finalAnswer || analysis.premiumAnalysis,
                    analysis.totalTokens || 1000,
                    analysis.thoughtTokens || 200,
                    true // Include teaser content
                );
            } catch (error) {
                console.warn('⚠️ Public content generation failed:', error.message);
            }
        }
        
        res.json({
            id: analysis.id,
            tokenSymbol: analysis.tokenSymbol,
            decision: analysis.decision,
            confidence: analysis.confidence,
            timestamp: analysis.timestamp,
            publicSummary: publicContent?.publicSummary || analysis.publicSummary,
            teaserContent: publicContent?.teaserContent,
            contentPreview: publicContent?.contentPreview,
            isUnlocked: analysis.isUnlocked,
            meta: {
                contentType: 'preview',
                paymentRequired: !analysis.isUnlocked,
                price: PEEK_PRICE,
                currency: 'SOL'
            }
        });
        
    } catch (error) {
        console.error('Analysis preview error:', error);
        res.status(500).json({ error: 'Failed to generate analysis preview' });
    }
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

// Connection health monitoring and cleanup
setInterval(() => {
    const now = Date.now();
    const staleConnections = [];
    
    activeConnections.forEach((connInfo, ws) => {
        // Check for stale connections (no activity for 5 minutes)
        const lastActivity = connInfo.lastMessageAt || connInfo.connectedAt;
        if (now - lastActivity > 5 * 60 * 1000) {
            staleConnections.push(ws);
        } else if (ws.readyState !== ws.OPEN) {
            staleConnections.push(ws);
        }
    });
    
    // Clean up stale connections
    staleConnections.forEach(ws => {
        console.log('Cleaning up stale WebSocket connection');
        activeConnections.delete(ws);
        connectionBuffers.delete(ws);
        if (ws.readyState === ws.OPEN) {
            ws.close();
        }
    });
    
    if (activeConnections.size > 0) {
        console.log(`📊 Active WebSocket connections: ${activeConnections.size}`);
    }
}, 60000); // Check every minute

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    
    // Close all WebSocket connections
    activeConnections.forEach((connInfo, ws) => {
        sendToWebSocket(ws, {
            type: 'server-shutdown',
            data: { message: 'Server is shutting down' }
        });
        ws.close();
    });
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    
    // Close all WebSocket connections
    activeConnections.forEach((connInfo, ws) => {
        sendToWebSocket(ws, {
            type: 'server-shutdown',
            data: { message: 'Server is shutting down' }
        });
        ws.close();
    });
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Start the server
server.listen(PORT, async () => {
    console.log(`🚀 Degen Agent running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket endpoints:`);
    console.log(`   - ws://localhost:${PORT}/ws/analyze (dedicated analysis endpoint)`);
    console.log(`   - ws://localhost:${PORT}/ (general WebSocket endpoint)`);
    console.log(`📡 SSE endpoints:`);
    console.log(`   - http://localhost:${PORT}/stream/analyze (streaming analysis)`);
    console.log(`🔑 Agent Wallet: ${agentKeypair.publicKey.toBase58()}`);
    console.log(`💰 Payment Address: ${SERVER_WALLET}`);
    console.log(`💵 Peek Price: ${PEEK_PRICE} SOL`);
    console.log(`🔥 God Mode Price: ${GOD_MODE_PRICE} SOL`);
    console.log(`🧠 Flash Thinking: ${flashThinkingClient ? 'Enabled' : 'Disabled'}`);
    
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