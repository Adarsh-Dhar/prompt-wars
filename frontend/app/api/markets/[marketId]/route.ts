import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPrices } from "@/lib/solana/amm"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const logPrefix = `[API /api/markets/[marketId]]`
  console.log(`${logPrefix} Starting request`)
  
  try {
    const { marketId } = await params
    console.log(`${logPrefix} Market ID: ${marketId}`)

    console.log(`${logPrefix} Querying database for market...`)
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
      console.error(`${logPrefix} Market not found in database: ${marketId}`)
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    console.log(`${logPrefix} Market found:`, {
      id: market.id,
      statement: market.statement,
      missionId: market.missionId,
      agentId: market.mission?.agent?.id,
      agentName: market.mission?.agent?.name,
    })

    const reserveYes = Number(market.reserveYes || 0)
    const reserveNo = Number(market.reserveNo || 0)
    console.log(`${logPrefix} Reserves - YES: ${reserveYes}, NO: ${reserveNo}`)
    
    const { priceYes, priceNo } = getPrices(reserveYes, reserveNo)
    const moonOdds = priceYes * 100
    const rugOdds = priceNo * 100
    console.log(`${logPrefix} Prices - YES: ${priceYes}, NO: ${priceNo}`)

    const marketPda = (market as any).marketPda ?? null

    const response = {
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
        marketPda,
      },
    }
    
    console.log(`${logPrefix} Response prepared:`, {
      marketId: market.id,
      marketPda: marketPda || "null",
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error(`${logPrefix} Fatal error fetching market:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      marketId: await params.then(p => p.marketId).catch(() => "unknown"),
    })
    return NextResponse.json({ 
      error: "Failed to fetch market",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

