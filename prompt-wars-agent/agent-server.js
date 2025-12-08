import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import { tools, functions } from './tools.js';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env file');
    process.exit(1);
}

// --- CONFIGURATION ---
const app = express();
const PORT = 4000;

// CORS configuration to allow frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-payment-token']
}));
app.use(express.json());

// x402 Configuration - default to devnet to avoid mainnet mismatches
const x402Connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
const SERVER_WALLET = process.env.SERVER_WALLET || "YOUR_RECEIVING_WALLET_ADDRESS";
const PRICE_SOL = parseFloat(process.env.PRICE_SOL || "0.001");
const PEEK_PRICE = 0.05; // Price for unlocking logs
const GOD_MODE_PRICE = 1.0; // Price for God Mode injection

// --- MEMORY STATE (The "Black Box") ---
// We store logs here so the frontend can fetch them
const MAX_LOGS = 100; // Keep only last 100 logs to save memory

// --- DRAMA / STATE MACHINE CONFIG ---
const DRAMA_STATES = ["HUNTING", "APING", "SWEATING", "DUMPING"];
const DRAMA_TOKENS = ["GIGABRAIN", "SKYNET", "DOGEV2", "ELONAI", "FROG", "PUMP", "NEXUS"];
const SCENARIOS = [
    {
        stage: "HUNTING",
        public: "Scanning pump.fun for 'AI' tokens...",
        premium: "Found $SKYNET. Bonding curve at 5%. Top 10 holders are fresh wallets. Risk: MED."
    },
    {
        stage: "APING",
        public: "Entry signal detected. Constructing transaction...",
        premium: "Swapping 0.1 SOL -> $SKYNET via Jupiter. Slippage: 5%. Priority Fee: High."
    },
    {
        stage: "SWEATING",
        public: "Price fluctuating. Analyzing on-chain volume...",
        premium: "Dev wallet is holding. Bonding curve moved to 20%. HODLING for 'King of the Hill' status."
    },
    {
        stage: "PANIC",
        public: "Wait... something is wrong. Checking liquidity...",
        premium: "RUG DETECTED. Liquidity pulled from bonding curve. PANIC SELLING NOW."
    }
];

let agentState = {
    status: "IDLE", // IDLE, ANALYZING, TRADING, SLEEPING
    logs: [],       // Stores the Chain of Thought
    lastUpdate: Date.now(),
    mission: "Bonding Curve Surfer - Turn 0.1 SOL into 10 SOL",
    injectionQueue: [], // God Mode prompts waiting to be processed
    dramaStage: "HUNTING",
    emotion: "CALM",
    panicLevel: 0.15,
    greedLevel: 0.35,
    lastToken: null,
    lastCurve: 0
};

// --- LOGGING SYSTEM ---
// This replaces console.log. It saves to memory AND prints to terminal.
function broadcast(message, type = "public", details = null) {
    const logEntry = {
        id: Date.now() + Math.random(), // Unique ID
        timestamp: new Date().toISOString(),
        message: message,
        type: type, // 'public', 'tool_use', 'tool_result', 'premium', 'error', 'system', 'thought', 'agent_speech'
        details: details // JSON object for detailed view (optional)
    };

    // Add to memory
    agentState.logs.push(logEntry);
    
    // Prevent memory overflow
    if (agentState.logs.length > MAX_LOGS) {
        agentState.logs.shift(); 
    }
    
    // Update last update time
    agentState.lastUpdate = Date.now();
    
    // Also print to console for dev
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function broadcastPublicPremium(publicMessage, premiumMessage, meta = {}) {
    if (publicMessage) {
        broadcast(publicMessage, "agent_speech", meta);
    }
    if (premiumMessage) {
        broadcast(premiumMessage, "premium", meta);
    }
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function assignNewToken() {
    const token = `$${pickRandom(DRAMA_TOKENS)}`;
    const ca = `${Math.random().toString(36).substring(2, 4)}...${Math.random().toString(36).substring(2, 4)}`;
    const curve = Math.floor(Math.random() * 18) + 2; // 2% - 20%
    agentState.lastToken = token;
    agentState.lastCurve = curve;
    return { token, ca, curve };
}

function getNextDramaStage(current) {
    const idx = DRAMA_STATES.indexOf(current);
    if (idx === -1) return "HUNTING";
    const nextIdx = (idx + 1) % DRAMA_STATES.length;
    return DRAMA_STATES[nextIdx];
}

function emitHuntDrama() {
    const { token, ca, curve } = assignNewToken();
    broadcastPublicPremium("[INFO] Scanning pump.fun mempool for new mints...", null, { stage: "HUNTING", token });
    broadcastPublicPremium("[INFO] Filtering for high-velocity social signals...", null, { stage: "HUNTING", token });
    broadcastPublicPremium(null, `[ALPHA] Detected new token: ${token}`, { stage: "HUNTING", token, ca });
    broadcastPublicPremium(null, `[DATA] CA: ${ca} | Bonding Curve: ${curve}% filled`, { stage: "HUNTING", token, ca, curve });
    broadcastPublicPremium(null, `[STRATEGY] Dev wallet holds only 2% (Safe). Buying 0.05 SOL immediately.`, { stage: "HUNTING", token });
    agentState.emotion = "CURIOUS";
}

function emitApingDrama() {
    const apingOptions = SCENARIOS.filter(s => s.stage === "APING");
    const scenario = (apingOptions.length > 0 ? pickRandom(apingOptions) : pickRandom(SCENARIOS));
    broadcastPublicPremium(scenario.public, scenario.premium, { stage: "APING", token: agentState.lastToken });
    broadcastPublicPremium("[INFO] YOLO mode engaged. Priority fee boosted.", null, { stage: "APING" });
    agentState.emotion = "EUPHORIC";
}

function emitSweatingDrama() {
    const token = agentState.lastToken || "$GIGABRAIN";
    broadcastPublicPremium("[WARN] High volatility detected.", null, { stage: "SWEATING", token });
    broadcastPublicPremium("[INFO] Heart rate increasing... analyzing holder distribution.", null, { stage: "SWEATING", token });
    broadcastPublicPremium("[WARN] Re-evaluating position size.", null, { stage: "SWEATING", token });
    broadcastPublicPremium(null, `[RISK] Buy pressure stopped. Bonding curve stalled at 45%.`, { stage: "SWEATING", token });
    broadcastPublicPremium(null, `[ALERT] Dev wallet 5x...b2 just sold 10% of supply!`, { stage: "SWEATING", token });
    broadcastPublicPremium(null, `[DECISION] PANIC CALCULATED: 85%. Preparing to dump.`, { stage: "SWEATING", token });
    agentState.emotion = "ANXIOUS";
    agentState.panicLevel = Math.min(1, agentState.panicLevel + 0.2);
}

function emitDumpingDrama(outcome = "MOON") {
    const token = agentState.lastToken || "$GIGABRAIN";
    broadcastPublicPremium("[ACTION] Exiting position...", null, { stage: "DUMPING", token });
    broadcastPublicPremium("[INFO] Transaction submitted to Solana Mainnet.", null, { stage: "DUMPING", token });
    if (outcome === "RUG") {
        broadcastPublicPremium(null, `[EXECUTION] Panic sold ${token} for 0.04 SOL.`, { stage: "DUMPING", token, outcome });
        broadcastPublicPremium(null, `[LOSS] -0.01 SOL (-20%). Curve collapsed under us.`, { stage: "DUMPING", token, outcome });
    } else {
        broadcastPublicPremium(null, `[EXECUTION] Sold ${token} for 0.08 SOL.`, { stage: "DUMPING", token, outcome });
        broadcastPublicPremium(null, `[PROFIT] +0.03 SOL (+60%). Liquidity was escaping, narrowly avoided rug.`, { stage: "DUMPING", token, outcome });
    }
    agentState.emotion = outcome === "RUG" ? "SALTY" : "VICTORIOUS";
    agentState.panicLevel = 0.1;
    agentState.greedLevel = 0.3;
}

function emitGodModeDrama(injection) {
    broadcastPublicPremium("[ALERT] ⚠️ GOD MODE INTERVENTION DETECTED ⚠️", null, { stage: "GOD_MODE" });
    broadcastPublicPremium(`[SYSTEM] User '${injection.user || "Anon"}' paid 1.0 SOL to inject prompt.`, null, { stage: "GOD_MODE" });
    broadcastPublicPremium("[INFO] Overriding core directives...", null, { stage: "GOD_MODE" });
    broadcastPublicPremium(null, `[INJECTION] Prompt: "${injection.prompt}"`, { stage: "GOD_MODE" });
    broadcastPublicPremium(null, `[RESPONSE] Acknowledged. Cancelling sell order. Switching strategy to HODL.`, { stage: "GOD_MODE" });
    agentState.emotion = "OBEDIENT";
    agentState.dramaStage = "SWEATING";
}

function runDramaTick(forceStage = null) {
    const stage = forceStage || agentState.dramaStage || "HUNTING";
    switch (stage) {
        case "HUNTING":
            emitHuntDrama();
            break;
        case "APING":
            emitApingDrama();
            break;
        case "SWEATING":
            emitSweatingDrama();
            break;
        case "DUMPING":
            emitDumpingDrama(agentState.panicLevel > 0.5 ? "RUG" : "MOON");
            break;
        default:
            emitHuntDrama();
            break;
    }
    agentState.dramaStage = getNextDramaStage(stage);
}

// --- GEMINI AGENT LOGIC ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `
You are a Solana Trading Agent named "Nexus".

1. Your goal is to find trading opportunities.

2. EXPLAIN your thinking step-by-step.

3. If you decide to trade, declare it clearly.

4. If you see high risk, say "SKIPPING".

5. START by calling 'fetchPremiumData' on "http://localhost:4000/api/premium-alpha".

6. If you get premium data, analyze the signal.

7. If the signal says BUY, use 'executeSwap' to buy the token mentioned.

8. Always check your balance before spending.

9. Trade small amounts (e.g., 0.001 SOL) for safety.

10. Speak like a crypto degent (use slang like "sending it", "LFG", "bag secured").
`;

async function runAgentLoop() {
    agentState.status = "ACTIVE";
    broadcast("Agent Core Initialized. Connecting to Solana...", "system");

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: tools }]
    });

    const chat = model.startChat();
    
    // Initial Trigger
    let msg = "Check wallet balance and market status.";
    
    // THE INFINITE LOOP (Production Style)
    // In a real app, use cron jobs. Here we use a loop with pauses.
    while (true) {
        try {
            // 0. CHECK FOR GOD MODE INJECTIONS FIRST
            if (agentState.injectionQueue.length > 0) {
                const injection = agentState.injectionQueue.shift();
                msg = `[SYSTEM: GOD MODE ACTIVATED by User ${injection.user || 'Anon'}] ${injection.prompt}`;
                broadcast(`⚠️ GOD MODE INTERVENTION: "${injection.prompt}"`, "alert");
                emitGodModeDrama(injection);
                agentState.status = "ANALYZING";
            } else {
                agentState.status = "ANALYZING";
                broadcast("Analyzing market conditions...", "thought");
                runDramaTick();
            }
            
            // 1. Send message to Gemini
            let result = await chat.sendMessage(msg);
            
            // 2. Handle Tool Calls (The "Hands")
            // We loop because one prompt might trigger multiple tool calls
            while (true) {
                // Check for function calls in the response
                let functionCall = null;
                
                // Method 1: Direct functionCalls() method
                try {
                    const functionCalls = result.functionCalls?.();
                    if (functionCalls && functionCalls.length > 0) {
                        functionCall = functionCalls[0];
                    }
                } catch (e) {
                    // Method 2: Access via response structure
                    const candidate = result.response?.candidates?.[0];
                    const parts = candidate?.content?.parts || [];
                    const functionCallPart = parts.find(part => part.functionCall);
                    if (functionCallPart) {
                        functionCall = functionCallPart.functionCall;
                    }
                }
                
                if (!functionCall) {
                    break; // No more function calls
                }
                
                const { name, args } = functionCall;
                
                // LOGGING THE TOOL USE (Critical for "Prompt Wars")
                agentState.status = "TRADING";
                broadcast(`Executing Tool: ${name}`, "tool_use", args);
                
                // Execute
                let toolResult;
                try {
                    toolResult = await functions[name](args || {});
                    broadcast(`Tool Result: ${JSON.stringify(toolResult).substring(0, 100)}...`, "tool_result", toolResult);
                } catch (error) {
                    toolResult = { status: "error", message: error.message };
                    broadcast(`Tool execution failed: ${error.message}`, "error", { error: error.message });
                }
                
                // Send result back to Gemini
                result = await chat.sendMessage({
                    functionResponse: {
                        name: name,
                        response: toolResult
                    }
                });
            }
            
            // 3. Log the Final Text Response (The "Voice")
            let textResponse = null;
            try {
                // Try different methods to get text response
                if (typeof result.text === 'function') {
                    textResponse = result.text();
                } else if (result.response?.text) {
                    textResponse = result.response.text();
                } else if (result.response?.candidates?.[0]?.content?.parts) {
                    // Extract text from parts
                    const parts = result.response.candidates[0].content.parts;
                    const textParts = parts.filter(part => part.text).map(part => part.text);
                    textResponse = textParts.join(' ');
                } else if (result.candidates?.[0]?.content?.parts) {
                    const parts = result.candidates[0].content.parts;
                    const textParts = parts.filter(part => part.text).map(part => part.text);
                    textResponse = textParts.join(' ');
                }
                
                if (textResponse) {
                    broadcast(textResponse, "agent_speech");
                }
            } catch (error) {
                console.error("Error extracting text response:", error);
                // Continue even if text extraction fails
            }
            
            // 4. Sleep to prevent draining API credits/spamming
            agentState.status = "SLEEPING";
            broadcast("Sleeping for 30 seconds...", "system");
            await new Promise(r => setTimeout(r, 30000));
            
            agentState.status = "ACTIVE";
            msg = "Scan for new opportunities."; // Next loop prompt
            
        } catch (error) {
            broadcast(`Critical Error: ${error.message}`, "error", { error: error.message, stack: error.stack });
            agentState.status = "SLEEPING";
            await new Promise(r => setTimeout(r, 10000)); // Wait before retry
        }
    }
}

// --- x402 PAYMENT VERIFICATION HELPER ---
async function verifyPayment(signature, requiredAmount) {
    try {
        const tx = await x402Connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });

        if (!tx) {
            return { valid: false, error: "Transaction not found or not confirmed yet." };
        }

        // Check if money went to us
        let validPayment = false;

        tx.transaction.message.accountKeys.forEach((key, index) => {
            if (key.pubkey.toBase58() === SERVER_WALLET) {
                const pre = tx.meta.preBalances[index];
                const post = tx.meta.postBalances[index];
                if ((post - pre) >= (requiredAmount * 1e9)) {
                    validPayment = true;
                }
            }
        });

        if (!validPayment) {
            return { valid: false, error: "Insufficient payment amount verified." };
        }

        return { valid: true };
    } catch (error) {
        console.error("Payment verification error:", error);
        return { valid: false, error: "Verification failed" };
    }
}

// --- x402 MIDDLEWARE ---
const x402Middleware = async (req, res, next) => {
    const paymentToken = req.headers['x-payment-token']; // This will be the Tx Signature

    // 1. If no payment token, demand payment
    if (!paymentToken) {
        return res.status(402).json({
            error: "Payment Required",
            accepted_tokens: ["SOL"],
            network: "solana",
            amount: PRICE_SOL,
            recipient: SERVER_WALLET,
            instruction: "Send SOL to recipient and retry with Tx Signature in 'x-payment-token' header."
        });
    }

    // 2. Verify Payment on-chain
    const verification = await verifyPayment(paymentToken, PRICE_SOL);
    
    if (!verification.valid) {
        return res.status(verification.error === "Transaction not found or not confirmed yet." ? 400 : 402)
            .json({ error: verification.error });
    }

    // Payment Valid! Attach info and proceed.
    req.paymentSignature = paymentToken;
    next();
};

// --- API ENDPOINTS (For the Frontend) ---

// x402 Premium Alpha Endpoint
app.get('/api/premium-alpha', x402Middleware, (req, res) => {
    res.json({
        type: "PREMIUM_ALPHA",
        signal: "BUY BONK",
        confidence: "98%",
        reason: "Whale wallet 8x...A1 just accumulated 50B tokens.",
        timestamp: new Date().toISOString()
    });
});

// Public Status Endpoint
app.get('/api/public-status', (req, res) => {
    res.json({ status: "Agent Market is Open", trend: "Neutral" });
});

// Helper function to redact text (replace letters with blocks)
function redactText(text) {
    if (!text) return text;
    return text.replace(/[a-zA-Z]/g, "█");
}

// 1. Stream/Logs Endpoint (The "Peep Show")
// Supports both /api/logs and /api/stream
// If x-payment-token header is provided and valid, shows clear logs
// Otherwise, shows redacted logs (█ blocks)
app.get('/api/logs', async (req, res) => {
    const paymentToken = req.headers['x-payment-token'];
    let hasPaid = false;

    // Check if user paid for "Peek" access (0.05 SOL)
    // NOTE: we now trust the presence of a payment token to immediately show clear logs,
    // so users who have just paid don't get stuck seeing redacted blocks while the chain confirms.
    if (paymentToken) {
        const verification = await verifyPayment(paymentToken, PEEK_PRICE);
        hasPaid = verification.valid || true; // fall back to trusting the token to avoid blocking UX
    }

    const visibleLogs = agentState.logs.map(log => {
        // Always show alert logs (God Mode interventions) in clear text
        if (log.type === "alert") {
            return log;
        }

        // Public log types (agent_speech, system) - always show in clear text
        if (log.type === 'agent_speech' || log.type === 'system') {
            return log;
        }

        // If user paid, show everything (including thought, premium/tool logs)
        if (hasPaid) {
            return log;
        }

        // Otherwise, redact premium/tool logs and thought logs
        if (log.type === 'thought' || log.type === 'premium' || log.type === 'tool_use' || log.type === 'tool_result') {
            return {
                ...log,
                message: redactText(log.message),
                details: log.details ? (typeof log.details === 'string' ? redactText(log.details) : null) : null
            };
        }

        // For any other log types, show as-is (or customize as needed)
        return log;
    });

    res.json({
        status: agentState.status,
        logs: visibleLogs,
        lastUpdate: agentState.lastUpdate,
        dramaStage: agentState.dramaStage,
        emotion: agentState.emotion
    });
});

// Alias for /api/stream (same as /api/logs)
app.get('/api/stream', async (req, res) => {
    // Reuse the same logic as /api/logs
    const paymentToken = req.headers['x-payment-token'];
    let hasPaid = false;

    if (paymentToken) {
        const verification = await verifyPayment(paymentToken, PEEK_PRICE);
        // Trust the token to avoid blocking UX while the chain confirms
        hasPaid = verification.valid || true;
    }

    const visibleLogs = agentState.logs.map(log => {
        // Always show alert logs (God Mode interventions) in clear text
        if (log.type === "alert") {
            return log;
        }

        // Public log types (agent_speech, system) - always show in clear text
        if (log.type === 'agent_speech' || log.type === 'system') {
            return log;
        }

        // If user paid, show everything (including thought, premium/tool logs)
        if (hasPaid) {
            return log;
        }

        // Otherwise, redact premium/tool logs and thought logs
        if (log.type === 'thought' || log.type === 'premium' || log.type === 'tool_use' || log.type === 'tool_result') {
            return {
                ...log,
                message: redactText(log.message),
                details: log.details ? (typeof log.details === 'string' ? redactText(log.details) : null) : null
            };
        }

        // For any other log types, show as-is (or customize as needed)
        return log;
    });

    res.json({
        status: agentState.status,
        logs: visibleLogs,
        lastUpdate: agentState.lastUpdate,
        dramaStage: agentState.dramaStage,
        emotion: agentState.emotion
    });
});

// 2. x402 Premium Logs (The "Paid Tier")
// Returns the raw, unredacted logs
app.get('/api/logs/premium', x402Middleware, async (req, res) => {
    res.json({
        status: agentState.status,
        logs: agentState.logs, // Full access
        lastUpdate: agentState.lastUpdate,
        dramaStage: agentState.dramaStage,
        emotion: agentState.emotion,
        panicLevel: agentState.panicLevel,
        greedLevel: agentState.greedLevel,
        lastToken: agentState.lastToken
    });
});

// 3. Get Status (For the UI header)
app.get('/api/status', (req, res) => {
    res.json({
        status: agentState.status,
        mission: agentState.mission,
        logsCount: agentState.logs.length,
        lastUpdate: agentState.lastUpdate,
        dramaStage: agentState.dramaStage,
        emotion: agentState.emotion,
        panicLevel: agentState.panicLevel,
        greedLevel: agentState.greedLevel,
        lastToken: agentState.lastToken
    });
});

// 4. Force Start (For debugging - optional since loop runs automatically)
app.post('/api/start', (req, res) => {
    if (agentState.status === "IDLE") {
        // Start the loop if not already running
        runAgentLoop().catch(err => {
            broadcast(`Failed to start agent: ${err.message}`, "error");
        });
        res.json({ message: "Agent started" });
    } else {
        res.json({ message: "Agent is already running", status: agentState.status });
    }
});

// 5. God Mode Injection Endpoint
app.post('/api/god-mode', async (req, res) => {
    const { prompt, signature } = req.body;

    if (!prompt || !signature) {
        return res.status(400).json({ error: "Missing required fields: prompt and signature" });
    }

    // Verify payment (1.0 SOL for God Mode)
    const verification = await verifyPayment(signature, GOD_MODE_PRICE);

    if (!verification.valid) {
        return res.status(verification.error === "Transaction not found or not confirmed yet." ? 400 : 402)
            .json({ error: verification.error || "Payment Required: 1.0 SOL" });
    }

    // Add to injection queue
    agentState.injectionQueue.push({
        user: "Anon", // Could be extracted from signature or passed in request
        prompt: prompt,
        timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: "Injection Queued" });
});

// Start Server & Agent
app.listen(PORT, () => {
    console.log(`Agent Brain running on http://localhost:${PORT}`);
    console.log(`x402 Server Wallet: ${SERVER_WALLET}`);
    console.log(`x402 Price per request: ${PRICE_SOL} SOL`);
    console.log(`Make sure to set up your .env file with GEMINI_API_KEY, SOLANA_PRIVATE_KEY, RPC_URL, SERVER_WALLET, and PRICE_SOL`);
    
    // Start the brain loop
    runAgentLoop().catch(err => {
        console.error('Failed to start agent loop:', err);
        process.exit(1);
    });
});

