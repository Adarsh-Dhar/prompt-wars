import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPrices } from "@/lib/solana/amm"

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

    const reserveYes = Number(market.reserveYes || 0)
    const reserveNo = Number(market.reserveNo || 0)
    const { priceYes, priceNo } = getPrices(reserveYes, reserveNo)
    const moonOdds = priceYes * 100
    const rugOdds = priceNo * 100

    return NextResponse.json({
      market: {
        ...market,
        moonPrice: Number(priceYes),
        rugPrice: Number(priceNo),
        totalVolume: Number(market.totalVolume),
        liquidity: Number(market.liquidity),
        minBet: Number(market.minBet),
        maxBet: market.maxBet ? Number(market.maxBet) : null,
        reserveYes,
        reserveNo,
        feeBps: market.feeBps,
        odds: {
          moon: Math.round(moonOdds),
          rug: Math.round(rugOdds),
        },
        mints: {
          yesMint: market.yesMint,
          noMint: market.noMint,
          lpMint: market.lpMint,
          poolAuthority: market.poolAuthority,
          poolYesAccount: market.poolYesAccount,
          poolNoAccount: market.poolNoAccount,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching market:", error)
    return NextResponse.json({ error: "Failed to fetch market" }, { status: 500 })
  }
}

