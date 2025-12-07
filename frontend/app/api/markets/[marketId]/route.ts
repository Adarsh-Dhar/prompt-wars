import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params

    const market = await db.market.findUnique({
      where: { id: marketId },
      include: {
        mission: {
          include: {
            agent: {
              include: {
                stats: true,
              },
            },
          },
        },
        bets: {
          where: {
            status: "ACTIVE",
          },
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
        trades: {
          include: {
            user: true,
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 100,
        },
        _count: {
          select: {
            bets: true,
            trades: true,
          },
        },
      },
    })

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    // Calculate odds
    const moonOdds = Number(market.moonPrice) * 100
    const rugOdds = Number(market.rugPrice) * 100

    return NextResponse.json({
      market: {
        ...market,
        odds: {
          moon: Math.round(moonOdds),
          rug: Math.round(rugOdds),
        },
      },
    })
  } catch (error) {
    console.error("Error fetching market:", error)
    return NextResponse.json({ error: "Failed to fetch market" }, { status: 500 })
  }
}

