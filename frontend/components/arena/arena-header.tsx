"use client"

import { useEffect, useState, useRef } from "react"
import { Clock, Users, TrendingUp } from "lucide-react"
import { getPaymentToken } from "@/lib/agent-server"

interface ArenaHeaderProps {
  agentId: string
  agentName?: string
  mission?: any
  market?: any
  stats?: any
}

export function ArenaHeader({ agentId, agentName, mission, market, stats }: ArenaHeaderProps) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [hasPaid, setHasPaid] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const lastTokenRef = useRef<string | null>(null)

  // Check payment status and reset countdown when payment detected
  useEffect(() => {
    const checkPayment = () => {
      const token = getPaymentToken()
      const paid = !!token
      
      // If payment token changed (new payment) or we just got paid, reset countdown
      if (paid && (token !== lastTokenRef.current || !hasPaid)) {
        setCountdown(10)
        lastTokenRef.current = token
      } else if (!paid) {
        lastTokenRef.current = null
      }
      
      setHasPaid(paid)
    }

    // Check payment status initially and on interval
    checkPayment()
    const paymentCheckInterval = setInterval(checkPayment, 500) // Check every 500ms

    return () => clearInterval(paymentCheckInterval)
  }, [hasPaid])

  // 10-second countdown timer (only when paid)
  useEffect(() => {
    if (!hasPaid) {
      return
    }

    if (countdown <= 0) {
      return // Stop at 0
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0 // Stop at 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [hasPaid, countdown])

  const formatTime = (seconds: number) => {
    const secs = seconds % 60
    return `00:${secs.toString().padStart(2, "0")}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
    return `$${volume.toFixed(0)}`
  }

  const viewers = stats?.viewers || market?.participants || 0
  const volume = market?.totalVolume || 0

  return (
    <div className="mb-6 rounded-lg border border-border/50 bg-card/80 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Mission title */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-red)]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--neon-red)]">
              {mission?.status === "ACTIVE" ? "Live Mission" : mission?.status || "OFFLINE"}
            </span>
          </div>
          <h1 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground md:text-xl">
            Mission: {mission?.description || "No active mission"}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Agent ID: {agentId.toUpperCase()} • {agentName || "UNKNOWN"}
          </p>
        </div>

        {/* Timer and stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded border border-border/50 bg-background px-3 py-2">
            <Users className="h-4 w-4 text-[var(--neon-magenta)]" />
            <span className="font-mono text-sm text-foreground">{viewers.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 rounded border border-border/50 bg-background px-3 py-2">
            <TrendingUp className="h-4 w-4 text-[var(--neon-lime)]" />
            <span className="font-mono text-sm text-foreground">{formatVolume(volume)}</span>
          </div>
          {hasPaid && (
            <div className="neon-glow-cyan flex items-center gap-2 rounded border border-[var(--neon-cyan)] bg-background px-4 py-2">
              <Clock className="h-4 w-4 text-[var(--neon-cyan)]" />
              <span className="font-mono text-lg font-bold tabular-nums text-[var(--neon-cyan)]">
                T-{formatTime(countdown)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}