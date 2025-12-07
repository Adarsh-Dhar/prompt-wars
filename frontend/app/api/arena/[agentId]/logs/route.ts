import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logFiltersSchema } from "@/lib/validations"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const { searchParams } = new URL(request.url)
    const filters = logFiltersSchema.parse({
      type: searchParams.get("type") || undefined,
      limit: searchParams.get("limit") || "50",
    })

    const where: any = {
      agentId,
    }

    if (filters.type) {
      where.type = filters.type
    }

    const logs = await db.log.findMany({
      where,
      orderBy: {
        timestamp: "desc",
      },
      take: filters.limit,
    })

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      type: log.type,
      content: log.content,
      timestamp: log.timestamp,
      time: formatTime(log.timestamp),
    }))

    return NextResponse.json({ logs: formattedLogs })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

function formatTime(timestamp: Date): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${hours}:${minutes}:${seconds}`
}

