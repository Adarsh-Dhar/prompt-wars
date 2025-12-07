import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params

    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        missions: {
          include: {
            market: {
              include: {
                bets: {
                  where: {
                    status: "ACTIVE",
                  },
                  take: 10,
                  orderBy: {
                    createdAt: "desc",
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        stats: true,
        logs: {
          where: {
            type: "PUBLIC",
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 20,
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 })
  }
}

