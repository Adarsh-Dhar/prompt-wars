import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { marketFiltersSchema } from "@/lib/validations"
import { getPrices } from "@/lib/solana/amm"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = marketFiltersSchema.parse({
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || "20",
      offset: searchParams.get("offset") || "0",
    })

    const where: any = {}

    if (filters.category || filters.status) {
      where.mission = {}
      if (filters.category) {
        where.mission.category = filters.category
      }
      if (filters.status) {
        where.mission.status = filters.status
      }
    }

    const markets = await db.market.findMany({
      where,
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
      },
      orderBy: {
        createdAt: "desc",
      },
      take: filters.limit,
      skip: filters.offset,
    })

    // Calculate odds from current prices
    const marketsWithOdds = markets.map((market) => {
      const reserveYes = Number(market.reserveYes || 0)
      const reserveNo = Number(market.reserveNo || 0)
      const { priceYes, priceNo } = getPrices(reserveYes, reserveNo)
      const moonOdds = priceYes * 100
      const rugOdds = priceNo * 100
      return {
        ...market,
        statement: market.statement,
        description: market.description,
        closesAt: market.closesAt,
        odds: {
          moon: Math.round(moonOdds),
          rug: Math.round(rugOdds),
        },
        moonPrice: Number(priceYes),
        rugPrice: Number(priceNo),
        totalVolume: Number(market.totalVolume),
        liquidity: Number(market.liquidity),
        minBet: Number(market.minBet),
        maxBet: market.maxBet ? Number(market.maxBet) : null,
        reserveYes,
        reserveNo,
        feeBps: market.feeBps,
      }
    })

    return NextResponse.json({
      markets: marketsWithOdds,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
      },
    })
  } catch (error) {
    console.error("Error fetching markets:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error("Error details:", errorDetails)
    return NextResponse.json(
      { error: "Failed to fetch markets", details: errorMessage },
      { status: 500 }
    )
  }
}

