import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get("sortBy") || "winnings"
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Invalid limit parameter. Must be between 1 and 1000" },
        { status: 400 }
      )
    }

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
    // Add retry logic for connection issues
    let users: Array<{
      id: string
      walletAddress: string
      totalWinnings: any
      winRate: any
      totalBets: number
    }> = []
    let retries = 3
    let lastError: any = null
    
    while (retries > 0) {
      try {
        users = await db.user.findMany({
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
        break // Success, exit retry loop
      } catch (error: any) {
        lastError = error
        retries--
        
        // Check for connection-related errors (P1017, P1001, etc.)
        const isConnectionError = 
          error.code === "P1017" || // Server has closed the connection
          error.code === "P1001" || // Can't reach database server
          error.code === "P1008" || // Operations timed out
          error.code === "ETIMEDOUT" || // Connection timeout
          error.message?.toLowerCase().includes("connection") ||
          error.message?.toLowerCase().includes("timeout") ||
          error.message?.toLowerCase().includes("terminated") ||
          error.message?.includes("ECONNREFUSED") ||
          error.message?.includes("ENOTFOUND") ||
          error.cause?.message?.toLowerCase().includes("timeout") ||
          error.cause?.message?.toLowerCase().includes("connection")
        
        if (isConnectionError && retries > 0) {
          // Connection error, wait and retry with exponential backoff
          const delay = (4 - retries) * 2000 // 2s, 4s, 6s delays
          console.warn(`Database connection error (${error.code || "unknown"}), retrying in ${delay}ms... (${retries} attempts left)`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        
        // If not a connection error or out of retries, throw
        throw error
      }
    }
    
    // If we exhausted retries and still have an error, throw it
    // Only throw if we actually got an error (not just empty results)
    if (lastError && retries === 0) {
      throw lastError
    }

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
      leaderboard: leaderboard || [],
      sortBy,
      limit,
    })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Provide more helpful error messages
    let userMessage = "Failed to fetch leaderboard"
    if (errorMessage.includes("timeout") || errorMessage.includes("Connection terminated")) {
      userMessage = "Database connection timeout. The database may not be running. Please start it with: docker compose up -d (in the frontend directory)"
    } else if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
      userMessage = "Cannot connect to database. Please verify DATABASE_URL and ensure the database is running. Start with: docker compose up -d"
    }
    
    return NextResponse.json(
      { 
        error: userMessage, 
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

