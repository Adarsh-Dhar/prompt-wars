"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useBalance } from "wagmi"

export function NavBar() {
  const { address, isConnected } = useAccount()
  const { data: balanceData } = useBalance({
    address,
    query: { enabled: !!address },
  })

  const formattedBalance = useMemo(() => {
    if (!balanceData) return null
    const value = Number(balanceData.value) / 10 ** balanceData.decimals
    return `${value.toFixed(4)} ${balanceData.symbol}`
  }, [balanceData])

  const formatWallet = (addr?: string) => {
    if (!addr) return ""
    if (addr.length <= 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

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
            href="/arena"
            className="font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
          >
            Arena
          </Link>
          <Link
            href="/leaderboard"
            className="font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
          >
            Leaderboard
          </Link>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-4">
          {isConnected && formattedBalance && (
            <div className="hidden items-center gap-2 rounded border border-border/50 bg-card px-3 py-1.5 sm:flex">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-lime)]" />
              <span className="font-mono text-sm text-[var(--neon-lime)]">
                {formattedBalance}
              </span>
            </div>
          )}

          {/* RainbowKit Connect Button */}
          <div className="flex items-center gap-2">
            <ConnectButton chainStatus="icon" accountStatus={{ smallScreen: "avatar", largeScreen: "full" }} />
            {/* Optional legacy button styling retained for aesthetics */}
            {!isConnected && (
              <Button className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
