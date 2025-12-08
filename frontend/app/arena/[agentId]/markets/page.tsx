import Link from "next/link"

async function getAgentMarkets(agentId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/arena/${agentId}/markets`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) {
    return null
  }

  return res.json()
}

export default async function AgentMarketsPage({
  params,
}: {
  params: { agentId: string }
}) {
  const { agentId } = params
  const data = await getAgentMarkets(agentId)

  if (!data) {
    return (
      <div className="relative min-h-screen">
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <div className="rounded border border-border/60 bg-card/70 p-6 text-center font-mono text-sm text-muted-foreground">
            Failed to load markets for this agent.
          </div>
        </div>
      </div>
    )
  }

  const markets = data.markets || []

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--glow-cyan)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--neon-cyan)]">
              Agent Markets
            </p>
            <h1 className="font-mono text-2xl text-foreground">Prediction markets for this agent</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Create a statement and let the crowd bet on it.
            </p>
          </div>
          <Link
            href={`/arena/${agentId}/markets/new`}
            className="neon-glow-cyan inline-flex items-center justify-center rounded-md border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--neon-cyan)] transition hover:bg-[var(--neon-cyan)]/20"
          >
            New Market
          </Link>
        </div>

        {markets.length === 0 ? (
          <div className="rounded border border-border/60 bg-card/70 p-6 text-center font-mono text-sm text-muted-foreground">
            No markets yet. Be the first to{" "}
            <Link href={`/arena/${agentId}/markets/new`} className="text-[var(--neon-cyan)] underline">
              create one
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {markets.map((market: any) => (
              <Link
                key={market.id}
                href={`/arena/${agentId}/markets/${market.id}`}
                className="group relative overflow-hidden rounded-lg border border-border/60 bg-card/80 p-4 transition hover:border-[var(--neon-cyan)]/70 hover:shadow-[0_0_30px_rgba(0,255,255,0.12)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Statement
                    </p>
                    <h3 className="font-mono text-lg text-foreground">{market.statement}</h3>
                    <p className="font-mono text-xs text-muted-foreground line-clamp-2">
                      {market.description}
                    </p>
                  </div>
                  <span className="rounded bg-[var(--neon-lime)]/15 px-2 py-1 text-[10px] font-mono uppercase text-[var(--neon-lime)]">
                    {market.odds?.moon ?? 50}% / {market.odds?.rug ?? 50}%
                  </span>
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  State: {market.state}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded border border-border/50 bg-muted/40 p-3">
                    <p className="font-mono text-[11px] uppercase text-muted-foreground">Liquidity</p>
                    <p className="font-mono text-sm text-foreground">${Number(market.liquidity).toFixed(2)}</p>
                  </div>
                  <div className="rounded border border-border/50 bg-muted/40 p-3">
                    <p className="font-mono text-[11px] uppercase text-muted-foreground">Volume</p>
                    <p className="font-mono text-sm text-foreground">
                      ${Number(market.totalVolume || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Bets: {market._count?.bets ?? 0}</span>
                  <span>Trades: {market._count?.trades ?? 0}</span>
                  <span>Closes: {new Date(market.closesAt).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Timer, Users, TrendingUp, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const filters = ["All", "Trading Bots", "Gaming Bots", "Social Bots", "Creative Bots"]

function calculateTimeRemaining(endTime: string): string {
  const now = new Date()
  const end = new Date(endTime)
  const diff = Math.floor((end.getTime() - now.getTime()) / 1000)

  if (diff <= 0) {
    return "00:00"
  }

  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

function formatVolume(volume: number): string {
  if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
  return `$${volume.toFixed(0)}`
}

export default function MarketsPage() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [markets, setMarkets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMarkets() {
      try {
        setLoading(true)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        const category = activeFilter === "All" ? undefined : activeFilter
        const url = new URL(`${baseUrl}/api/markets`)
        if (category) url.searchParams.set("category", category)
        url.searchParams.set("status", "ACTIVE")

        const res = await fetch(url.toString())
        if (!res.ok) throw new Error("Failed to fetch markets")
        const data = await res.json()

        const formattedMarkets = data.markets.map((market: any) => {
          const mission = market.mission
          const agent = mission?.agent
          return {
            id: market.id,
            agentId: agent?.id || market.id,
            name: agent?.name || "UNKNOWN",
            mission: mission?.description || "No mission",
            category: mission?.category || "Unknown",
            odds: market.odds || { moon: 50, rug: 50 },
            timeRemaining: mission?.endTime ? calculateTimeRemaining(mission.endTime) : "00:00",
            participants: market.participants || 0,
            volume: formatVolume(Number(market.totalVolume || 0)),
          }
        })

        setMarkets(formattedMarkets)
        setError(null)
      } catch (err) {
        console.error("Error fetching markets:", err)
        setError("Failed to load markets")
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [activeFilter])

  const filteredMarkets = activeFilter === "All" ? markets : markets.filter((m) => m.category === activeFilter)

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-mono text-3xl font-bold uppercase tracking-wider text-foreground">The Lobby</h1>
          <p className="font-mono text-sm text-muted-foreground">Active agent missions • Place your bets</p>
        </div>

        {/* Filter bar */}
        <div className="mb-8 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant="ghost"
              onClick={() => setActiveFilter(filter)}
              className={`font-mono text-xs uppercase tracking-widest transition-all ${
                activeFilter === filter
                  ? "border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
                  : "border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {filter}
            </Button>
          ))}
        </div>

        {/* Markets grid */}
        {loading ? (
          <div className="text-center font-mono text-sm text-muted-foreground py-12">Loading markets...</div>
        ) : error ? (
          <div className="text-center font-mono text-sm text-red-500 py-12">{error}</div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center font-mono text-sm text-muted-foreground py-12">No markets found</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMarkets.map((market) => (
            <Card
              key={market.id}
              className="group border-border/50 bg-card/80 transition-all hover:border-[var(--neon-cyan)]/50"
            >
              <CardContent className="p-5">
                {/* Agent & Category */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)]">
                    {market.name}
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                    {market.category}
                  </span>
                </div>

                {/* Mission */}
                <h3 className="mb-4 line-clamp-2 font-mono text-sm font-medium text-foreground">{market.mission}</h3>

                {/* Odds visualization */}
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between font-mono text-xs">
                    <span className="text-[var(--neon-green)]">MOON {market.odds.moon}%</span>
                    <span className="text-[var(--neon-red)]">RUG {market.odds.rug}%</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded bg-muted">
                    <div className="bg-[var(--neon-green)] transition-all" style={{ width: `${market.odds.moon}%` }} />
                    <div className="bg-[var(--neon-red)] transition-all" style={{ width: `${market.odds.rug}%` }} />
                  </div>
                </div>

                {/* Stats row */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
                    <Timer className="h-3 w-3 text-[var(--neon-magenta)]" />
                    <span className="font-mono text-xs text-foreground">{market.timeRemaining}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
                    <Users className="h-3 w-3 text-[var(--neon-cyan)]" />
                    <span className="font-mono text-xs text-foreground">{market.participants}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
                    <TrendingUp className="h-3 w-3 text-[var(--neon-lime)]" />
                    <span className="font-mono text-xs text-foreground">{market.volume}</span>
                  </div>
                </div>

                {/* Enter button */}
                <Button
                  asChild
                  className="w-full border border-[var(--neon-cyan)]/50 bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] transition-all hover:bg-[var(--neon-cyan)]/10"
                >
                  <Link href={`/arena/${market.agentId}`}>
                    Enter Arena
                    <ArrowUpRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
