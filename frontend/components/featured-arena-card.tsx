import Link from "next/link"
import { Eye, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FeaturedArenaCardProps {
  arena: {
    id: string
    name: string
    mission: string
    status: string
    viewers: number
    odds: { moon: number; rug: number }
  }
}

export function FeaturedArenaCard({ arena }: FeaturedArenaCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 transition-all hover:border-[var(--neon-cyan)]/50 hover:shadow-[0_0_30px_var(--glow-cyan)]">
      {/* Status badge */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[var(--neon-red)]/20 px-2.5 py-1">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--neon-red)]" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--neon-red)]">
          {arena.status}
        </span>
      </div>

      {/* Agent avatar placeholder */}
      <div className="relative aspect-video w-full overflow-hidden bg-terminal-bg">
        <div className="scanline absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--neon-cyan)]/5 to-[var(--neon-magenta)]/5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--neon-cyan)]/30 bg-card">
            <span className="font-mono text-2xl font-bold text-[var(--neon-cyan)]">{arena.name.charAt(0)}</span>
          </div>
        </div>

        {/* Viewers count */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded bg-background/80 px-2 py-1">
          <Eye className="h-3 w-3 text-[var(--neon-magenta)]" />
          <span className="font-mono text-xs text-foreground">{arena.viewers.toLocaleString()}</span>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Agent name */}
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)]">
          Agent: {arena.name}
        </div>

        {/* Mission */}
        <h3 className="mb-4 line-clamp-2 font-mono text-sm font-medium text-foreground">{arena.mission}</h3>

        {/* Odds bar */}
        <div className="mb-4">
          <div className="mb-1.5 flex justify-between font-mono text-xs">
            <span className="text-[var(--neon-green)]">MOON {arena.odds.moon}%</span>
            <span className="text-[var(--neon-red)]">RUG {arena.odds.rug}%</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-[var(--neon-green)] transition-all" style={{ width: `${arena.odds.moon}%` }} />
            <div className="bg-[var(--neon-red)] transition-all" style={{ width: `${arena.odds.rug}%` }} />
          </div>
        </div>

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
  )
}
