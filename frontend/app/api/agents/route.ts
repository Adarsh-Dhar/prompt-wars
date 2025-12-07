import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { agentFiltersSchema, createAgentSchema } from "@/lib/validations"

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = createAgentSchema.parse(body)

    // Check if agent with this name already exists
    const existingAgent = await db.agent.findUnique({
      where: { name: data.name },
    })

    if (existingAgent) {
      return NextResponse.json(
        { error: "Agent with this name already exists" },
        { status: 400 }
      )
    }

    // Create agent with initial stats
    const agent = await db.agent.create({
      data: {
        name: data.name,
        category: data.category,
        status: data.status,
        stats: {
          create: {
            currentPnL: 0,
            compute: 0,
            status: data.status,
          },
        },
      },
      include: {
        stats: true,
      },
    })

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating agent:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
  }
}

