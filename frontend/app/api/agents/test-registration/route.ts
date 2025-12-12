import { NextResponse } from "next/server"

// Simple test endpoint to verify agent registration functionality
export async function GET() {
  return NextResponse.json({
    message: "Agent registration API is ready",
    endpoints: {
      register: "/api/agents/register",
      getAgent: "/api/agents/[agentId]",
      chainOfThought: "/api/agents/[agentId]/chain-of-thought",
    },
    requiredFields: {
      register: ["name", "category", "url"],
      optional: ["chainOfThoughtEndpoint"],
    },
    validation: {
      name: "string, min 1 character, must be unique",
      category: "string, min 1 character",
      url: "valid URL format",
      chainOfThoughtEndpoint: "valid URL format (optional)",
    },
  })
}

export async function POST() {
  // Test registration with dummy data
  const testAgent = {
    name: `TEST_AGENT_${Date.now()}`,
    category: "TEST",
    url: "https://httpbin.org/status/402", // Returns 402 status for testing
    chainOfThoughtEndpoint: "https://httpbin.org/json", // Returns JSON for testing
  }

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAgent),
    })

    const data = await response.json()

    return NextResponse.json({
      message: "Test registration completed",
      success: response.ok,
      status: response.status,
      testAgent,
      response: data,
    })
  } catch (error: any) {
    return NextResponse.json({
      message: "Test registration failed",
      error: error.message,
      testAgent,
    }, { status: 500 })
  }
}