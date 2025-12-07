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

export async function POST(request: Request) {
  try {
    // Fetch agent status from agent server
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

    const agentName = "Nexus"
    const agentCategory = "Trading Bots"
    const dbStatus = mapAgentStatus(agentServerStatus.status)

    // Check if agent already exists
    let agent = await db.agent.findUnique({
      where: { name: agentName },
      include: { stats: true },
    })

    if (agent) {
      // Update existing agent
      agent = await db.agent.update({
        where: { id: agent.id },
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
        message: "Agent updated successfully",
        agent,
      })
    } else {
      // Create new agent
      agent = await db.agent.create({
        data: {
          name: agentName,
          category: agentCategory,
          status: dbStatus,
          stats: {
            create: {
              currentPnL: 0,
              compute: 0,
              status: agentServerStatus.status,
            },
          },
        },
        include: { stats: true },
      })

      // Optionally create a test mission and market
      const now = new Date()
      const endTime = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

      const mission = await db.mission.create({
        data: {
          agentId: agent.id,
          description: agentServerStatus.mission || "Autonomous Hedge Fund - Find Alpha and Trade",
          startTime: now,
          endTime: endTime,
          status: "ACTIVE",
          category: agentCategory,
          market: {
            create: {
              moonPrice: 0.5,
              rugPrice: 0.5,
              totalVolume: 0,
              liquidity: 0,
              participants: 0,
            },
          },
        },
        include: { market: true },
      })

      return NextResponse.json({
        message: "Agent registered successfully",
        agent: {
          ...agent,
          mission,
        },
      })
    }
  } catch (error: any) {
    console.error("Error registering agent:", error)
    return NextResponse.json(
      { error: "Failed to register agent", details: error.message },
      { status: 500 }
    )
  }
}

