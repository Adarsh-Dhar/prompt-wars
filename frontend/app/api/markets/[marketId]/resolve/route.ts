import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveSchema } from "@/lib/validations"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params
    const body = await request.json()
    const data = resolveSchema.parse(body)

    const market = await db.market.findUnique({ where: { id: marketId } })
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    if (market.state === "RESOLVED") {
      return NextResponse.json({ error: "Market already resolved" }, { status: 400 })
    }

    const winningPosition = data.outcome === "YES" ? "MOON" : "RUG"
    const resolvedBy = data.resolvedBy || data.walletAddress

    // Mark bets
    await db.bet.updateMany({
      where: { marketId },
      data: {
        status: "SETTLED",
        outcome: "LOST",
      },
    })

    await db.bet.updateMany({
      where: { marketId, position: winningPosition },
      data: {
        outcome: "WON",
      },
    })

    const updatedMarket = await db.market.update({
      where: { id: marketId },
      data: {
        state: "RESOLVED",
        outcome: data.outcome,
        resolvedAt: new Date(),
        resolvedBy,
        resolutionTx: data.resolutionTx,
      },
    })

    return NextResponse.json({ market: updatedMarket })
  } catch (error) {
    console.error("Error resolving market:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to resolve market" }, { status: 500 })
  }
}
