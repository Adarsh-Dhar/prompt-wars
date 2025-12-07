import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        missions: {
          where: {
            status: "ACTIVE",
          },
          include: {
            market: {
              include: {
                bets: {
                  where: {
                    status: "ACTIVE",
                  },
                  take: 10,
                  orderBy: {
                    createdAt: "desc",
                  },
                },
                trades: {
                  include: {
                    user: true,
                  },
                  orderBy: {
                    timestamp: "desc",
                  },
                  take: 20,
                },
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
        logs: {
          where: {
            type: "PUBLIC",
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 50,
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const activeMission = agent.missions[0]

    // Calculate odds if market exists
    let odds = null
    if (activeMission?.market) {
      const moonOdds = Number(activeMission.market.moonPrice) * 100
      const rugOdds = Number(activeMission.market.rugPrice) * 100
      odds = {
        moon: Math.round(moonOdds),
        rug: Math.round(rugOdds),
      }
    }

    // Format recent trades
    const recentTrades =
      activeMission?.market?.trades.map((trade) => ({
        user: trade.user.walletAddress.slice(0, 6) + "..." + trade.user.walletAddress.slice(-4),
        action: "bought",
        shares: trade.shares,
        type: trade.position,
        time: formatTimeAgo(trade.timestamp),
      })) || []

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        category: agent.category,
        status: agent.status,
      },
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
      market: activeMission?.market
        ? {
            id: activeMission.market.id,
            moonPrice: Number(activeMission.market.moonPrice),
            rugPrice: Number(activeMission.market.rugPrice),
            totalVolume: Number(activeMission.market.totalVolume),
            liquidity: Number(activeMission.market.liquidity),
            participants: activeMission.market.participants,
            odds,
            recentTrades,
          }
        : null,
      stats: agent.stats
        ? {
            currentPnL: Number(agent.stats.currentPnL),
            compute: Number(agent.stats.compute),
            status: agent.stats.status,
            lastUpdated: agent.stats.lastUpdated,
          }
        : null,
      logs: agent.logs.map((log) => ({
        id: log.id,
        type: log.type,
        content: log.content,
        timestamp: log.timestamp,
        time: formatTime(log.timestamp),
      })),
    })
  } catch (error) {
    console.error("Error fetching arena data:", error)
    return NextResponse.json({ error: "Failed to fetch arena data" }, { status: 500 })
  }
}

function formatTime(timestamp: Date): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${hours}:${minutes}:${seconds}`
}

function formatTimeAgo(timestamp: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000)

  if (diff < 60) {
    return `${diff}s ago`
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`
  } else {
    return `${Math.floor(diff / 3600)}h ago`
  }
}

