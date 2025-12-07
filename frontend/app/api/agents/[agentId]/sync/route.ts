import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAgentStatus } from "@/lib/agent-server"

// Map agent server status to database AgentStatus
function mapAgentStatus(status: string): "IDLE" | "ACTIVE" | "COMPLETED" | "FAILED" {
  const upperStatus = status.toUpperCase()
  if (upperStatus === "ACTIVE" || upperStatus === "ANALYZING" || upperStatus === "TRADING") {
    return "ACTIVE"
  }
  if (upperStatus === "SLEEPING" || upperStatus === "IDLE") {
    return "IDLE"
  }
  if (upperStatus === "COMPLETED") {
    return "COMPLETED"
  }
  if (upperStatus === "FAILED") {
    return "FAILED"
  }
  return "IDLE"
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    // Verify agent exists
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: { stats: true },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Fetch latest status from agent server
    let agentServerStatus
    try {
      agentServerStatus = await getAgentStatus()
    } catch (error) {
      console.error("Error fetching agent server status:", error)
      return NextResponse.json(
        { error: "Failed to connect to agent server. Make sure it's running on port 4000." },
        { status: 503 }
      )
    }

    const dbStatus = mapAgentStatus(agentServerStatus.status)

    // Update agent status
    const updatedAgent = await db.agent.update({
      where: { id: agentId },
      data: {
        status: dbStatus,
        stats: {
          upsert: {
            create: {
              currentPnL: 0,
              compute: 0,
              status: agentServerStatus.status,
            },
            update: {
              status: agentServerStatus.status,
              lastUpdated: new Date(),
            },
          },
        },
      },
      include: { stats: true },
    })

    return NextResponse.json({
      message: "Agent stats synced successfully",
      agent: updatedAgent,
      serverStatus: agentServerStatus,
    })
  } catch (error: any) {
    console.error("Error syncing agent stats:", error)
    return NextResponse.json(
      { error: "Failed to sync agent stats", details: error.message },
      { status: 500 }
    )
  }
}

