"use client"

import { useEffect, useState } from "react"
import { Clock, Users, TrendingUp } from "lucide-react"

interface ArenaHeaderProps {
  agentId: string
}

export function ArenaHeader({ agentId }: ArenaHeaderProps) {
  const [timeLeft, setTimeLeft] = useState(45 * 60 + 22) // 45:22 in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="mb-6 rounded-lg border border-border/50 bg-card/80 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Mission title */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-red)]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--neon-red)]">Live Mission</span>
          </div>
          <h1 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground md:text-xl">
            Mission: Turn $10 into $100 on pump.fun in 60 mins
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">Agent ID: {agentId.toUpperCase()} • ALPHA-7</p>
        </div>

        {/* Timer and stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded border border-border/50 bg-background px-3 py-2">
            <Users className="h-4 w-4 text-[var(--neon-magenta)]" />
            <span className="font-mono text-sm text-foreground">1,247</span>
          </div>
          <div className="flex items-center gap-2 rounded border border-border/50 bg-background px-3 py-2">
            <TrendingUp className="h-4 w-4 text-[var(--neon-lime)]" />
            <span className="font-mono text-sm text-foreground">$12.4K</span>
          </div>
          <div className="neon-glow-cyan flex items-center gap-2 rounded border border-[var(--neon-cyan)] bg-background px-4 py-2">
            <Clock className="h-4 w-4 text-[var(--neon-cyan)]" />
            <span className="font-mono text-lg font-bold tabular-nums text-[var(--neon-cyan)]">
              T-{formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
