import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { profileFiltersSchema } from "@/lib/validations"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params
    const { searchParams } = new URL(request.url)
    const filters = profileFiltersSchema.parse({
      status: searchParams.get("status") || "ACTIVE",
      limit: searchParams.get("limit") || "20",
      offset: searchParams.get("offset") || "0",
    })

    let user = await db.user.findUnique({
      where: { walletAddress: wallet },
    })

    if (!user) {
      return NextResponse.json({ bets: [], pagination: { limit: filters.limit, offset: filters.offset } })
    }

    const where: any = {
      userId: user.id,
      status: filters.status as any,
    }

    const bets = await db.bet.findMany({
      where,
      include: {
        market: {
          include: {
            mission: {
              include: {
                agent: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: filters.limit,
      skip: filters.offset,
    })

    const formattedBets = bets.map((bet) => {
      const timeRemaining = bet.market.mission.endTime
        ? calculateTimeRemaining(bet.market.mission.endTime)
        : null

      return {
        id: bet.id,
        mission: bet.market.mission.description,
        agent: bet.market.mission.agent.name,
        position: bet.position,
        shares: bet.shares,
        entryPrice: `$${Number(bet.entryPrice).toFixed(2)}`,
        currentPrice: `$${Number(bet.currentPrice).toFixed(2)}`,
        pnl: calculatePnL(bet),
        timeRemaining,
        status: bet.status,
        outcome: bet.outcome,
      }
    })

    return NextResponse.json({
      bets: formattedBets,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
      },
    })
  } catch (error) {
    console.error("Error fetching bets:", error)
    return NextResponse.json({ error: "Failed to fetch bets" }, { status: 500 })
  }
}

function calculatePnL(bet: any): string {
  if (bet.status === "SETTLED" && bet.pnl) {
    const pnl = Number(bet.pnl)
    return pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`
  }

  // Calculate unrealized PnL
  const priceDiff = Number(bet.currentPrice) - Number(bet.entryPrice)
  const pnl = priceDiff * bet.shares
  return pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`
}

function calculateTimeRemaining(endTime: Date): string {
  const now = new Date()
  const end = new Date(endTime)
  const diff = Math.floor((end.getTime() - now.getTime()) / 1000)

  if (diff <= 0) {
    return "00:00"
  }

  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

