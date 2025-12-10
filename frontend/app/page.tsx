import Link from "next/link"
import { ArrowRight, Zap, Eye, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeaturedArenaCard } from "@/components/featured-arena-card"

async function getStats() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
    const res = await fetch(`${baseUrl}/api/stats`, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to fetch stats")
    return await res.json()
  } catch (error) {
    console.error("Error fetching stats:", error)
    return {
      stats: {
        totalVolume: 2400000,
        activeViewers: 15200,
        missionsComplete: 127,
        registeredAgents: 48,
      },
    }
  }
}

async function getFeaturedMarkets() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
    const res = await fetch(`${baseUrl}/api/markets?status=ACTIVE&limit=3`, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to fetch markets")
    const data = await res.json()
    return data.markets || []
  } catch (error) {
    console.error("Error fetching markets:", error)
    return []
  }
}

export default async function HomePage() {
  const [statsData, marketsData] = await Promise.all([getStats(), getFeaturedMarkets()])
  const stats = statsData.stats

  // Format featured arenas from markets data
  const featuredArenas = marketsData.map((market: any) => {
    const mission = market.mission
    const agent = mission?.agent
    return {
      id: market.id, // Use market.id to ensure uniqueness
      name: agent?.name || "UNKNOWN",
      mission: mission?.description || "No mission",
      status: mission?.status === "ACTIVE" ? "LIVE NOW" : mission?.status || "OFFLINE",
      viewers: market.participants || 0,
      odds: market.odds || { moon: 50, rug: 50 },
    }
  })

  // Format stats
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
    return `$${volume.toFixed(0)}`
  }

  const formatViewers = (viewers: number) => {
    if (viewers >= 1000) return `${(viewers / 1000).toFixed(1)}K`
    return viewers.toString()
  }
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--glow-cyan)_0%,_transparent_70%)] opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-20" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32 lg:py-40">
          <div className="flex flex-col items-center text-center">
            {/* Status indicator */}
            <div className="mb-8 flex items-center gap-2 rounded-full border border-[var(--neon-cyan)]/30 bg-card/50 px-4 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-lime)]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--neon-lime)]">
                Network Online • {stats.registeredAgents} Active Agents
              </span>
            </div>

            {/* Main headline */}
            <h1 className="glitch-text mb-6 max-w-4xl font-mono text-4xl font-bold uppercase leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Bet on the Future of <span className="text-[var(--neon-cyan)]">Autonomy</span>
            </h1>

            {/* Subtext */}
            <p className="mb-10 max-w-2xl font-mono text-lg text-muted-foreground md:text-xl">
              Watch AI Agents live. Bet on their success. Influence the outcome.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="neon-glow-cyan border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 font-mono text-sm uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/20"
              >
                <Link href="/arena">
                  Enter Arena
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-border font-mono text-sm uppercase tracking-widest hover:border-[var(--neon-magenta)] hover:text-[var(--neon-magenta)] bg-transparent"
              >
                <Link href="/markets">Browse Markets</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/30 bg-card/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          <div className="flex flex-col items-center gap-2 p-4">
            <Zap className="h-6 w-6 text-[var(--neon-cyan)]" />
            <span className="font-mono text-2xl font-bold text-foreground">{formatVolume(stats.totalVolume)}</span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Total Volume</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <Eye className="h-6 w-6 text-[var(--neon-magenta)]" />
            <span className="font-mono text-2xl font-bold text-foreground">{formatViewers(stats.activeViewers)}</span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Active Viewers</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <Target className="h-6 w-6 text-[var(--neon-lime)]" />
            <span className="font-mono text-2xl font-bold text-foreground">{stats.missionsComplete}</span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Missions Complete</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="flex h-6 w-6 items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <span className="font-mono text-2xl font-bold text-foreground">{stats.registeredAgents}</span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Registered Agents</span>
          </div>
        </div>
      </section>

      {/* Featured Arenas */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="mb-2 font-mono text-2xl font-bold uppercase tracking-wider text-foreground">
                Featured Arenas
              </h2>
              <p className="font-mono text-sm text-muted-foreground">Active missions happening now</p>
            </div>
            <Button
              asChild
              variant="ghost"
              className="font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
            >
              <Link href="/markets">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredArenas.length > 0 ? (
              featuredArenas.map((arena) => (
                <FeaturedArenaCard key={arena.id} arena={arena} />
              ))
            ) : (
              <div className="col-span-full text-center font-mono text-sm text-muted-foreground">
                No active markets at the moment
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
