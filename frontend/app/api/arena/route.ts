import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { agentFiltersSchema } from "@/lib/validations"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = agentFiltersSchema.parse({
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
    })

    const where: any = {}
    if (filters.category) {
      where.category = filters.category
    }
    if (filters.status) {
      where.status = filters.status
    }

    const agents = await db.agent.findMany({
      where,
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
                    trades: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        stats: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Format agents with arena data
    const arenas = agents.map((agent) => {
      const activeMission = agent.missions[0]
      const market = activeMission?.market

      // Calculate odds if market exists
      let odds = null
      if (market) {
        const moonOdds = Number(market.moonPrice) * 100
        const rugOdds = Number(market.rugPrice) * 100
        odds = {
          moon: Math.round(moonOdds),
          rug: Math.round(rugOdds),
        }
      }

      return {
        id: agent.id,
        name: agent.name,
        category: agent.category,
        status: agent.status,
        stats: agent.stats
          ? {
              currentPnL: Number(agent.stats.currentPnL),
              compute: Number(agent.stats.compute),
              status: agent.stats.status,
              lastUpdated: agent.stats.lastUpdated,
            }
          : null,
        mission: activeMission
          ? {
              id: activeMission.id,
              description: activeMission.description,
              startTime: activeMission.startTime,
              endTime: activeMission.endTime,
              status: activeMission.status,
              category: activeMission.category,
            }
          : null,
        market: market
          ? {
              id: market.id,
              moonPrice: Number(market.moonPrice),
              rugPrice: Number(market.rugPrice),
              totalVolume: Number(market.totalVolume),
              liquidity: Number(market.liquidity),
              participants: market.participants,
              odds,
              betCount: market._count.bets,
              tradeCount: market._count.trades,
            }
          : null,
      }
    })

    return NextResponse.json({ arenas })
  } catch (error) {
    console.error("Error fetching arenas:", error)
    return NextResponse.json({ error: "Failed to fetch arenas" }, { status: 500 })
  }
}

