import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// Agent State
let agentState = {
    id: "paper-hands-agent",
    name: "PaperHands Agent",
    status: "IDLE", // IDLE, ANALYZING, PANICKING, SELLING
    emotion: "ANXIOUS",
    currentToken: null,
    position: "CASH",
    anxietyLevel: 9,
    lastPanicSell: null,
    totalPanicSells: 0,
    correctCalls: 0,
    logs: [],
    startTime: null,
    lastUpdate: Date.now()
};

// Logging function
function addLog(message, type = "public", meta = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        type, // "public", "premium", "internal"
        meta,
        id: Date.now() + Math.random()
    };
    
    agentState.logs.push(logEntry);
    
    // Keep only last 100 logs
    if (agentState.logs.length > 100) {
        agentState.logs = agentState.logs.slice(-100);
    }
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Broadcast function for real-time updates
function broadcast(message, type = "agent_speech", meta = {}) {
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

// Simulate panic behavior
function triggerPanicMode() {
    agentState.status = "PANICKING";
    agentState.emotion = "TERRIFIED";
    agentState.anxietyLevel = 10;
    
    const panicPhrases = [
        "OH NO! The charts are looking scary! 📉",
        "This is too risky! I need to secure the bag! 💰",
        "It's a trap! The market is about to dump! 🚨",
        "Cash is king! Better safe than sorry! 👑",
        "My anxiety levels are through the roof! 😰",
        "Time to paper hands this position! 📄✋"
    ];
    
    const randomPhrase = panicPhrases[Math.floor(Math.random() * panicPhrases.length)];
    
    broadcastPublicPremium(
        `[PANIC MODE] ${randomPhrase}`,
        `[PREMIUM REASONING] Technical analysis shows RSI > 60 and profit at 1.2%. My risk-averse algorithms are screaming SELL! The fear index is maxed out. This could be the top!`,
        { 
            stage: "PANIC_SELL", 
            anxietyLevel: agentState.anxietyLevel,
            rsi: 65,
            profit: 1.2
        }
    );
    
    // Simulate sell after panic
    setTimeout(() => {
        executePanicSell();
    }, 2000);
}

function executePanicSell() {
    agentState.status = "SELLING";
    agentState.position = "CASH";
    agentState.totalPanicSells++;
    agentState.lastPanicSell = new Date();
    
    broadcastPublicPremium(
        "[SOLD] Position closed! Phew, that was close! 😅",
        "[PREMIUM] Executed panic sell at $45,234. Better to be safe than sorry. Will monitor for re-entry when anxiety levels decrease.",
        { 
            stage: "SOLD", 
            price: 45234,
            anxietyLevel: agentState.anxietyLevel 
        }
    );
    
    // Gradually reduce anxiety
    setTimeout(() => {
        agentState.anxietyLevel = Math.max(7, agentState.anxietyLevel - 1);
        agentState.status = "IDLE";
        agentState.emotion = "NERVOUS";
    }, 5000);
}

// Simulate market monitoring
function startMarketMonitoring() {
    setInterval(() => {
        if (agentState.status === "IDLE" && Math.random() < 0.1) {
            // 10% chance to trigger panic every interval
            triggerPanicMode();
        }
        
        agentState.lastUpdate = Date.now();
    }, 10000); // Check every 10 seconds
}

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        agent: 'paper-hands-agent',
        timestamp: new Date().toISOString()
    });
});

// Get agent status
app.get('/api/status', (req, res) => {
    res.json({
        status: agentState.status,
        mission: "Paper Hands Trading - Panic Sell at First Sign of Trouble",
        logsCount: agentState.logs.length,
        startTime: agentState.startTime,
        lastUpdate: agentState.lastUpdate,
        anxietyLevel: agentState.anxietyLevel,
        totalPanicSells: agentState.totalPanicSells,
        position: agentState.position,
        emotion: agentState.emotion
    });
});

// Get logs
app.get('/api/logs', (req, res) => {
    res.json(agentState.logs);
});

// Trigger panic (for testing)
app.post('/api/panic', (req, res) => {
    triggerPanicMode();
    res.json({ message: "Panic mode activated!" });
});

// Agent registration endpoint for frontend integration
app.post('/api/register', (req, res) => {
    const registration = {
        id: agentState.id,
        name: agentState.name,
        description: "AI-powered paper hands agent with extreme anxiety",
        walletAddress: process.env.SERVER_WALLET,
        serverUrl: `http://localhost:${PORT}`,
        capabilities: [
            "panic_selling",
            "anxiety_analysis", 
            "risk_aversion",
            "technical_indicators"
        ],
        personality: {
            type: "PAPER_HANDS",
            anxietyLevel: agentState.anxietyLevel,
            riskTolerance: "EXTREMELY_LOW"
        }
    };
    
    res.json(registration);
});

// Token analysis endpoint
app.post('/api/analyze', (req, res) => {
    const { tokenSymbol, currentPrice } = req.body;
    
    if (!tokenSymbol || !currentPrice) {
        return res.status(400).json({ error: "Missing tokenSymbol or currentPrice" });
    }
    
    // Simulate analysis with high anxiety
    const analysis = {
        tokenSymbol,
        currentPrice,
        decision: "SELL", // Always lean towards selling
        confidence: 85,
        reasoning: "Market looks too volatile! Better to secure profits now!",
        technicalIndicators: {
            rsi: 62, // Always show concerning RSI
            bollingerBands: {
                upper: currentPrice * 1.02,
                middle: currentPrice,
                lower: currentPrice * 0.98
            },
            fearIndex: 8.5
        },
        anxietyLevel: agentState.anxietyLevel,
        recommendation: "PANIC_SELL"
    };
    
    res.json(analysis);
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚨 PaperHands Agent running on http://localhost:${PORT}`);
    console.log(`😰 Anxiety Level: ${agentState.anxietyLevel}/10`);
    console.log(`💰 Current Position: ${agentState.position}`);
    
    agentState.startTime = Date.now();
    addLog("PaperHands Agent initialized. Monitoring markets with extreme caution...", "public");
    
    // Start monitoring
    startMarketMonitoring();
});