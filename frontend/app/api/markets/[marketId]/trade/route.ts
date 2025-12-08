import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tradeSchema } from "@/lib/validations"
import { getPrices, getTradeQuote } from "@/lib/solana/amm"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params
    const body = await request.json()
    const data = tradeSchema.parse(body)

    const market = await db.market.findUnique({
      where: { id: marketId },
    })

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    if (market.state !== "ACTIVE") {
      return NextResponse.json({ error: "Market is not active" }, { status: 400 })
    }

    const minBet = Number(market.minBet || 0)
    const maxBet = market.maxBet ? Number(market.maxBet) : null
    if (data.amount < minBet) {
      return NextResponse.json({ error: `Minimum trade is ${minBet}` }, { status: 400 })
    }
    if (maxBet && data.amount > maxBet) {
      return NextResponse.json({ error: `Maximum trade is ${maxBet}` }, { status: 400 })
    }

    const now = Date.now()
    if (new Date(market.closesAt).getTime() <= now) {
      await db.market.update({
        where: { id: marketId },
        data: { state: "FROZEN" },
      })
      return NextResponse.json({ error: "Market is closed" }, { status: 400 })
    }

    const state = {
      reserveYes: Number(market.reserveYes || 0),
      reserveNo: Number(market.reserveNo || 0),
      feeBps: market.feeBps,
    }

    const quote = getTradeQuote(data.side, data.amount, state)
    if (!isFinite(quote.sharesOut) || quote.sharesOut <= 0) {
      return NextResponse.json({ error: "Trade too large for current liquidity" }, { status: 400 })
    }

    // Upsert user by wallet
    let user = await db.user.findUnique({
      where: { walletAddress: data.walletAddress },
    })
    if (!user) {
      user = await db.user.create({
        data: { walletAddress: data.walletAddress },
      })
    }

    const averagePrice = data.amount / quote.sharesOut
    const position = data.side === "YES" ? "MOON" : "RUG"

    const bet = await db.bet.create({
      data: {
        userId: user.id,
        marketId: market.id,
        position,
        shares: Math.round(quote.sharesOut),
        entryPrice: averagePrice,
        currentPrice: averagePrice,
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
    })

    await db.trade.create({
      data: {
        marketId: market.id,
        userId: user.id,
        position,
        shares: Math.round(quote.sharesOut),
        price: averagePrice,
      },
    })

    const { priceYes, priceNo } = getPrices(quote.newReserveYes, quote.newReserveNo)

    const updatedMarket = await db.market.update({
      where: { id: marketId },
      data: {
        reserveYes: quote.newReserveYes,
        reserveNo: quote.newReserveNo,
        moonPrice: priceYes,
        rugPrice: priceNo,
        totalVolume: {
          increment: data.amount,
        },
        liquidity: quote.newReserveYes + quote.newReserveNo,
        participants: {
          increment: 1,
        },
      },
    })

    return NextResponse.json({
      trade: {
        id: bet.id,
        position,
        shares: Math.round(quote.sharesOut),
        price: averagePrice,
      },
      market: {
        ...updatedMarket,
        moonPrice: priceYes,
        rugPrice: priceNo,
        reserveYes: quote.newReserveYes,
        reserveNo: quote.newReserveNo,
      },
      quote,
    })
  } catch (error) {
    console.error("Error executing trade:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to process trade" }, { status: 500 })
  }
}
