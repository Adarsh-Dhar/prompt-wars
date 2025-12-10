import Link from "next/link"
import { Eye, TrendingUp, Zap, Timer, ArrowUpRight, Activity, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

async function getArenas(category?: string, status?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const url = new URL(`${baseUrl}/api/arena`)
    if (category) url.searchParams.set("category", category)
    if (status) url.searchParams.set("status", status)

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (!res.ok) throw new Error("Failed to fetch arenas")
    const data = await res.json()
    return data.arenas || []
  } catch (error) {
    console.error("Error fetching arenas:", error)
    return []
  }
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
  if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
  return `$${volume.toFixed(0)}`
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? "+" : ""
  if (Math.abs(pnl) >= 1000000) return `${sign}$${(Math.abs(pnl) / 1000000).toFixed(2)}M`
  if (Math.abs(pnl) >= 1000) return `${sign}$${(Math.abs(pnl) / 1000).toFixed(2)}K`
  return `${sign}$${pnl.toFixed(2)}`
}

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

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    ACTIVE: { label: "LIVE NOW", color: "text-[var(--neon-red)]", bgColor: "bg-[var(--neon-red)]/20" },
    IDLE: { label: "IDLE", color: "text-[var(--neon-cyan)]", bgColor: "bg-[var(--neon-cyan)]/20" },
    COMPLETED: { label: "COMPLETED", color: "text-[var(--neon-lime)]", bgColor: "bg-[var(--neon-lime)]/20" },
    FAILED: { label: "FAILED", color: "text-[var(--neon-red)]", bgColor: "bg-[var(--neon-red)]/20" },
  }

  const statusInfo = statusMap[status] || { label: status, color: "text-muted-foreground", bgColor: "bg-muted" }

  return (
    <div className={`flex items-center gap-1.5 rounded-full ${statusInfo.bgColor} px-2.5 py-1`}>
      {status === "ACTIVE" && <div className={`h-1.5 w-1.5 animate-pulse rounded-full ${statusInfo.color.replace("text-", "bg-")}`} />}
      <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    </div>
  )
}

export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>
}) {
  const params = await searchParams
  const arenas = await getArenas(params.category, params.status)

  const categories = ["All", "Trading Bots", "Gaming Bots", "Social Bots", "Creative Bots"]
  const statuses = ["All", "IDLE", "ACTIVE", "COMPLETED", "FAILED"]

  const activeCategory = params.category || "All"
  const activeStatus = params.status || "All"

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--glow-cyan)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-2 font-mono text-3xl font-bold uppercase tracking-wider text-foreground">The Arena</h1>
              <p className="font-mono text-sm text-muted-foreground">All active agents • Watch them compete • Place your bets</p>
            </div>
            <Button
              asChild
              className="border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] transition-all hover:bg-[var(--neon-cyan)]/20 hover:shadow-[0_0_20px_var(--glow-cyan)]"
            >
              <Link href="/arena/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Arena
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter bars */}
        <div className="mb-8 space-y-4">
          {/* Category filter */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = activeCategory === category
                const params = new URLSearchParams()
                if (category !== "All") params.set("category", category)
                if (activeStatus !== "All") params.set("status", activeStatus)
                const href = params.toString() ? `/arena?${params.toString()}` : "/arena"
                return (
                  <Button
                    key={category}
                    asChild
                    variant="ghost"
                    className={`font-mono text-xs uppercase tracking-widest transition-all ${
                      isActive
                        ? "border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]"
                        : "border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <Link href={href}>{category}</Link>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Status filter */}
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => {
                const isActive = activeStatus === status
                const params = new URLSearchParams()
                if (activeCategory !== "All") params.set("category", activeCategory)
                if (status !== "All") params.set("status", status)
                const href = params.toString() ? `/arena?${params.toString()}` : "/arena"
                return (
                  <Button
                    key={status}
                    asChild
                    variant="ghost"
                    className={`font-mono text-xs uppercase tracking-widest transition-all ${
                      isActive
                        ? "border border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)]"
                        : "border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <Link href={href}>{status}</Link>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Arenas grid */}
        {arenas.length === 0 ? (
          <div className="text-center font-mono text-sm text-muted-foreground py-12">No arenas found</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {arenas.map((arena: any) => (
              <Card
                key={arena.id}
                className="group relative overflow-hidden border-border/50 bg-card/80 transition-all hover:border-[var(--neon-cyan)]/50 hover:shadow-[0_0_30px_var(--glow-cyan)]"
              >
                {/* Status badge */}
                <div className="absolute right-3 top-3 z-10">{getStatusBadge(arena.status)}</div>

                {/* Agent avatar placeholder */}
                <div className="relative aspect-video w-full overflow-hidden bg-terminal-bg">
                  <div className="scanline absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--neon-cyan)]/5 to-[var(--neon-magenta)]/5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--neon-cyan)]/30 bg-card">
                      <span className="font-mono text-2xl font-bold text-[var(--neon-cyan)]">{arena.name.charAt(0)}</span>
                    </div>
                  </div>

                  {/* Participants count */}
                  {arena.market && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded bg-background/80 px-2 py-1">
                      <Eye className="h-3 w-3 text-[var(--neon-magenta)]" />
                      <span className="font-mono text-xs text-foreground">{arena.market.participants.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  {/* Agent name & category */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)]">
                      {arena.name}
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                      {arena.category}
                    </span>
                  </div>

                  {/* Mission */}
                  {arena.mission ? (
                    <h3 className="mb-4 line-clamp-2 font-mono text-sm font-medium text-foreground">
                      {arena.mission.description}
                    </h3>
                  ) : (
                    <p className="mb-4 font-mono text-xs text-muted-foreground italic">No active mission</p>
                  )}

                  {/* Stats */}
                  {arena.stats && (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
                        <TrendingUp className="h-3 w-3 text-[var(--neon-lime)]" />
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-muted-foreground">PnL</span>
                          <span className={`font-mono text-xs ${Number(arena.stats.currentPnL) >= 0 ? "text-[var(--neon-lime)]" : "text-[var(--neon-red)]"}`}>
                            {formatPnL(Number(arena.stats.currentPnL))}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
                        <Zap className="h-3 w-3 text-[var(--neon-cyan)]" />
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-muted-foreground">Compute</span>
                          <span className="font-mono text-xs text-foreground">{Number(arena.stats.compute).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Market info */}
                  {arena.market && (
                    <>
                      {/* Odds visualization */}
                      <div className="mb-4">
                        <div className="mb-1.5 flex justify-between font-mono text-xs">
                          <span className="text-[var(--neon-green)]">
                            MOON {arena.market.odds?.moon || 50}%
                          </span>
                          <span className="text-[var(--neon-red)]">
                            RUG {arena.market.odds?.rug || 50}%
                          </span>
                        </div>
                        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="bg-[var(--neon-green)] transition-all"
                            style={{ width: `${arena.market.odds?.moon || 50}%` }}
                          />
                          <div
                            className="bg-[var(--neon-red)] transition-all"
                            style={{ width: `${arena.market.odds?.rug || 50}%` }}
                          />
                        </div>
                      </div>

                      {/* Market stats */}
                      <div className="mb-4 grid grid-cols-2 gap-2">
                        {arena.mission?.endTime && (
                          <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
                            <Timer className="h-3 w-3 text-[var(--neon-magenta)]" />
                            <span className="font-mono text-xs text-foreground">
                              {calculateTimeRemaining(arena.mission.endTime)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
                          <Activity className="h-3 w-3 text-[var(--neon-cyan)]" />
                          <span className="font-mono text-xs text-foreground">
                            {formatVolume(Number(arena.market.totalVolume))}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Enter button */}
                  <Button
                    asChild
                    className="w-full border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] transition-all hover:bg-[var(--neon-cyan)]/20 hover:shadow-[0_0_20px_var(--glow-cyan)]"
                  >
                    <Link href={`/arena/${arena.id}`}>
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

