import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params

    let user = await db.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        bets: {
          include: {
            market: {
              include: {
                mission: {
                  include: {
                    agent: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      // Create user if doesn't exist
      user = await db.user.create({
        data: {
          walletAddress: wallet,
        },
        include: {
          bets: {
            include: {
              market: {
                include: {
                  mission: {
                    include: {
                      agent: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    }

    // Calculate stats from bet history
    const settledBets = user.bets.filter((bet) => bet.status === "SETTLED")
    const wonBets = settledBets.filter((bet) => bet.outcome === "WON")
    const winRate = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0
    
    // Calculate total winnings from settled bets
    const calculatedTotalWinnings = settledBets.reduce((sum, bet) => {
      return sum + Number(bet.pnl || 0)
    }, 0)

    // Update user stats if they've changed
    const currentTotalWinnings = Number(user.totalWinnings)
    const currentWinRate = Number(user.winRate || 0)
    
    if (
      currentTotalWinnings !== calculatedTotalWinnings ||
      currentWinRate !== winRate ||
      user.totalBets !== user.bets.length
    ) {
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: {
          totalWinnings: calculatedTotalWinnings,
          winRate: winRate,
          totalBets: user.bets.length,
        },
      })
      
      // Update the user object for response
      user.totalWinnings = updatedUser.totalWinnings
      user.winRate = updatedUser.winRate
      user.totalBets = updatedUser.totalBets
    }

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        totalWinnings: Number(user.totalWinnings),
        winRate: Number(user.winRate || 0),
        totalBets: user.totalBets,
      },
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

