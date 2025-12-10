"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { sendSolPayment } from "@/lib/payments"
import { initializeMarketDefinition, PREDICTION_MARKET_PROGRAM_ID } from "@/lib/prediction-market/idl"
import { initializeOnChainMarket, fetchMarket } from "@/lib/prediction-market/client"
import { PublicKey } from "@solana/web3.js"

export default function NewMarketPage() {
  const router = useRouter()
  const params = useParams<{ agentId: string }>()
  const agentId = Array.isArray(params?.agentId) ? params?.agentId[0] : params?.agentId
  const agentWalletEnv = process.env.NEXT_PUBLIC_AGENT_WALLET
  const [statement, setStatement] = useState("")
  const [description, setDescription] = useState("")
  const [closesAt, setClosesAt] = useState("")
  const [minBet, setMinBet] = useState("1")
  const [maxBet, setMaxBet] = useState("")
  const [initialLiquidity, setInitialLiquidity] = useState("0.1")
  const [feeBps, setFeeBps] = useState("100")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const closeDate = new Date(closesAt)
      if (isNaN(closeDate.getTime()) || closeDate.getTime() <= Date.now()) {
        setError("Close date must be in the future")
        setSubmitting(false)
        return
      }

      if (!connected || !publicKey || !sendTransaction) {
        setVisible(true)
        throw new Error("Connect wallet to create a market")
      }

      const serverWallet = process.env.NEXT_PUBLIC_SERVER_WALLET
      if (!serverWallet) {
        throw new Error("Server wallet not configured")
      }
      // Validate server wallet pubkey
      try {
        // eslint-disable-next-line no-new
        new PublicKey(serverWallet)
      } catch {
        throw new Error("Server wallet env is not a valid public key")
      }

      // Validate agent wallet pubkey (used for PDA derivation)
      if (!agentWalletEnv) {
        throw new Error("Agent wallet env (NEXT_PUBLIC_AGENT_WALLET) not configured")
      }
      let agentPk: PublicKey
      try {
        agentPk = new PublicKey(agentWalletEnv)
      } catch {
        throw new Error("Agent wallet env is not a valid public key")
      }

      const liquidityAmount = Number(initialLiquidity)
      if (!isFinite(liquidityAmount) || liquidityAmount <= 0) {
        throw new Error("Initial liquidity must be greater than zero")
      }

      // Debug: log the program's expected initialize_market shape for quick comparison
      console.info("[create-market] initialize_market requirements", {
        programId: PREDICTION_MARKET_PROGRAM_ID,
        args: initializeMarketDefinition?.args,
        accounts: initializeMarketDefinition?.accounts,
      })

      // Require a real payment equal to the seed liquidity
      const txSignature = await sendSolPayment(connection, { publicKey, sendTransaction } as any, serverWallet, liquidityAmount)

      // Create wallet adapter compatible with Anchor
      const anchorWallet = {
        publicKey: publicKey!,
        signTransaction: sendTransaction || (async (tx: any) => tx),
        signAllTransactions: async (txs: any[]) => {
          const signed = []
          for (const tx of txs) {
            signed.push(await sendTransaction!(tx, connection))
          }
          return signed
        },
        sendTransaction: sendTransaction!,
      } as any

      // Initialize on-chain market before hitting the API to ensure PDA exists
      const initSig = await initializeOnChainMarket({
        connection,
        wallet: anchorWallet,
        agent: agentPk,
        statement,
        closesAt: Math.floor(closeDate.getTime() / 1000),
        initialLiquidityLamports: Math.round(liquidityAmount * 1_000_000_000),
        feeBps: Number(feeBps),
      })

      // Verify the market now exists on-chain; abort if not
      const onChainMarket = await fetchMarket(connection, initSig.marketPda)
      if (!onChainMarket) {
        throw new Error("On-chain market initialization failed (PDA not found).")
      }

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
        txSignature,
        marketPda: initSig.marketPda.toBase58(),
        mints: {
          yesMint: initSig.yesMint.toBase58(),
          noMint: initSig.noMint.toBase58(),
          poolAuthority: initSig.poolAuthority.toBase58(),
          poolYesAccount: initSig.poolYesAccount.toBase58(),
          poolNoAccount: initSig.poolNoAccount.toBase58(),
          poolVault: initSig.poolVault.toBase58(),
        },
      }

      console.info("[create-market] outgoing payment args", {
        connection: connection.rpcEndpoint,
        recipient: serverWallet,
        amountSol: liquidityAmount,
        wallet: publicKey.toBase58(),
        txSignature,
      })

      console.info("[create-market] on-chain init", {
        marketPda: payload.marketPda,
        initSignature: initSig.signature,
        yesMint: payload.mints.yesMint,
        noMint: payload.mints.noMint,
        poolAuthority: payload.mints.poolAuthority,
        poolYesAccount: payload.mints.poolYesAccount,
        poolNoAccount: payload.mints.poolNoAccount,
        poolVault: payload.mints.poolVault,
      })

      console.info("[create-market] POST /api/arena/:agentId/markets payload", payload)

      const res = await fetch(`${baseUrl}/api/arena/${agentId}/markets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create market")
      }

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
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border/60 bg-card/80 p-6 shadow-lg"
        >
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Statement *
            </label>
            <Input
              required
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Will the agent ship feature X this week?"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Description *
            </label>
            <Textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add relevant context, assumptions, or success criteria."
              className="font-mono"
              rows={4}
            />
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
              disabled={submitting}
              className="neon-glow-cyan border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 font-mono text-xs uppercase tracking-[0.18em] text-[var(--neon-cyan)]"
            >
              {submitting ? "Creating..." : "Create Market"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
