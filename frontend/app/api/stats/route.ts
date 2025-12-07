import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    // Get total volume from all markets
    const markets = await db.market.findMany({
      select: {
        totalVolume: true,
      },
    })

    const totalVolume = markets.reduce((sum, market) => sum + Number(market.totalVolume), 0)

    // Get active viewers (users with active bets)
    const activeViewers = await db.bet.count({
      where: {
        status: "ACTIVE",
      },
      distinct: ["userId"],
    })

    // Get completed missions
    const missionsComplete = await db.mission.count({
      where: {
        status: "COMPLETED",
      },
    })

    // Get registered agents
    const registeredAgents = await db.agent.count()

    return NextResponse.json({
      stats: {
        totalVolume: totalVolume,
        activeViewers: activeViewers,
        missionsComplete: missionsComplete,
        registeredAgents: registeredAgents,
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

