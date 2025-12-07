import { ArenaHeader } from "@/components/arena/arena-header"
import { AgentView } from "@/components/arena/agent-view"
import { ChainOfThought } from "@/components/arena/chain-of-thought"
import { PredictionMarket } from "@/components/arena/prediction-market"
import { GodModeWhisper } from "@/components/arena/god-mode-whisper"

export default async function ArenaPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--glow-cyan)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        {/* Mission Header */}
        <ArenaHeader agentId={agentId} />

        {/* 3-Column Layout */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {/* Left Column - Agent View */}
          <AgentView />

          {/* Middle Column - Chain of Thought */}
          <ChainOfThought />

          {/* Right Column - Prediction Market */}
          <PredictionMarket />
        </div>

        {/* God Mode Section */}
        <GodModeWhisper />
      </div>
    </div>
  )
}
