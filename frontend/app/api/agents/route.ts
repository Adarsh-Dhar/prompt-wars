import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { agentFiltersSchema } from "@/lib/validations"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = agentFiltersSchema.parse({
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
    })

    const where: any = {}
    if (filters.category) {
      where.category = filters.category
    }
    if (filters.status) {
      where.status = filters.status
    }

    const agents = await db.agent.findMany({
      where,
      include: {
        missions: {
          where: {
            status: "ACTIVE",
          },
          include: {
            market: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        stats: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ agents })
  } catch (error) {
    console.error("Error fetching agents:", error)
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 })
  }
}

