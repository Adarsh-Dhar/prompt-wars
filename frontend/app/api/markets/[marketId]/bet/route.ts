import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { placeBetSchema } from "@/lib/validations"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params
    const body = await request.json()
    const validatedData = placeBetSchema.parse(body)

    // Get or create user
    let user = await db.user.findUnique({
      where: { walletAddress: validatedData.walletAddress },
    })

    if (!user) {
      user = await db.user.create({
        data: {
          walletAddress: validatedData.walletAddress,
        },
      })
    }

    // Get market
    const market = await db.market.findUnique({
      where: { id: marketId },
      include: {
        mission: true,
      },
    })

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    if (market.mission.status !== "ACTIVE") {
      return NextResponse.json({ error: "Market is not active" }, { status: 400 })
    }

    // Calculate entry price based on position
    const entryPrice =
      validatedData.position === "MOON" ? market.moonPrice : market.rugPrice

    // Create bet
    const bet = await db.bet.create({
      data: {
        userId: user.id,
        marketId: market.id,
        position: validatedData.position,
        shares: validatedData.shares,
        entryPrice,
        currentPrice: entryPrice,
        status: "ACTIVE",
      },
      include: {
        user: true,
        market: {
          include: {
            mission: true,
          },
        },
      },
    })

    // Create trade record
    await db.trade.create({
      data: {
        marketId: market.id,
        userId: user.id,
        position: validatedData.position,
        shares: validatedData.shares,
        price: entryPrice,
      },
    })

    // Update market volume and participants
    const totalCost = Number(entryPrice) * validatedData.shares
    await db.market.update({
      where: { id: marketId },
      data: {
        totalVolume: {
          increment: totalCost,
        },
        liquidity: {
          increment: totalCost,
        },
        participants: {
          increment: 1,
        },
      },
    })

    // Update prices based on new bet (simple implementation - can be enhanced with proper market maker)
    const newMoonPrice =
      validatedData.position === "MOON"
        ? Number(market.moonPrice) + 0.01
        : Number(market.moonPrice) - 0.01
    const newRugPrice = 1 - newMoonPrice

    await db.market.update({
      where: { id: marketId },
      data: {
        moonPrice: Math.max(0.1, Math.min(0.9, newMoonPrice)),
        rugPrice: Math.max(0.1, Math.min(0.9, newRugPrice)),
      },
    })

    return NextResponse.json({ bet }, { status: 201 })
  } catch (error) {
    console.error("Error placing bet:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 })
  }
}

