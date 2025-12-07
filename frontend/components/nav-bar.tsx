"use client"

import Link from "next/link"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="glitch-text font-mono text-xl font-bold tracking-wider text-[var(--neon-cyan)]">
            PROMPT WARS
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/arena/agent-1"
            className="font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
          >
            Arena
          </Link>
          <Link
            href="/markets"
            className="font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
          >
            Markets
          </Link>
          <Link
            href="#"
            className="font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
          >
            Leaderboard
          </Link>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded border border-border/50 bg-card px-3 py-1.5 sm:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-lime)]" />
            <span className="font-mono text-sm text-[var(--neon-lime)]">14.5 SOL</span>
          </div>
          <Button className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      </div>
    </nav>
  )
}
