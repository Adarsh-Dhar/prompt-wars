"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"

interface PredictionMarketProps {
  market?: any
  agentId: string
  marketId?: string
}

export function PredictionMarket({ market: legacyMarket, agentId: _agentId, marketId }: PredictionMarketProps) {
  const { publicKey, connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [market, setMarket] = useState<any>(legacyMarket)
  const [buyAmount, setBuyAmount] = useState("")
  const [side, setSide] = useState<"YES" | "NO">("YES")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const dbMarketId = legacyMarket?.id || marketId
  const isActive = market?.state === "ACTIVE" || market?.state === "PENDING"

  const refreshMarket = async () => {
    if (!dbMarketId) return
    try {
      const res = await fetch(`/api/markets/${dbMarketId}`)
      if (!res.ok) return
      const data = await res.json()
      setMarket(data.market)
    } catch (error) {
      console.error("Failed to refresh market", error)
    }
  }

  useEffect(() => {
    if (!dbMarketId) return
    refreshMarket()
    const interval = setInterval(refreshMarket, 4000)
    return () => clearInterval(interval)
  }, [dbMarketId])

  const handleTrade = async () => {
    setMessage(null)
    try {
      if (!dbMarketId) {
        setMessage("Missing market id")
      return
    }

      if (!connected || !publicKey) {
        setVisible(true)
        throw new Error("Connect wallet to trade")
      }

      const amount = parseFloat(buyAmount)
      if (!isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount")
    }
    
    if (!isActive) {
        throw new Error("Market is closed")
      }

      setLoading(true)
      const txSignature = crypto.randomUUID().replace(/-/g, "")
      const res = await fetch(`/api/markets/${dbMarketId}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side,
          amount,
          walletAddress: publicKey.toBase58(),
          txSignature,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Trade failed")
        }
        
      setMarket(data.market)
      setBuyAmount("")
      setMessage("Trade recorded (DB only)")
    } catch (error: any) {
      setMessage(error.message || "Trade failed")
    } finally {
      setLoading(false)
    }
  }

  const formatVolume = (vol?: number) => {
    if (!isFinite(vol || 0)) return "$0.00"
    const value = Number(vol || 0)
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }

  const moonPrice = Number(market?.moonPrice ?? 0.5)
  const rugPrice = Number(market?.rugPrice ?? 0.5)
  const reserveYes = Number(market?.reserveYes ?? 0)
  const reserveNo = Number(market?.reserveNo ?? 0)
  const totalLiquidity = Number(market?.liquidity ?? reserveYes + reserveNo)

  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <CardTitle className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--neon-lime)]">
          <span className="flex items-center gap-2">
            Prediction Market
            <span className="rounded bg-[var(--neon-lime)]/20 px-1.5 py-0.5 text-[10px] text-[var(--neon-lime)]">
              Off-chain
            </span>
          </span>
          {dbMarketId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshMarket}
              className="h-6 w-6 p-0"
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        {!connected && (
          <div className="rounded border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 p-3 text-center">
            <p className="font-mono text-xs text-[var(--neon-cyan)] mb-2">Connect your wallet to place bets</p>
            <Button
              onClick={() => setVisible(true)}
              className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
            >
              Connect Wallet
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Buy Shares</div>
          <Input
            type="number"
            placeholder="Amount (SOL)"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="font-mono text-sm"
            min="0.01"
            step="0.01"
            disabled={!connected || !isActive}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => {
                setSide("YES")
                handleTrade()
              }}
              disabled={loading || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-green)] bg-[var(--neon-green)]/10 transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_30px_rgba(0,255,100,0.3)]"
            >
              <ArrowUp className="h-5 w-5 text-[var(--neon-green)] transition-transform group-hover:-translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-green)]">BUY YES</span>
              <span className="font-mono text-[10px] text-[var(--neon-green)]/80">${moonPrice.toFixed(4)}</span>
            </Button>
            <Button
              onClick={() => {
                setSide("NO")
                handleTrade()
              }}
              disabled={loading || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-red)] bg-[var(--neon-red)]/10 transition-all hover:bg-[var(--neon-red)]/20 hover:shadow-[0_0_30px_rgba(255,50,50,0.3)]"
            >
              <ArrowDown className="h-5 w-5 text-[var(--neon-red)] transition-transform group-hover:translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-red)]">BUY NO</span>
              <span className="font-mono text-[10px] text-[var(--neon-red)]/80">${rugPrice.toFixed(4)}</span>
            </Button>
          </div>
          {message && <p className="font-mono text-xs text-muted-foreground">{message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">YES Reserve</div>
            <div className="font-mono text-sm font-bold text-foreground">{formatVolume(reserveYes)}</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">NO Reserve</div>
            <div className="font-mono text-sm font-bold text-foreground">{formatVolume(reserveNo)}</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Total Liquidity</div>
            <div className="font-mono text-sm font-bold text-foreground">{formatVolume(totalLiquidity)}</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Fee</div>
            <div className="font-mono text-sm font-bold text-foreground">{((market?.feeBps ?? 100) / 100).toFixed(2)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
