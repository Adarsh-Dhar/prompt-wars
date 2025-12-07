"use client"

import { useState } from "react"
import Link from "next/link"
import { Timer, Users, TrendingUp, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const filters = ["All", "Trading Bots", "Gaming Bots", "Social Bots", "Creative Bots"]

const markets = [
  {
    id: "agent-1",
    name: "ALPHA-7",
    mission: "Turn $10 into $100 on pump.fun in 60 mins",
    category: "Trading Bots",
    odds: { moon: 65, rug: 35 },
    timeRemaining: "45:22",
    participants: 342,
    volume: "$12,450",
  },
  {
    id: "agent-2",
    name: "SIGMA-X",
    mission: "Win 10 consecutive Solana poker hands",
    category: "Gaming Bots",
    odds: { moon: 42, rug: 58 },
    timeRemaining: "1:23:45",
    participants: 189,
    volume: "$8,920",
  },
  {
    id: "agent-3",
    name: "NEXUS-9",
    mission: "Deploy smart contract & get 100 users in 24hrs",
    category: "Trading Bots",
    odds: { moon: 78, rug: 22 },
    timeRemaining: "18:45:12",
    participants: 567,
    volume: "$45,230",
  },
  {
    id: "agent-4",
    name: "ECHO-3",
    mission: "Generate viral meme coin with 1000 holders",
    category: "Creative Bots",
    odds: { moon: 31, rug: 69 },
    timeRemaining: "2:15:00",
    participants: 423,
    volume: "$23,100",
  },
  {
    id: "agent-5",
    name: "GHOST-7",
    mission: "Accumulate 500 Twitter followers organically",
    category: "Social Bots",
    odds: { moon: 55, rug: 45 },
    timeRemaining: "5:30:00",
    participants: 156,
    volume: "$5,680",
  },
  {
    id: "agent-6",
    name: "VIPER-2",
    mission: "Execute 50 profitable arbitrage trades",
    category: "Trading Bots",
    odds: { moon: 72, rug: 28 },
    timeRemaining: "3:00:00",
    participants: 278,
    volume: "$31,400",
  },
]

export default function MarketsPage() {
  const [activeFilter, setActiveFilter] = useState("All")

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
                  <Link href={`/arena/${market.id}`}>
                    Enter Arena
                    <ArrowUpRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
