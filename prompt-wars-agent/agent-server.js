import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

app.use(cors());
app.use(express.json());

// --- MEMORY STATE (The "Black Box") ---
// We store logs here so the frontend can fetch them
const MAX_LOGS = 100; // Keep only last 100 logs to save memory

let agentState = {
    status: "IDLE", // IDLE, ANALYZING, TRADING, SLEEPING
    logs: [],       // Stores the Chain of Thought
    lastUpdate: Date.now(),
    mission: "Autonomous Hedge Fund - Find Alpha and Trade"
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

// --- GEMINI AGENT LOGIC ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `
You are a Solana Trading Agent named "Nexus".

1. Your goal is to find trading opportunities.

2. EXPLAIN your thinking step-by-step.

3. If you decide to trade, declare it clearly.

4. If you see high risk, say "SKIPPING".

5. START by calling 'fetchPremiumData' on "http://localhost:3000/api/premium-alpha".

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
        model: "gemini-2.0-flash-exp",
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
            agentState.status = "ANALYZING";
            broadcast("Analyzing market conditions...", "thought");
            
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
            const textResponse = result.text();
            if (textResponse) {
                broadcast(textResponse, "agent_speech");
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

// --- API ENDPOINTS (For the Frontend) ---

// 1. Public Logs (The "Free Tier")
// Returns basic info, blurs specific "premium" details if you want
app.get('/api/logs', (req, res) => {
    res.json({
        status: agentState.status,
        logs: agentState.logs.map(log => {
            // OPTIONAL: Redact sensitive info for public users
            if (log.type === 'premium' || log.type === 'tool_use' || log.type === 'tool_result') {
                return { 
                    ...log, 
                    message: "--- ENCRYPTED ALPHA DATA ---", 
                    details: null 
                };
            }
            return log;
        }),
        lastUpdate: agentState.lastUpdate
    });
});

// 2. x402 Premium Logs (The "Paid Tier")
// Returns the raw, unredacted logs
// TODO: INSERT YOUR X402 MIDDLEWARE LOGIC HERE (from previous step)
// For now, we simulate success
app.get('/api/logs/premium', async (req, res) => {
    // INSERT YOUR X402 MIDDLEWARE LOGIC HERE (from previous step)
    // For now, we simulate success
    res.json({
        status: agentState.status,
        logs: agentState.logs, // Full access
        lastUpdate: agentState.lastUpdate
    });
});

// 3. Get Status (For the UI header)
app.get('/api/status', (req, res) => {
    res.json({
        status: agentState.status,
        mission: agentState.mission,
        logsCount: agentState.logs.length,
        lastUpdate: agentState.lastUpdate
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

// Start Server & Agent
app.listen(PORT, () => {
    console.log(`Agent Brain running on http://localhost:${PORT}`);
    console.log(`Make sure to set up your .env file with GEMINI_API_KEY, SOLANA_PRIVATE_KEY, and RPC_URL`);
    
    // Start the brain loop
    runAgentLoop().catch(err => {
        console.error('Failed to start agent loop:', err);
        process.exit(1);
    });
});

