import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createX402Middleware } from "@/lib/x402-middleware"
import { PEEK_PRICE } from "@/lib/agent-server"

const AGENT_SERVER_URL = process.env.NEXT_PUBLIC_AGENT_SERVER_URL || 'http://localhost:4000'

/**
 * GET /api/proof?market_id=X&agentId=Y
 * x402-protected endpoint that fetches proof from agent server
 */
export async function GET(request: NextRequest) {
  // Apply x402 middleware
  const x402Response = await createX402Middleware(PEEK_PRICE, "proof")(request)
  if (x402Response) {
    return x402Response
  }

  try {
    const { searchParams } = new URL(request.url)
    const marketId = searchParams.get("market_id")
    const agentId = searchParams.get("agentId")

    if (!marketId) {
      return NextResponse.json(
        { error: "market_id query parameter is required" },
        { status: 400 }
      )
    }

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId query parameter is required" },
        { status: 400 }
      )
    }

    // Fetch agent from database to validate it exists
    const agent = await db.agent.findUnique({
      where: { id: agentId },
    })

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Get payment signature from Authorization header
    const authHeader = request.headers.get("authorization")
    const paymentSignature = authHeader?.startsWith("Signature ")
      ? authHeader.substring(11).trim()
      : null

    if (!paymentSignature) {
      return NextResponse.json(
        { error: "Payment signature required" },
        { status: 402 }
      )
    }

    // Construct agent server proof endpoint URL
    // Note: In production, you might want to fetch agent URL from contract
    // For now, using the default AGENT_SERVER_URL
    const agentServerUrl = AGENT_SERVER_URL
    const proofUrl = `${agentServerUrl}/api/proof?market_id=${encodeURIComponent(marketId)}`

    // Forward request to agent server with payment signature
    const agentResponse = await fetch(proofUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Signature ${paymentSignature}`,
      },
      cache: "no-store",
    })

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json().catch(() => ({
        error: agentResponse.statusText,
      }))
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch proof from agent server" },
        { status: agentResponse.status }
      )
    }

    const proofData = await agentResponse.json()

    // Return proof data with chain_root_hash, signature, logs, agent_public_key
    return NextResponse.json(proofData)
  } catch (error) {
    console.error("Error fetching proof:", error)
    return NextResponse.json(
      { error: "Failed to fetch proof" },
      { status: 500 }
    )
  }
}
