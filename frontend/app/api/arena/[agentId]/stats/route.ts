import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    const stats = await db.agentStats.findUnique({
      where: { agentId },
      include: {
        agent: {
          include: {
            missions: {
              where: {
                status: "ACTIVE",
              },
              include: {
                market: {
                  include: {
                    _count: {
                      select: {
                        bets: true,
                      },
                    },
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!stats) {
      return NextResponse.json({ error: "Stats not found" }, { status: 404 })
    }

    const activeMission = stats.agent.missions[0]
    const viewers = activeMission?.market?._count.bets || 0

    return NextResponse.json({
      stats: {
        currentPnL: Number(stats.currentPnL),
        compute: Number(stats.compute),
        status: stats.status,
        lastUpdated: stats.lastUpdated,
      },
      viewers,
      volume: activeMission?.market
        ? Number(activeMission.market.totalVolume)
        : 0,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

