"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"

interface PredictionMarketProps {
  market?: any
  agentId: string
}

export function PredictionMarket({ market, agentId }: PredictionMarketProps) {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [betting, setBetting] = useState(false)

  useEffect(() => {
    if (!market?.id) return

    async function fetchTrades() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        const res = await fetch(`${baseUrl}/api/markets/${market.id}/trades?limit=20`)
        if (!res.ok) throw new Error("Failed to fetch trades")
        const data = await res.json()
        setTrades(data.trades || [])
      } catch (error) {
        console.error("Error fetching trades:", error)
      }
    }

    fetchTrades()
    const interval = setInterval(fetchTrades, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [market?.id])

  const isActive = market?.state !== "RESOLVED" && market?.state !== "FROZEN"

  const handleBet = async (position: "MOON" | "RUG") => {
    if (!market?.id || !amount || parseFloat(amount) <= 0) return
    if (!isActive) {
      alert("Market is closed")
      return
    }

    // Check if wallet is connected
    if (!connected || !publicKey) {
      setVisible(true)
      return
    }

    const walletAddress = publicKey.toBase58()

    try {
      setBetting(true)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      const res = await fetch(`${baseUrl}/api/markets/${market.id}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side: position === "MOON" ? "YES" : "NO",
          amount: parseFloat(amount),
          walletAddress,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to place bet")
      }

      alert("Trade executed!")
      setAmount("")
      // Refresh trades
      const tradesRes = await fetch(`${baseUrl}/api/markets/${market.id}/trades?limit=20`)
      if (tradesRes.ok) {
        const data = await tradesRes.json()
        setTrades(data.trades || [])
      }
    } catch (error: any) {
      alert(error.message || "Failed to place bet")
    } finally {
      setBetting(false)
    }
  }

  const moonPrice = market?.moonPrice || 0.5
  const rugPrice = market?.rugPrice || 0.5
  const totalVolume = market?.totalVolume || 0
  const liquidity = market?.liquidity || 0

  const formatVolume = (vol: number) => {
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`
    return `$${vol.toFixed(0)}`
  }
  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--neon-lime)]">
          Prediction Market
          <span className="rounded bg-[var(--neon-lime)]/20 px-1.5 py-0.5 text-[10px] text-[var(--neon-lime)]">
            icm.run
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        {/* Wallet connection prompt */}
        {!connected && (
          <div className="mb-4 rounded border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 p-3 text-center">
            <p className="font-mono text-xs text-[var(--neon-cyan)] mb-2">
              Connect your wallet to place bets
            </p>
            <Button
              onClick={() => setVisible(true)}
              className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
            >
              Connect Wallet
            </Button>
          </div>
        )}

        {/* Amount input */}
        <div className="mb-4">
          <Input
            type="number"
            placeholder="Amount (SOL)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono text-sm"
            min="0.1"
            disabled={!connected || !isActive}
          />
        </div>

        {/* Betting buttons */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {/* MOON Button */}
          <Button
            onClick={() => handleBet("MOON")}
            disabled={betting || !amount || parseFloat(amount) <= 0 || !connected || !isActive}
            className="group relative h-24 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-green)] bg-[var(--neon-green)]/10 transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_30px_rgba(0,255,100,0.3)]"
          >
            <ArrowUp className="h-6 w-6 text-[var(--neon-green)] transition-transform group-hover:-translate-y-1" />
            <span className="font-mono text-lg font-bold text-[var(--neon-green)]">MOON</span>
            <span className="font-mono text-xs text-[var(--neon-green)]/80">
              Buy Yes • ${moonPrice.toFixed(2)}
            </span>
          </Button>

          {/* RUG Button */}
          <Button
            onClick={() => handleBet("RUG")}
            disabled={betting || !amount || parseFloat(amount) <= 0 || !connected || !isActive}
            className="group relative h-24 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-red)] bg-[var(--neon-red)]/10 transition-all hover:bg-[var(--neon-red)]/20 hover:shadow-[0_0_30px_rgba(255,50,50,0.3)]"
          >
            <ArrowDown className="h-6 w-6 text-[var(--neon-red)] transition-transform group-hover:translate-y-1" />
            <span className="font-mono text-lg font-bold text-[var(--neon-red)]">RUG</span>
            <span className="font-mono text-xs text-[var(--neon-red)]/80">Buy No • ${rugPrice.toFixed(2)}</span>
          </Button>
        </div>

        {/* Market stats */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-xs uppercase text-muted-foreground">Total Volume</div>
            <div className="font-mono text-lg font-bold text-foreground">{formatVolume(totalVolume)}</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-xs uppercase text-muted-foreground">Liquidity</div>
            <div className="font-mono text-lg font-bold text-foreground">{formatVolume(liquidity)}</div>
          </div>
        </div>

        {/* Recent trades */}
        <div className="rounded border border-border/50 bg-terminal-bg">
          <div className="border-b border-border/50 px-3 py-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Recent Trades</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {loading ? (
              <div className="font-mono text-xs text-muted-foreground">Loading...</div>
            ) : trades.length === 0 ? (
              <div className="font-mono text-xs text-muted-foreground">No trades yet</div>
            ) : (
              <div className="space-y-1">
                {trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{trade.user}</span>
                      <span className="font-mono text-xs text-foreground">
                        {trade.action} {trade.shares}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          trade.type === "MOON" ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                        }`}
                      >
                        {trade.type}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{trade.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
