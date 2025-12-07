const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 4000;

app.use(cors()); // Allows your React frontend to talk to this

// --- AGENT STATE ---
let gameState = {
    mission: "Accumulate $SOL on pump.fun",
    status: "IDLE", // IDLE, ACTIVE, SUCCESS, FAILED
    logs: [],
    startTime: null,
    endTime: null
};

// --- SIMULATION DATA ---
const THOUGHTS = [
    { text: "Scanning pump.fun mempool for high velocity...", type: "public" },
    { text: "Detected wallet 8x...A1 accumulation pattern.", type: "premium" }, // This is the 'x402' hidden info
    { text: "Analyzing token distribution curves...", type: "public" },
    { text: "Liquidity unlocked. Risk factor: HIGH.", type: "premium" },
    { text: "Preparing buy order at 0.04 SOL...", type: "premium" },
    { text: "Twitter sentiment analysis: BULLISH.", type: "public" },
    { text: "Calculating slipppage tolerance...", type: "public" }
];

// --- GAME LOOP ---
function startGame() {
    console.log("Starting Mission...");
    gameState.status = "ACTIVE";
    gameState.logs = [];
    gameState.startTime = Date.now();
    
    // Add an initial log
    addLog("System initialized. Connecting to Solana Mainnet...");

    // Simulate "thinking" every 3 seconds
    const intervalId = setInterval(() => {
        if (gameState.status !== "ACTIVE") {
            clearInterval(intervalId);
            return;
        }

        // Randomly pick a thought
        const randomThought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
        addLog(randomThought.text, randomThought.type);

        // Random chance to end the game (Moon or Rug)
        const roll = Math.random();
        if (gameState.logs.length > 8) { // Only end after some time
            if (roll > 0.7) {
                endGame("SUCCESS");
            } else if (roll < 0.2) {
                endGame("FAILED");
            }
        }
    }, 3000);
}

function addLog(text, type = "public") {
    const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        text: text,
        isPremium: type === "premium" // Frontend uses this to blur text
    };
    gameState.logs.push(log);
    console.log(`[AGENT]: ${text}`);
}

function endGame(result) {
    gameState.status = result;
    gameState.endTime = Date.now();
    addLog(result === "SUCCESS" ? "MISSION ACCOMPLISHED. PROFIT SECURED." : "LIQUIDATED. MISSION FAILED.");
    console.log(`Game Over: ${result}`);
    
    // Auto-restart after 10 seconds for the demo
    setTimeout(startGame, 10000);
}

// --- API ENDPOINTS ---

// 1. Get Game Status (For the UI header)
app.get('/api/status', (req, res) => {
    res.json({
        status: gameState.status,
        mission: gameState.mission,
        logsCount: gameState.logs.length
    });
});

// 2. Get Logs (For the Terminal View)
app.get('/api/logs', (req, res) => {
    // In a real x402 app, you would check headers here.
    // For now, we send everything, and the frontend blurs it if isPremium = true.
    res.json(gameState.logs);
});

// 3. Force Start (For debugging)
app.post('/api/start', (req, res) => {
    startGame();
    res.json({ message: "Agent started" });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Test Agent running on http://localhost:${PORT}`);
    startGame(); // Auto-start on launch
});