"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { NATIVE_MINT } from "@solana/spl-token"
import { getConnection } from "@/lib/solana/client"
import { initializeMarket, canCreateMarket, generateMarketId } from "@/lib/prediction/client"

export default function NewMarketPage() {
  const router = useRouter()
  const params = useParams<{ agentId: string }>()
  const agentId = Array.isArray(params?.agentId) ? params?.agentId[0] : params?.agentId
  const [statement, setStatement] = useState("")
  const [description, setDescription] = useState("")
  const [closesAt, setClosesAt] = useState("")
  const [minBet, setMinBet] = useState("1")
  const [maxBet, setMaxBet] = useState("")
  const [initialLiquidity, setInitialLiquidity] = useState("0.1")
  const [feeBps, setFeeBps] = useState("100")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasExistingMarket, setHasExistingMarket] = useState<boolean | null>(null)
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet()
  const { setVisible } = useWalletModal()

  // Since we now support multiple markets per wallet, we don't need to check for existing markets
  // Remove the existing market check
  useEffect(() => {
    // Always allow market creation now that we support multiple markets per wallet
    setHasExistingMarket(false)
  }, [connected, publicKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      // Validate statement length
      if (statement.trim().length < 4) {
        setError("Statement must be at least 4 characters long")
        setSubmitting(false)
        return
      }

      // Validate description length
      if (description.trim().length < 4) {
        setError("Description must be at least 4 characters long")
        setSubmitting(false)
        return
      }

      const closeDate = new Date(closesAt)
      if (isNaN(closeDate.getTime()) || closeDate.getTime() <= Date.now()) {
        setError("Close date must be in the future")
        setSubmitting(false)
        return
      }

      if (!connected || !publicKey) {
        setVisible(true)
        throw new Error("Connect wallet to create a market")
      }

      const liquidityAmount = Number(initialLiquidity)
      if (!isFinite(liquidityAmount) || liquidityAmount <= 0) {
        throw new Error("Initial liquidity must be greater than zero")
      }

      // Initialize the market on-chain
      const connection = getConnection()
      const endTimeUnix = Math.floor(closeDate.getTime() / 1000)
      
      console.log("[create-market] Generating unique market ID...")
      
      // Generate a unique market ID for this market
      const marketId = generateMarketId()
      console.log("[create-market] Generated market ID:", marketId)
      
      // Check if this specific market ID is available (should always be true with our generation method)
      const canCreate = await canCreateMarket(connection, publicKey, marketId)
      if (!canCreate) {
        throw new Error(`Market ID ${marketId} already exists. Please try again.`)
      }
      
      console.log("[create-market] Initializing market on-chain...")
      
      // Create wallet adapter compatible object
      const walletAdapter = {
        publicKey: publicKey!,
        signTransaction: signTransaction!,
        signAllTransactions: signAllTransactions!
      }
      
      const marketResult = await initializeMarket(connection, walletAdapter, {
        question: statement,
        endTime: endTimeUnix,
        collateralMint: NATIVE_MINT, // Using native SOL as collateral
        marketId: marketId,
      })

      console.log("[create-market] Market initialized:", marketResult)

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      const payload = {
        statement,
        description,
        // Send an ISO string so the API's zod date coercion is consistent
        closesAt: closeDate.toISOString(),
        minBet: Number(minBet),
        maxBet: maxBet ? Number(maxBet) : undefined,
        initialLiquidity: liquidityAmount,
        feeBps: Number(feeBps),
        walletAddress: publicKey.toBase58(),
        txSignature: marketResult.txSignature,
        marketPda: marketResult.marketPda.toBase58(),
        blockchainMarketId: marketId,
        mints: {
          yesMint: marketResult.yesMint.toBase58(),
          noMint: marketResult.noMint.toBase58(),
          poolVault: marketResult.collateralVault.toBase58(),
        }
      }

      const res = await fetch(`${baseUrl}/api/arena/${agentId}/markets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      console.log("[create-market] POST /api/arena/:agentId/markets response", res)

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create market")
      }

      console.log("[create-market] POST /api/arena/:agentId/markets data", data)

      router.push(`/arena/${agentId}/markets/${data.market.id}`)
    } catch (err: any) {
      console.error("[create-market] failed", err)
      setError(err.message || "Failed to create market")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--glow-cyan)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--neon-cyan)]">
            New Market
          </p>
          <h1 className="font-mono text-2xl text-foreground">Create a prediction market</h1>
          <p className="font-mono text-xs text-muted-foreground">
            Set the statement, constraints, and seed liquidity. This spins up a CPMM with YES/NO
            outcome shares so traders can move the price.
          </p>
          <div className="mt-3 rounded border border-green-500/50 bg-green-500/10 px-3 py-2">
            <p className="font-mono text-xs text-green-500">
              ✅ You can now create multiple markets with the same wallet. Each market gets a unique ID.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border/60 bg-card/80 p-6 shadow-lg"
        >
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Statement * <span className="text-xs text-muted-foreground">({statement.length}/4 min)</span>
            </label>
            <Input
              required
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Will the agent ship feature X this week?"
              className={`font-mono ${statement.length > 0 && statement.length < 4 ? 'border-red-500' : ''}`}
            />
            {statement.length > 0 && statement.length < 4 && (
              <p className="text-xs text-red-500 font-mono">Statement must be at least 4 characters</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Description * <span className="text-xs text-muted-foreground">({description.length}/4 min)</span>
            </label>
            <Textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add relevant context, assumptions, or success criteria."
              className={`font-mono ${description.length > 0 && description.length < 4 ? 'border-red-500' : ''}`}
              rows={4}
            />
            {description.length > 0 && description.length < 4 && (
              <p className="text-xs text-red-500 font-mono">Description must be at least 4 characters</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Close Date *
              </label>
              <Input
                required
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Min Bet *
              </label>
              <Input
                required
                type="number"
                min="0.001"
                step="0.001"
                value={minBet}
                onChange={(e) => setMinBet(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Max Bet (optional)
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={maxBet}
                onChange={(e) => setMaxBet(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Seed Liquidity
              </label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={initialLiquidity}
                onChange={(e) => setInitialLiquidity(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Fee (bps)
              </label>
              <Input
                type="number"
                min="0"
                max="1000"
                step="10"
                value={feeBps}
                onChange={(e) => setFeeBps(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="rounded border border-border/50 bg-muted/40 p-3">
              <p className="font-mono text-[11px] uppercase text-muted-foreground mb-1">CPMM</p>
              <p className="font-mono text-xs text-muted-foreground">
                Initial liquidity is split 50/50 into YES/NO pools. Prices move with each trade and
                fees stay in the pool.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded border border-[var(--neon-red)]/60 bg-[var(--neon-red)]/10 px-3 py-2 font-mono text-xs text-[var(--neon-red)]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="font-mono text-xs uppercase tracking-[0.18em]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || statement.trim().length < 4 || description.trim().length < 4 || !closesAt}
              className="neon-glow-cyan border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 font-mono text-xs uppercase tracking-[0.18em] text-[var(--neon-cyan)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Market"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
