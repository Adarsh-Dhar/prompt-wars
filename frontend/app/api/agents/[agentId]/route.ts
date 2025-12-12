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
        stats: true,
        missions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error: any) {
    console.error("Error fetching agent:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent", details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const body = await request.json()

    const agent = await db.agent.update({
      where: { id: agentId },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        stats: true,
      },
    })

    return NextResponse.json({ 
      message: "Agent updated successfully",
      agent 
    })
  } catch (error: any) {
    console.error("Error updating agent:", error)
    return NextResponse.json(
      { error: "Failed to update agent", details: error.message },
      { status: 500 }
    )
  }
}