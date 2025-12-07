import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { marketFiltersSchema } from "@/lib/validations"

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
      const moonOdds = Number(market.moonPrice) * 100
      const rugOdds = Number(market.rugPrice) * 100
      return {
        ...market,
        odds: {
          moon: Math.round(moonOdds),
          rug: Math.round(rugOdds),
        },
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

