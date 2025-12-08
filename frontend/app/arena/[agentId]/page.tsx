import { ArenaHeader } from "@/components/arena/arena-header"
import { AgentView } from "@/components/arena/agent-view"
import { ChainOfThought } from "@/components/arena/chain-of-thought"
import { PredictionMarket } from "@/components/arena/prediction-market"
import { GodModeWhisper } from "@/components/arena/god-mode-whisper"
import Link from "next/link"

async function getArenaData(agentId: string) {
  try {
    // Use relative URL for server-side fetching
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/arena/${agentId}`, { 
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      }
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error(`Failed to fetch arena data: ${res.status} ${res.statusText}`, errorData)
      throw new Error(`Failed to fetch arena data: ${res.status} ${errorData.error || res.statusText}`)
    }
    return await res.json()
  } catch (error) {
    console.error("Error fetching arena data:", error)
    return null
  }
}

export default async function ArenaPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  const arenaData = await getArenaData(agentId)

  if (!arenaData) {
    return (
      <div className="relative min-h-screen">
        <div className="relative mx-auto max-w-7xl px-4 py-6">
          <div className="text-center font-mono text-sm text-muted-foreground py-12">
            Failed to load arena data
          </div>
        </div>
      </div>
    )
  }

  const { agent, mission, market, stats, logs } = arenaData

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--glow-cyan)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        {/* Mission Header */}
        <ArenaHeader
          agentId={agentId}
          agentName={agent?.name}
          mission={mission}
          market={market}
          stats={stats}
        />

        <div className="mb-4 flex justify-end">
          <Link
            href={`/arena/${agentId}/markets`}
            className="neon-glow-cyan inline-flex items-center justify-center rounded-md border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--neon-cyan)] transition hover:bg-[var(--neon-cyan)]/20"
          >
            View all markets
          </Link>
        </div>

        {/* 3-Column Layout */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {/* Left Column - Agent View */}
          <AgentView agentName={agent?.name} stats={stats} />

          {/* Middle Column - Chain of Thought */}
          <ChainOfThought agentId={agentId} initialLogs={logs} />

          {/* Right Column - Prediction Market */}
          <PredictionMarket market={market} agentId={agentId} />
        </div>

        {/* God Mode Section */}
        <GodModeWhisper />
      </div>
    </div>
  )
}
