"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import {
  buyShares,
  sellShares,
  fetchMarket,
  calculatePrice,
  getUserTokenBalance,
  getMarketPda,
  type MarketAccount,
} from "@/lib/prediction-market/client"
import { BN } from "@coral-xyz/anchor"

interface PredictionMarketProps {
  market?: any // Legacy market data from API (for fallback)
  agentId: string
  marketId?: string // On-chain market PDA address
}

export function PredictionMarket({ market: legacyMarket, agentId, marketId }: PredictionMarketProps) {
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [onChainMarket, setOnChainMarket] = useState<MarketAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [betting, setBetting] = useState(false)
  const [selling, setSelling] = useState(false)
  const [yesBalance, setYesBalance] = useState(0)
  const [noBalance, setNoBalance] = useState(0)
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null)

  // Fetch on-chain market data
  useEffect(() => {
    if (!marketId) return

    async function loadMarket() {
      try {
        const marketPda = new PublicKey(marketId)
        const market = await fetchMarket(connection, marketPda)
        setOnChainMarket(market)
      } catch (error) {
        console.error("Error fetching market:", error)
      }
    }

    loadMarket()
    const interval = setInterval(loadMarket, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [connection, marketId])

  // Fetch user token balances
  useEffect(() => {
    if (!connected || !publicKey || !onChainMarket) {
      setYesBalance(0)
      setNoBalance(0)
      return
    }

    async function loadBalances() {
      try {
        const yes = await getUserTokenBalance(connection, publicKey, onChainMarket.yesMint)
        const no = await getUserTokenBalance(connection, publicKey, onChainMarket.noMint)
        setYesBalance(yes)
        setNoBalance(no)
      } catch (error) {
        console.error("Error fetching balances:", error)
      }
    }

    loadBalances()
    const interval = setInterval(loadBalances, 3000)
    return () => clearInterval(interval)
  }, [connection, publicKey, connected, onChainMarket])

  const market = onChainMarket || legacyMarket
  const isActive =
    market &&
    (onChainMarket
      ? onChainMarket.state.active !== undefined
      : legacyMarket?.state !== "RESOLVED" && legacyMarket?.state !== "FROZEN")

  // Calculate prices from reserves
  const reserveYes = onChainMarket
    ? onChainMarket.reserveYes.toNumber() / LAMPORTS_PER_SOL
    : legacyMarket?.reserveYes || 0
  const reserveNo = onChainMarket
    ? onChainMarket.reserveNo.toNumber() / LAMPORTS_PER_SOL
    : legacyMarket?.reserveNo || 0

  const { yesPrice, noPrice } = calculatePrice(reserveYes, reserveNo)
  const moonPrice = yesPrice
  const rugPrice = noPrice

  const totalLiquidity = reserveYes + reserveNo

  const handleBuy = async (side: "yes" | "no") => {
    if (!marketId || !buyAmount || parseFloat(buyAmount) <= 0) return
    if (!isActive) {
      alert("Market is closed")
      return
    }

    if (!connected || !publicKey || !sendTransaction) {
      setVisible(true)
      return
    }

    const amountSol = parseFloat(buyAmount)
    if (!isFinite(amountSol) || amountSol <= 0) {
      alert("Enter a valid amount")
      return
    }

    try {
      setBetting(true)
      const marketPda = new PublicKey(marketId)
      const { signature } = await buyShares({
        connection,
        wallet: { publicKey, sendTransaction } as any,
        marketPda,
        side,
        amountSol,
      })

      alert(`Trade executed! Transaction: ${signature}`)
      setBuyAmount("")
      // Refresh market data
      const updated = await fetchMarket(connection, marketPda)
      if (updated) setOnChainMarket(updated)
    } catch (error: any) {
      console.error("Buy error:", error)
      alert(error.message || "Failed to place bet")
    } finally {
      setBetting(false)
    }
  }

  const handleSell = async (side: "yes" | "no") => {
    if (!marketId || !sellAmount || parseFloat(sellAmount) <= 0) return
    if (!isActive) {
      alert("Market is closed")
      return
    }

    if (!connected || !publicKey || !sendTransaction) {
      setVisible(true)
      return
    }

    const shares = Math.floor(parseFloat(sellAmount))
    if (!isFinite(shares) || shares <= 0) {
      alert("Enter a valid number of shares")
      return
    }

    const balance = side === "yes" ? yesBalance : noBalance
    if (shares > balance) {
      alert(`Insufficient balance. You have ${balance} ${side.toUpperCase()} shares`)
      return
    }

    try {
      setSelling(true)
      const marketPda = new PublicKey(marketId)
      const { signature } = await sellShares({
        connection,
        wallet: { publicKey, sendTransaction } as any,
        marketPda,
        side,
        shares,
      })

      alert(`Shares sold! Transaction: ${signature}`)
      setSellAmount("")
      // Refresh market data
      const updated = await fetchMarket(connection, marketPda)
      if (updated) setOnChainMarket(updated)
    } catch (error: any) {
      console.error("Sell error:", error)
      alert(error.message || "Failed to sell shares")
    } finally {
      setSelling(false)
    }
  }

  const formatVolume = (vol: number) => {
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`
    return `$${vol.toFixed(2)}`
  }

  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <CardTitle className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--neon-lime)]">
          <span className="flex items-center gap-2">
            Prediction Market
            <span className="rounded bg-[var(--neon-lime)]/20 px-1.5 py-0.5 text-[10px] text-[var(--neon-lime)]">
              On-Chain
            </span>
          </span>
          {onChainMarket && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (marketId) {
                  fetchMarket(connection, new PublicKey(marketId)).then(setOnChainMarket)
                }
              }}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        {/* Wallet connection prompt */}
        {!connected && (
          <div className="rounded border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 p-3 text-center">
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

        {/* User balances */}
        {connected && onChainMarket && (
          <div className="grid grid-cols-2 gap-2 rounded bg-muted/30 p-2">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">YES Shares</div>
              <div className="font-mono text-sm font-bold text-[var(--neon-green)]">{yesBalance}</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">NO Shares</div>
              <div className="font-mono text-sm font-bold text-[var(--neon-red)]">{noBalance}</div>
            </div>
          </div>
        )}

        {/* Buy section */}
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
              onClick={() => handleBuy("yes")}
              disabled={betting || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-green)] bg-[var(--neon-green)]/10 transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_30px_rgba(0,255,100,0.3)]"
            >
              <ArrowUp className="h-5 w-5 text-[var(--neon-green)] transition-transform group-hover:-translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-green)]">BUY YES</span>
              <span className="font-mono text-[10px] text-[var(--neon-green)]/80">
                ${moonPrice.toFixed(4)}
              </span>
            </Button>
            <Button
              onClick={() => handleBuy("no")}
              disabled={betting || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-red)] bg-[var(--neon-red)]/10 transition-all hover:bg-[var(--neon-red)]/20 hover:shadow-[0_0_30px_rgba(255,50,50,0.3)]"
            >
              <ArrowDown className="h-5 w-5 text-[var(--neon-red)] transition-transform group-hover:translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-red)]">BUY NO</span>
              <span className="font-mono text-[10px] text-[var(--neon-red)]/80">${rugPrice.toFixed(4)}</span>
            </Button>
          </div>
        </div>

        {/* Sell section */}
        {connected && (yesBalance > 0 || noBalance > 0) && (
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Sell Shares</div>
            <Input
              type="number"
              placeholder="Number of shares"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="font-mono text-sm"
              min="1"
              step="1"
              disabled={!connected || !isActive}
            />
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleSell("yes")}
                disabled={selling || !sellAmount || parseFloat(sellAmount) <= 0 || yesBalance === 0 || !isActive}
                className="h-16 flex-col gap-1 border border-[var(--neon-green)]/50 bg-[var(--neon-green)]/5 hover:bg-[var(--neon-green)]/10"
              >
                <span className="font-mono text-sm font-bold text-[var(--neon-green)]">SELL YES</span>
                <span className="font-mono text-[10px] text-muted-foreground">Balance: {yesBalance}</span>
              </Button>
              <Button
                onClick={() => handleSell("no")}
                disabled={selling || !sellAmount || parseFloat(sellAmount) <= 0 || noBalance === 0 || !isActive}
                className="h-16 flex-col gap-1 border border-[var(--neon-red)]/50 bg-[var(--neon-red)]/5 hover:bg-[var(--neon-red)]/10"
              >
                <span className="font-mono text-sm font-bold text-[var(--neon-red)]">SELL NO</span>
                <span className="font-mono text-[10px] text-muted-foreground">Balance: {noBalance}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Market stats */}
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
            <div className="font-mono text-sm font-bold text-foreground">
              {onChainMarket ? (onChainMarket.feeBps / 100).toFixed(2) : "1.00"}%
            </div>
          </div>
        </div>

        {/* Market state */}
        {onChainMarket && (
          <div className="rounded border border-border/50 bg-terminal-bg p-2">
            <div className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Market State</div>
            <div className="font-mono text-xs text-foreground">
              {onChainMarket.state.active !== undefined
                ? "ACTIVE"
                : onChainMarket.state.resolved !== undefined
                  ? `RESOLVED (${onChainMarket.outcome?.yes ? "YES" : "NO"})`
                  : "FROZEN"}
            </div>
            {onChainMarket.closesAt && (
              <div className="font-mono text-[10px] text-muted-foreground mt-1">
                Closes: {new Date(onChainMarket.closesAt.toNumber() * 1000).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
