import * as anchor from '@coral-xyz/anchor';
import fetch from 'cross-fetch';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import { sendSolanaTransaction, confirmSolanaTransaction } from '../../blockchain-mocks/solana';

dotenv.config();

// Setup Connection & Wallet - default to devnet so all tx use devnet
// Keep a Connection object for compatibility but avoid using it for sending transactions
const connection = new anchor.web3.Connection(process.env.RPC_URL || 'https://api.devnet.solana.com');

let wallet;
if (!process.env.SOLANA_PRIVATE_KEY) {
    // Generate a test keypair for development/testing
    console.warn('⚠️  WARNING: SOLANA_PRIVATE_KEY not set. Generating a test keypair for development.');
    console.warn('⚠️  This keypair has no funds and cannot perform real transactions.');
    wallet = anchor.web3.Keypair.generate();
    console.log(`Test Wallet Generated: ${wallet.publicKey.toBase58()}`);
} else {
    try {
        const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
        wallet = anchor.web3.Keypair.fromSecretKey(secretKey);
        console.log(`Agent Wallet Loaded: ${wallet.publicKey.toBase58()}`);
    } catch (error) {
        if (error.message.includes('Non-base58')) {
            console.error('❌ SOLANA_PRIVATE_KEY is not a valid base58 string.');
            console.error('   Generating a test keypair instead for development.');
            wallet = anchor.web3.Keypair.generate();
            console.log(`Test Wallet Generated: ${wallet.publicKey.toBase58()}`);
        } else {
            throw error;
        }
    }
}

// --- HELPER FUNCTIONS ---

// Helper function to send SOL payments
async function sendSolPayment(recipientPubkey, amountSol) {
    // Use mock send so no real on-chain transaction occurs
    const payload = {
        from: wallet.publicKey?.toBase58?.() || 'MOCK_WALLET',
        to: recipientPubkey,
        lamports: Math.round(amountSol * 1e9)
    };
    const result = await sendSolanaTransaction(payload);
    if (!result.success) throw new Error(result.error);
    return result.txId;
}

// --- TOOL DEFINITIONS ---

// 1. Check Balance Tool
async function getBalance() {
    // Return a deterministic mock balance (no chain call)
    return { sol: parseFloat(process.env.MOCK_BALANCE_SOL || '10.0'), pubkey: wallet.publicKey.toBase58() };
}

// 2. Swap Tool (Uses Jupiter API)
async function executeSwap({ outputMint, amountSol }) {
    try {
        console.log(`[TOOLS] Initiating Swap: ${amountSol} SOL -> ${outputMint}`);

        // A. Get Quote from Jupiter
        // inputMint is always SOL (So11111111111111111111111111111111111111112)
        const inputMint = "So11111111111111111111111111111111111111112"; 
        const amountLamports = Math.floor(amountSol * 1e9);
        
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=50`;
        const quoteResponse = await fetch(quoteUrl).then(res => res.json());
        if (!quoteResponse.routePlan) throw new Error("No route found");

        // B. Get Serialized Swap Transaction
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true,
            })
        }).then(res => res.json());

        // C. Deserialize, Sign, and Send
        const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
        const transaction = anchor.web3.VersionedTransaction.deserialize(swapTransactionBuf);
        transaction.sign([wallet]);
        const rawTransaction = transaction.serialize();

        // Instead of sending a real transaction, simulate a swap and return a mock tx id
        const txResult = await sendSolanaTransaction({ from: wallet.publicKey.toBase58(), to: outputMint, lamports: Math.floor(amountSol * 1e9) });
        if (!txResult.success) {
            return { status: 'error', message: txResult.error };
        }
        return { status: "success", txid: txResult.txId, message: `Swapped ${amountSol} SOL for token (mock)` };
    } catch (error) {
        console.error("Swap Failed:", error);
        return { status: "error", message: error.message };
    }
}

// 3. Fetch Premium Data Tool (Handles x402 Payment Required)
async function fetchPremiumData({ url }) {
    console.log(`[AGENT] Attempting to fetch: ${url}`);

    // Attempt 1: Try without paying
    let response = await fetch(url);

    // Check if we hit the x402 Paywall
    if (response.status === 402) {
        console.log(`[x402 DETECTED] Payment Required.`);
        const requestData = await response.json();
        
        const recipient = requestData.recipient;
        const price = requestData.amount;
        
        console.log(`[PAYING] Sending ${price} SOL to ${recipient}...`);
        
        // 1. Execute Payment
        const signature = await sendSolPayment(recipient, price);
        console.log(`[PAID] Signature: ${signature}`);

        // 2. Retry Request with Proof
        console.log(`[RETRYING] Sending request with proof header...`);
        response = await fetch(url, {
            headers: {
                'Authorization': `Signature ${signature}`
            }
        });
    }

    if (!response.ok) {
        return `Error: ${response.statusText}`;
    }

    const data = await response.json();
    return JSON.stringify(data);
}

// Export the tool definitions for Gemini
export const tools = [
    {
        name: "getBalance",
        description: "Get the current SOL balance of the agent's wallet.",
        parameters: { type: "OBJECT", properties: {} } // No params needed
    },
    {
        name: "executeSwap",
        description: "Swap SOL for another token on Solana using Jupiter.",
        parameters: {
            type: "OBJECT",
            properties: {
                outputMint: { type: "STRING", description: "The mint address of the token to buy" },
                amountSol: { type: "NUMBER", description: "The amount of SOL to swap" }
            },
            required: ["outputMint", "amountSol"]
        }
    },
    {
        name: "fetchPremiumData",
        description: "Fetch data from a URL. Handles '402 Payment Required' by automatically paying SOL.",
        parameters: {
            type: "OBJECT",
            properties: {
                url: { type: "STRING", description: "The API endpoint to fetch" }
            },
            required: ["url"]
        }
    }
];

// Map names to actual functions for execution
export const functions = {
    getBalance,
    executeSwap,
    fetchPremiumData
};
