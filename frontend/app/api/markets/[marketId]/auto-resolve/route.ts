import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getConnection } from "@/lib/solana/client"
import { autoResolveFromProof } from "@/lib/auto-resolve"
import { PublicKey } from "@solana/web3.js"
import { Wallet } from "@coral-xyz/anchor"

/**
 * POST /api/markets/[marketId]/auto-resolve
 * Auto-resolves market based on proof data
 * Request body: { agentWallet: string, agentId: string, walletAddress: string, txSignature: string, paymentSignature?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params
    const body = await request.json()

    const { agentWallet, agentId, walletAddress, txSignature, paymentSignature } = body

    if (!agentWallet || !agentId || !walletAddress || !txSignature) {
      return NextResponse.json(
        { error: "Missing required fields: agentWallet, agentId, walletAddress, txSignature" },
        { status: 400 }
      )
    }

    // Validate market exists
    const market = await db.market.findUnique({
      where: { id: marketId },
      include: {
        mission: {
          include: {
            agent: true,
          },
        },
      },
    })

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    if (market.state === "RESOLVED") {
      return NextResponse.json({ error: "Market already resolved" }, { status: 400 })
    }

    // Validate agent matches
    if (market.mission?.agent?.id !== agentId) {
      return NextResponse.json(
        { error: "Agent ID does not match market's agent" },
        { status: 400 }
      )
    }

    // Get connection
    const connection = getConnection()

    // Create wallet from provided address and signature
    // Note: In a real implementation, you'd verify the signature properly
    // For now, we'll use a minimal wallet adapter
    const walletPubkey = new PublicKey(walletAddress)
    const agentWalletPubkey = new PublicKey(agentWallet)
    const marketIdPubkey = new PublicKey(marketId)

    // Create a minimal wallet for contract interactions
    // Note: This requires the actual wallet to sign transactions
    // In production, you might want to use a server-side wallet or
    // require the client to sign the resolution transaction
    const wallet: Wallet = {
      publicKey: walletPubkey,
      signTransaction: async (tx) => {
        // This should be handled by the client
        // For now, throw an error indicating client-side signing is required
        throw new Error(
          "Wallet signing must be done client-side. Please use the auto-resolve button in the UI."
        )
      },
      signAllTransactions: async (txs) => {
        throw new Error(
          "Wallet signing must be done client-side. Please use the auto-resolve button in the UI."
        )
      },
    }

    // For API endpoint, we'll return the proof parsing result
    // but note that actual resolution requires client-side wallet signing
    // So we'll fetch and parse the proof, then return instructions

    // Fetch proof request to verify it's fulfilled
    const { fetchProofRequest } = await import("@/lib/stake/client")
    const proofRequest = await fetchProofRequest({
      connection,
      agentWallet: agentWalletPubkey,
      marketId: marketIdPubkey,
    })

    if (!proofRequest) {
      return NextResponse.json(
        { error: "Proof request not found" },
        { status: 404 }
      )
    }

    if (!proofRequest.fulfilled) {
      return NextResponse.json(
        { error: "Proof not yet fulfilled" },
        { status: 400 }
      )
    }

    // Fetch and parse proof data
    const { parseLogOutcome, validateProofData } = await import("@/lib/proof-parser")
    const { fetchAgentProof } = await import("@/lib/agent-server")

    // Get agent server URL (could be from agent record or env)
    const agentServerUrl = process.env.NEXT_PUBLIC_AGENT_SERVER_URL || "http://localhost:4000"

    let proofData
    if (proofRequest.proofUri && proofRequest.proofUri.trim() !== "") {
      const response = await fetch(proofRequest.proofUri, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch proof from URI: ${response.statusText}` },
          { status: 500 }
        )
      }
      proofData = await response.json()
    } else {
      // Fetch from agent server
      const proofUrl = `${agentServerUrl}/api/proof?market_id=${encodeURIComponent(marketId)}`
      const headers: HeadersInit = { "Content-Type": "application/json" }
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
          return NextResponse.json(
            { error: "Payment required to fetch proof", requiresPayment: true },
            { status: 402 }
          )
        }
        return NextResponse.json(
          { error: `Failed to fetch proof: ${response.statusText}` },
          { status: response.status }
        )
      }

      const agentProofResponse = await response.json()
      proofData = {
        chain_root_hash: agentProofResponse.chain_root_hash,
        signature: agentProofResponse.signature,
        logs: agentProofResponse.logs,
        agent_public_key: agentProofResponse.agent_public_key,
      }
    }

    // Validate proof data
    const validation = validateProofData(proofData)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid proof data" },
        { status: 400 }
      )
    }

    // Parse outcome
    const logOutcome = parseLogOutcome(proofData.logs)

    if (!logOutcome.outcome) {
      return NextResponse.json(
        {
          error: `Unable to determine outcome from logs. ${logOutcome.reason || ""}`,
          parsedData: logOutcome,
        },
        { status: 400 }
      )
    }

    // Return parsed outcome and instructions
    // Note: Actual resolution should be done client-side with wallet
    return NextResponse.json({
      success: true,
      outcome: logOutcome.outcome.toUpperCase(),
      confidence: logOutcome.confidence,
      reason: logOutcome.reason,
      requiresClientSigning: true,
      message: "Please use the auto-resolve button in the UI to complete resolution with your wallet.",
    })
  } catch (error) {
    console.error("Error in auto-resolve:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to auto-resolve market" },
      { status: 500 }
    )
  }
}
