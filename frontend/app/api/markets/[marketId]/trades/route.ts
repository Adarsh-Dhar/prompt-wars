import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    const trades = await db.trade.findMany({
      where: { marketId },
      include: {
        user: true,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: Math.min(limit, 100),
    })

    // Format trades for frontend
    const formattedTrades = trades.map((trade) => ({
      id: trade.id,
      user: trade.user.walletAddress.slice(0, 6) + "..." + trade.user.walletAddress.slice(-4),
      action: "bought", // Can be enhanced to track buy/sell
      shares: trade.shares,
      type: trade.position,
      time: formatTimeAgo(trade.timestamp),
      price: Number(trade.price),
    }))

    return NextResponse.json({ trades: formattedTrades })
  } catch (error) {
    console.error("Error fetching trades:", error)
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 })
  }
}

function formatTimeAgo(timestamp: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - timestamp.getTime()) / 1000)

  if (diff < 60) {
    return `${diff}s ago`
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`
  } else {
    return `${Math.floor(diff / 3600)}h ago`
  }
}

