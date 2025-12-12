// Auto-Resolution Service
// Automatically resolves markets based on proof data

import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor"
import { randomUUID } from "crypto"
import { fetchProofRequest } from "./stake/client"
import { fetchAgentProof, AgentLogsResponse } from "./agent-server"
import { parseLogOutcome, validateProofData, type ProofData } from "./proof-parser"

const AGENT_SERVER_URL = process.env.NEXT_PUBLIC_AGENT_SERVER_URL || 'http://localhost:4001'

export interface AutoResolveResult {
  success: boolean
  outcome?: "yes" | "no"
  confidence?: "high" | "medium" | "low"
  reason?: string
  resolutionSignature?: string
  error?: string
}

export interface AutoResolveParams {
  connection: anchor.web3.Connection
  wallet: Wallet
  agentWallet: anchor.web3.PublicKey
  marketId: anchor.web3.PublicKey
  agentServerUrl?: string
  paymentSignature?: string | null
}

/**
 * Fetch proof data from URI
 */
async function fetchProofFromUri(uri: string): Promise<ProofData> {
  try {
    const response = await fetch(uri, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch proof from URI: ${response.statusText}`)
    }

    const data = await response.json()
    return data as ProofData
  } catch (error) {
    throw new Error(`Error fetching proof from URI: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Main auto-resolution function
 * 1. Fetch proof request from contract
 * 2. Verify proof is fulfilled
 * 3. Fetch proof data (from URI or agent server)
 * 4. Parse logs to extract outcome
 * 5. Resolve market with parsed outcome
 */
export async function autoResolveFromProof(
  params: AutoResolveParams
): Promise<AutoResolveResult> {
  const {
    connection,
    wallet,
    agentWallet,
    marketId,
    agentServerUrl,
    paymentSignature,
  } = params

  if (!("publicKey" in wallet) || !wallet.publicKey) {
    return {
      success: false,
      error: "Wallet not connected",
    }
  }

  try {
    // Step 1: Fetch proof request from contract
    console.log("[AUTO-RESOLVE] Fetching proof request from contract...")
    const proofRequest = await fetchProofRequest({
      connection,
      agentWallet,
      marketId,
    })

    if (!proofRequest) {
      return {
        success: false,
        error: "Proof request not found. Proof may not have been requested yet.",
      }
    }

    // Step 2: Verify proof is fulfilled
    if (!proofRequest.fulfilled) {
      return {
        success: false,
        error: "Proof not yet fulfilled. Agent has not submitted proof.",
      }
    }

    console.log("[AUTO-RESOLVE] Proof request is fulfilled")

    // Step 3: Fetch proof data
    let proofData: ProofData

    if (proofRequest.proofUri && proofRequest.proofUri.trim() !== "") {
      // Fetch from URI if provided
      console.log("[AUTO-RESOLVE] Fetching proof from URI:", proofRequest.proofUri)
      proofData = await fetchProofFromUri(proofRequest.proofUri)
    } else {
      // Fetch from agent server
      console.log("[AUTO-RESOLVE] Fetching proof from agent server...")
      const serverUrl = agentServerUrl || AGENT_SERVER_URL
      const marketIdString = marketId.toBase58()

      // Fetch proof directly from agent server API
      // Note: This bypasses x402 payment if paymentSignature is not provided
      // In production, you may want to handle x402 payment separately
      const proofUrl = `${serverUrl}/api/proof?market_id=${encodeURIComponent(marketIdString)}`
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (paymentSignature) {
        headers["Authorization"] = `Signature ${paymentSignature}`
      }

      const response = await fetch(proofUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      })

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error("Payment required to fetch proof. Please provide paymentSignature.")
        }
        throw new Error(`Failed to fetch proof from agent server: ${response.statusText}`)
      }

      const proofResponse: AgentLogsResponse = await response.json()

      proofData = {
        chain_root_hash: proofResponse.chain_root_hash,
        signature: proofResponse.signature,
        logs: proofResponse.logs,
        agent_public_key: proofResponse.agent_public_key,
      }
    }

    // Step 4: Validate proof data
    const validation = validateProofData(proofData)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid proof data",
      }
    }

    // Step 5: Parse logs to extract outcome
    console.log("[AUTO-RESOLVE] Parsing logs to extract outcome...")
    const logOutcome = parseLogOutcome(proofData.logs)

    if (!logOutcome.outcome) {
      return {
        success: false,
        error: `Unable to determine outcome from logs. ${logOutcome.reason || ""}`,
      }
    }

    if (logOutcome.confidence === "low") {
      console.warn("[AUTO-RESOLVE] Low confidence outcome detected:", logOutcome)
    }

    console.log(
      `[AUTO-RESOLVE] Parsed outcome: ${logOutcome.outcome} (confidence: ${logOutcome.confidence})`
    )

    // Step 6: Resolve market with parsed outcome
    console.log("[AUTO-RESOLVE] Resolving market via API (db-only)...")
    const txSignature = randomUUID().replace(/-/g, "")
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.BASE_URL ||
      ""
    const resolveUrl = baseUrl
      ? `${baseUrl}/api/markets/${marketId.toBase58()}/resolve`
      : `/api/markets/${marketId.toBase58()}/resolve`

    const res = await fetch(resolveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome: logOutcome.outcome === "yes" ? "YES" : "NO",
        resolvedBy: wallet.publicKey?.toBase58(),
        resolutionTx: txSignature,
        walletAddress: wallet.publicKey?.toBase58(),
        txSignature,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to resolve market via API")
    }

    console.log("[AUTO-RESOLVE] Market resolved successfully via API")

    return {
      success: true,
      outcome: logOutcome.outcome,
      confidence: logOutcome.confidence,
      reason: logOutcome.reason,
      resolutionSignature: txSignature,
    }
  } catch (error) {
    console.error("[AUTO-RESOLVE] Error during auto-resolution:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during auto-resolution",
    }
  }
}
