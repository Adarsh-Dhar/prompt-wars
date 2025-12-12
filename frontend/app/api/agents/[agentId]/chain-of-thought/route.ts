import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    // Get agent details
    const agent = await db.agent.findUnique({
      where: { id: agentId },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    if (!agent.chainOfThoughtEndpoint) {
      return NextResponse.json({ 
        error: "Chain-of-thought endpoint not configured for this agent" 
      }, { status: 400 })
    }

    // Fetch chain-of-thought from agent's endpoint
    try {
      const response = await fetch(agent.chainOfThoughtEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Arena-Frontend/1.0',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`Agent endpoint returned ${response.status}: ${response.statusText}`)
      }

      const chainOfThought = await response.json()

      return NextResponse.json({
        agent: {
          id: agent.id,
          name: agent.name,
          url: agent.url,
          chainOfThoughtEndpoint: agent.chainOfThoughtEndpoint,
        },
        chainOfThought,
        fetchedAt: new Date().toISOString(),
      })
    } catch (error: any) {
      console.error("Error fetching chain-of-thought:", error)
      return NextResponse.json({
        error: "Failed to fetch chain-of-thought from agent",
        details: error.message,
        agent: {
          id: agent.id,
          name: agent.name,
          chainOfThoughtEndpoint: agent.chainOfThoughtEndpoint,
        },
      }, { status: 502 })
    }
  } catch (error: any) {
    console.error("Error in chain-of-thought endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}