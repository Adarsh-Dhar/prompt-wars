import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

const registerAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  category: z.string().min(1, "Category is required"),
  url: z.string().url("Valid URL is required"),
  chainOfThoughtEndpoint: z.string().url("Valid chain-of-thought endpoint URL is required").optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = registerAgentSchema.parse(body)

    // Check if agent with this name already exists
    const existingAgent = await db.agent.findUnique({
      where: { name: data.name },
    })

    if (existingAgent) {
      return NextResponse.json(
        { 
          error: "Agent with this name already exists in database",
          existingAgentId: existingAgent.id,
          message: "You can still proceed with blockchain staking using a different name or the same name on-chain"
        },
        { status: 400 }
      )
    }

    // Verify agent endpoint is reachable (more lenient validation)
    try {
      const response = await fetch(data.url, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      })
      
      // Accept any response that indicates the server is running
      // This includes 200, 402, 404, 500, etc. - as long as we get a response
      console.log(`Agent endpoint ${data.url} returned status: ${response.status}`)
    } catch (error: any) {
      // Only fail if we can't connect at all (network error, timeout, etc.)
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return NextResponse.json(
          { error: "Agent endpoint is not reachable - please ensure the server is running" },
          { status: 400 }
        )
      }
      // For other errors, log but continue (server might be running but having issues)
      console.warn(`Agent endpoint validation warning:`, error.message)
    }

    // If chain-of-thought endpoint is provided, verify it's reachable (lenient)
    if (data.chainOfThoughtEndpoint) {
      try {
        const response = await fetch(data.chainOfThoughtEndpoint, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        })
        
        console.log(`Chain-of-thought endpoint ${data.chainOfThoughtEndpoint} returned status: ${response.status}`)
      } catch (error: any) {
        // Only fail for network connectivity issues
        if (error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          return NextResponse.json(
            { error: "Chain-of-thought endpoint is not reachable - please ensure the server is running" },
            { status: 400 }
          )
        }
        console.warn(`Chain-of-thought endpoint validation warning:`, error.message)
      }
    }

    // Create agent with initial stats
    const agent = await db.agent.create({
      data: {
        name: data.name,
        category: data.category,
        url: data.url,
        chainOfThoughtEndpoint: data.chainOfThoughtEndpoint,
        status: "IDLE",
        stats: {
          create: {
            currentPnL: 0,
            compute: 0,
            status: "IDLE",
          },
        },
      },
      include: {
        stats: true,
      },
    })

    return NextResponse.json({ 
      message: "Agent registered successfully",
      agent 
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error registering agent:", error)
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ 
      error: "Failed to register agent",
      details: error.message 
    }, { status: 500 })
  }
}