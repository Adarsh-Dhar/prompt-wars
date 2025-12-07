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
      limit: searchParams.get("limit") || "20",
      offset: searchParams.get("offset") || "0",
    })

    let user = await db.user.findUnique({
      where: { walletAddress: wallet },
    })

    if (!user) {
      return NextResponse.json({
        history: [],
        pagination: { limit: filters.limit, offset: filters.offset },
      })
    }

    // Get settled bets (history)
    const bets = await db.bet.findMany({
      where: {
        userId: user.id,
        status: "SETTLED",
      },
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

    const formattedHistory = bets.map((bet) => ({
      id: bet.id,
      mission: bet.market.mission.description,
      agent: bet.market.mission.agent.name,
      position: bet.position,
      shares: bet.shares,
      outcome: bet.outcome,
      pnl: bet.pnl ? (Number(bet.pnl) >= 0 ? `+$${Number(bet.pnl).toFixed(2)}` : `-$${Math.abs(Number(bet.pnl)).toFixed(2)}`) : "$0.00",
      date: bet.updatedAt.toISOString().split("T")[0],
    }))

    return NextResponse.json({
      history: formattedHistory,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
      },
    })
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}

