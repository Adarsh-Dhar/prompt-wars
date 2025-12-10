import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createMarketSchema } from "@/lib/validations"
import { generateMintAddresses, getPrices, initialCpmmState } from "@/lib/solana/amm"
import { randomUUID } from "crypto"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const markets = await db.market.findMany({
      where: {
        mission: {
          agentId,
        },
      },
      include: {
        mission: true,
        _count: {
          select: {
            bets: true,
            trades: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const formatted = markets.map((market) => {
      const reserveYes = Number(market.reserveYes || 0)
      const reserveNo = Number(market.reserveNo || 0)
      const { priceYes, priceNo } = getPrices(reserveYes, reserveNo)
      return {
        ...market,
        moonPrice: priceYes,
        rugPrice: priceNo,
        totalVolume: Number(market.totalVolume),
        liquidity: Number(market.liquidity),
        minBet: Number(market.minBet),
        maxBet: market.maxBet ? Number(market.maxBet) : null,
        reserveYes,
        reserveNo,
        odds: {
          moon: Math.round(priceYes * 100),
          rug: Math.round(priceNo * 100),
        },
      }
    })

    return NextResponse.json({ markets: formatted })
  } catch (error) {
    console.error("Error listing agent markets:", error)
    return NextResponse.json({ error: "Failed to list markets" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const body = await request.json()

    try {
      // Validate and coerce incoming body; log sanitized payload for debugging
      const data = createMarketSchema.parse(body)
      console.info("Create market request", {
        agentId,
        walletAddress: data.walletAddress,
        initialLiquidity: data.initialLiquidity,
        minBet: data.minBet,
        maxBet: data.maxBet,
        feeBps: data.feeBps,
        closesAt: data.closesAt,
        txSignature: data.txSignature,
      })

      const agent = await db.agent.findUnique({ where: { id: agentId } })
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 })
      }

      const mission = await db.mission.create({
        data: {
          agentId,
          description: data.description || data.statement,
          startTime: new Date(),
          endTime: new Date(data.closesAt),
          status: "ACTIVE",
          category: agent.category || "CUSTOM",
        },
      })

      const marketPda = (body as any).marketPda ?? `dummy-${randomUUID().replace(/-/g, "")}`
      const mintAddresses = (body as any).mints ?? generateMintAddresses()
      const poolVault = (body as any).mints?.poolVault ?? `dummy-${randomUUID().replace(/-/g, "")}`
      const cpmm = initialCpmmState(data.initialLiquidity, data.feeBps)
      const { priceYes, priceNo } = getPrices(cpmm.reserveYes, cpmm.reserveNo)

      const market = await db.market.create({
        data: {
          missionId: mission.id,
          statement: data.statement,
          description: data.description,
          closesAt: new Date(data.closesAt),
          moonPrice: priceYes,
          rugPrice: priceNo,
          totalVolume: 0,
          liquidity: data.initialLiquidity,
          minBet: data.minBet,
          maxBet: data.maxBet ?? null,
          feeBps: data.feeBps,
          yesMint: mintAddresses.yesMint,
          noMint: mintAddresses.noMint,
          lpMint: mintAddresses.lpMint,
          poolAuthority: mintAddresses.poolAuthority,
          poolYesAccount: mintAddresses.poolYesAccount,
          poolNoAccount: mintAddresses.poolNoAccount,
          poolVault,
          marketPda,
          reserveYes: cpmm.reserveYes,
          reserveNo: cpmm.reserveNo,
        },
        include: {
          mission: true,
        },
      })

      const response = {
        ...market,
        moonPrice: Number(priceYes),
        rugPrice: Number(priceNo),
        totalVolume: Number(market.totalVolume),
        liquidity: Number(market.liquidity),
        minBet: Number(market.minBet),
        maxBet: market.maxBet ? Number(market.maxBet) : null,
        feeBps: market.feeBps,
        reserveYes: Number(market.reserveYes),
        reserveNo: Number(market.reserveNo),
        odds: {
          moon: Math.round(Number(priceYes) * 100),
          rug: Math.round(Number(priceNo) * 100),
        },
        mints: {
          yesMint: market.yesMint,
          noMint: market.noMint,
          lpMint: market.lpMint,
          poolAuthority: market.poolAuthority,
          poolYesAccount: market.poolYesAccount,
          poolNoAccount: market.poolNoAccount,
          poolVault,
          marketPda,
        },
      }

      return NextResponse.json({ market: response }, { status: 201 })
    } catch (zerr) {
      console.error("Create market validation error:", zerr, "raw body:", body)
      if (zerr instanceof Error && zerr.name === "ZodError") {
        return NextResponse.json({ error: zerr.message || "Invalid request data" }, { status: 400 })
      }
      throw zerr
    }
  } catch (error) {
    console.error("Error creating market:", error)
    return NextResponse.json({ error: "Failed to create market" }, { status: 500 })
  }
}
