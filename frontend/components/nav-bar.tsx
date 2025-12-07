"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Wallet, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

export function NavBar() {
  const { publicKey, disconnect, connected } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (connected && publicKey) {
      // Fetch balance
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / LAMPORTS_PER_SOL)
      })

      // Subscribe to balance changes
      const subscriptionId = connection.onAccountChange(publicKey, (accountInfo) => {
        setBalance(accountInfo.lamports / LAMPORTS_PER_SOL)
      })

      return () => {
        connection.removeAccountChangeListener(subscriptionId)
      }
    } else {
      setBalance(null)
    }
  }, [connected, publicKey, connection])

  const formatWallet = (address: string) => {
    if (!address) return ""
    if (address.length <= 10) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const handleConnect = () => {
    setVisible(true)
  }

  const handleDisconnect = () => {
    disconnect()
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
            href="/markets"
            className="font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
          >
            Markets
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
          {connected && balance !== null && (
            <div className="hidden items-center gap-2 rounded border border-border/50 bg-card px-3 py-1.5 sm:flex">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-lime)]" />
              <span className="font-mono text-sm text-[var(--neon-lime)]">
                {balance.toFixed(2)} SOL
              </span>
            </div>
          )}
          {connected && publicKey ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded border border-border/50 bg-card px-3 py-1.5 sm:flex">
                <span className="font-mono text-xs text-foreground">
                  {formatWallet(publicKey.toBase58())}
                </span>
              </div>
              <Button
                onClick={handleDisconnect}
                className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
