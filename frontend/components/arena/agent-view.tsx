"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Battery, Activity, TrendingUp } from "lucide-react"

interface AgentViewProps {
  agentName?: string
  stats?: any
}

export function AgentView({ agentName, stats }: AgentViewProps) {
  const currentPnL = stats?.currentPnL || 0
  const compute = stats?.compute || 0
  const status = stats?.status || "IDLE"

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : ""
    return `${sign}$${pnl.toFixed(2)}`
  }

  return (
    <div className="space-y-4">
      {/* Live Feed */}
      <Card className="overflow-hidden border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 py-3">
          <CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)]">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-red)]" />
            Live Moddio Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="scanline relative aspect-video w-full overflow-hidden bg-terminal-bg">
            <img
              src="/cyberpunk-neon-trading-terminal-interface-dark-fut.jpg"
              alt="Live agent feed"
              className="h-full w-full object-cover opacity-80"
            />
            {/* Overlay effects */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-4 left-4 rounded bg-background/80 px-2 py-1">
              <span className="font-mono text-xs text-[var(--neon-cyan)]">
                FEED://MODDIO-{agentName?.toUpperCase() || "UNKNOWN"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Stats */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 py-3">
          <CardTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
            Agent Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--neon-lime)]" />
                <span className="font-mono text-xs uppercase text-muted-foreground">Status</span>
              </div>
              <span className="rounded bg-[var(--neon-lime)]/20 px-2 py-0.5 font-mono text-xs font-bold text-[var(--neon-lime)]">
                {status.toUpperCase()}
              </span>
            </div>

            {/* PnL */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--neon-green)]" />
                <span className="font-mono text-xs uppercase text-muted-foreground">Current PnL</span>
              </div>
              <span
                className={`font-mono text-sm font-bold ${
                  currentPnL >= 0 ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                }`}
              >
                {formatPnL(currentPnL)}
              </span>
            </div>

            {/* Battery/Compute */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-[var(--neon-cyan)]" />
                  <span className="font-mono text-xs uppercase text-muted-foreground">Compute</span>
                </div>
                <span className="font-mono text-xs text-[var(--neon-cyan)]">{compute.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-[var(--neon-cyan)] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, compute))}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
