// Proof Request Flow Utility
// Orchestrates the complete proof request flow: requestProof -> fetch -> submitProof

import * as anchor from "@coral-xyz/anchor";
import { WalletContextState } from "@solana/wallet-adapter-react"
import { Wallet, BN } from "@coral-xyz/anchor"
import { requestProof, submitProof } from "./stake/client"
import { fetchAgentProof } from "./agent-server"

const AGENT_SERVER_URL = process.env.NEXT_PUBLIC_AGENT_SERVER_URL || 'http://localhost:4000'

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  // Ensure even length
  const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex
  const bytes = new Uint8Array(paddedHex.length / 2)
  for (let i = 0; i < paddedHex.length; i += 2) {
    bytes[i / 2] = parseInt(paddedHex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * Convert base58 string to Uint8Array
 */
function base58Decode(str: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let num = 0n
  for (const char of str) {
    const index = alphabet.indexOf(char)
    if (index === -1) {
      throw new Error(`Invalid base58 character: ${char}`)
    }
    num = num * 58n + BigInt(index)
  }
  const bytes: number[] = []
  while (num > 0n) {
    bytes.unshift(Number(num % 256n))
    num = num / 256n
  }
  return new Uint8Array(bytes)
}

export interface ProofFlowResult {
  requestSignature: string
  submitSignature: string
  proofData: {
    chainRootHash: string
    signature: string
    agentPublicKey: string
  }
}

export interface ProofFlowParams {
  connection: anchor.web3.Connection
  wallet: WalletContextState
  agentWallet: anchor.web3.PublicKey // Agent's wallet address (used to derive agent PDA)
  marketId: anchor.web3.PublicKey | string // Market ID as PublicKey or string
  agentId: string // Agent ID from database
  agentServerUrl?: string // Optional agent server URL, defaults to AGENT_SERVER_URL
  deadlineTs?: number // Optional deadline timestamp, defaults to 1 hour from now
  paymentSignature?: string | null // Optional existing payment signature for x402
}

/**
 * Complete proof request flow:
 * 1. Call requestProof() on contract
 * 2. Wait for transaction confirmation
 * 3. Fetch proof from agent server (with x402)
 * 4. Extract and convert proof data
 * 5. Call submitProof() on contract
 */
export async function requestProofFlow(
  params: ProofFlowParams
): Promise<ProofFlowResult> {
  const {
    connection,
    wallet,
    agentWallet,
    marketId,
    agentId,
    agentServerUrl,
    deadlineTs,
    paymentSignature,
  } = params

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error("Wallet not connected")
  }

  // Convert marketId to PublicKey if it's a string
  const marketIdPubkey =
    typeof marketId === "string" ? new anchor.web3.PublicKey(marketId) : marketId

  // Step 1: Request proof on contract
  const walletAdapter: Wallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction!,
    signAllTransactions: wallet.signAllTransactions!,
  }

  const deadline = deadlineTs || Math.floor(Date.now() / 1000) + 3600 // 1 hour default

  console.log("[PROOF FLOW] Requesting proof on contract...")
  const { signature: requestSig } = await requestProof({
    connection,
    wallet: walletAdapter,
    agentWallet,
    marketId: marketIdPubkey,
    deadlineTs: new BN(deadline),
  })

  console.log("[PROOF FLOW] Proof requested, signature:", requestSig)

  // Wait for transaction confirmation
  await connection.confirmTransaction(requestSig, "confirmed")
  console.log("[PROOF FLOW] Request transaction confirmed")

  // Step 2: Fetch agent info and proof from agent server
  const serverUrl = agentServerUrl || AGENT_SERVER_URL
  const marketIdString = marketIdPubkey.toBase58()

  console.log("[PROOF FLOW] Fetching proof from agent server...")
  const proofResponse = await fetchAgentProof(
    serverUrl,
    marketIdString,
    connection,
    wallet,
    paymentSignature
  )

  if (!proofResponse.chain_root_hash || !proofResponse.signature) {
    throw new Error(
      "Invalid proof response: missing chain_root_hash or signature"
    )
  }

  console.log("[PROOF FLOW] Proof fetched from agent server")

  // Step 3: Convert proof data to required formats
  // Convert chain_root_hash (hex string) to Uint8Array[32]
  const logRoot = hexToUint8Array(proofResponse.chain_root_hash)
  if (logRoot.length !== 32) {
    throw new Error(
      `Invalid chain_root_hash length: expected 32 bytes, got ${logRoot.length}`
    )
  }

  // Convert signature (base58 string) to Uint8Array[64]
  const signatureBytes = base58Decode(proofResponse.signature)
  if (signatureBytes.length !== 64) {
    throw new Error(
      `Invalid signature length: expected 64 bytes, got ${signatureBytes.length}`
    )
  }

  // Step 4: Submit proof on contract
  // For proofUri, we can use empty string or construct a URL
  // In the future, this could point to a detailed proof document
  const proofUri = "" // Empty for now, can be enhanced later

  console.log("[PROOF FLOW] Submitting proof on contract...")
  const { signature: submitSig } = await submitProof({
    connection,
    wallet: walletAdapter,
    agentWallet,
    marketId: marketIdPubkey,
    logRoot,
    proofUri,
    signature: signatureBytes,
  })

  console.log("[PROOF FLOW] Proof submitted, signature:", submitSig)

  // Wait for transaction confirmation
  await connection.confirmTransaction(submitSig, "confirmed")
  console.log("[PROOF FLOW] Submit transaction confirmed")

  return {
    requestSignature: requestSig,
    submitSignature: submitSig,
    proofData: {
      chainRootHash: proofResponse.chain_root_hash,
      signature: proofResponse.signature,
      agentPublicKey: proofResponse.agent_public_key || "",
    },
  }
}
