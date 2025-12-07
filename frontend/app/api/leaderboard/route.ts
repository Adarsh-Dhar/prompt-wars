import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get("sortBy") || "winnings"
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    // Validate sortBy parameter
    const validSortBy = ["winnings", "winRate", "bets"]
    if (!validSortBy.includes(sortBy)) {
      return NextResponse.json(
        { error: "Invalid sortBy parameter. Must be one of: winnings, winRate, bets" },
        { status: 400 }
      )
    }

    // Build orderBy clause based on sortBy
    let orderBy: any = {}
    if (sortBy === "winnings") {
      orderBy = { totalWinnings: "desc" }
    } else if (sortBy === "winRate") {
      // Order by winRate descending, nulls will be sorted last by default in Prisma
      orderBy = { winRate: "desc" }
    } else if (sortBy === "bets") {
      orderBy = { totalBets: "desc" }
    }

    // Fetch users with their stats
    let users = await db.user.findMany({
      orderBy,
      take: limit * 2, // Fetch more to filter out nulls if needed
      select: {
        id: true,
        walletAddress: true,
        totalWinnings: true,
        winRate: true,
        totalBets: true,
      },
    })

    // For winRate sorting, filter out nulls and sort by totalBets as secondary sort
    if (sortBy === "winRate") {
      users = users
        .filter((user) => user.winRate !== null)
        .sort((a, b) => {
          const rateA = Number(a.winRate)
          const rateB = Number(b.winRate)
          if (rateA !== rateB) {
            return rateB - rateA // Descending by winRate
          }
          return b.totalBets - a.totalBets // Secondary sort by totalBets
        })
        .slice(0, limit)
    } else {
      users = users.slice(0, limit)
    }

    // Format leaderboard data
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      walletAddress: user.walletAddress,
      totalWinnings: Number(user.totalWinnings),
      winRate: user.winRate ? Number(user.winRate) : null,
      totalBets: user.totalBets,
    }))

    return NextResponse.json({
      leaderboard,
      sortBy,
      limit,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", details: errorMessage },
      { status: 500 }
    )
  }
}

