import express from 'express';
import cors from 'cors';
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
// Use a fast RPC (Helius/Quicknode) for better verification speed
const connection = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com"); 

// CONFIGURATION
const SERVER_WALLET = process.env.SERVER_WALLET || "YOUR_RECEIVING_WALLET_ADDRESS"; // Put your pubkey here
const PRICE_SOL = parseFloat(process.env.PRICE_SOL || "0.001"); // Cost per request

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
    try {
        const tx = await connection.getParsedTransaction(paymentToken, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });

        if (!tx) {
            return res.status(400).json({ error: "Transaction not found or not confirmed yet." });
        }

        // Check if money went to us
        const instructions = tx.transaction.message.instructions;
        let validPayment = false;

        // Simple check: Look for a transfer to our wallet
        // In prod, you'd check the amount strictly.
        // This parser depends on standard system program transfers
        tx.transaction.message.accountKeys.forEach((key, index) => {
            if (key.pubkey.toBase58() === SERVER_WALLET) {
                // If we are in the account keys, check balance changes or instruction logic
                // For hackathon speed: we assume if the tx exists and involves us, it's valid.
                // REAL IMPLEMENTATION: Parse `postBalances` - `preBalances` for this index.
                const pre = tx.meta.preBalances[index];
                const post = tx.meta.postBalances[index];
                if ((post - pre) >= (PRICE_SOL * 1e9)) {
                    validPayment = true;
                }
            }
        });

        if (!validPayment) {
            return res.status(402).json({ error: "Insufficient payment amount verified." });
        }

        // Payment Valid! Attach info and proceed.
        req.paymentSignature = paymentToken;
        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Verification failed" });
    }
};

// --- ROUTES ---

// Public Route (Free)
app.get('/api/public-status', (req, res) => {
    res.json({ status: "Agent Market is Open", trend: "Neutral" });
});

// Protected Route (Costs money)
app.get('/api/premium-alpha', x402Middleware, (req, res) => {
    res.json({
        type: "PREMIUM_ALPHA",
        signal: "BUY BONK",
        confidence: "98%",
        reason: "Whale wallet 8x...A1 just accumulated 50B tokens.",
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`x402 Server running on http://localhost:${PORT}`);
    console.log(`Server Wallet: ${SERVER_WALLET}`);
    console.log(`Price per request: ${PRICE_SOL} SOL`);
});

