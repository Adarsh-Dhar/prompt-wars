"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import * as anchor from "@coral-xyz/anchor";
import { autoResolveFromProof } from "@/lib/auto-resolve"
import { getPaymentToken } from "@/lib/agent-server"
import { getSafeWalletAdapter } from "@/lib/blockchain-adapter"

interface AutoResolveButtonProps {
  marketId: string
  agentWallet: string
  agentId: string
  agentServerUrl?: string
}

export function AutoResolveButton({
  marketId,
  agentWallet,
  agentId,
  agentServerUrl,
}: AutoResolveButtonProps) {
  const [resolving, setResolving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<string | null>(null)
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()

  const handleAutoResolve = async () => {
    setResolving(true)
    setMessage(null)
    setOutcome(null)

    try {
      if (!connected || !publicKey || !sendTransaction) {
        setVisible(true)
        throw new Error("Connect wallet to auto-resolve")
      }

      const marketIdPubkey = new anchor.web3.PublicKey(marketId)
      const agentWalletPubkey = new anchor.web3.PublicKey(agentWallet)

      // Get payment token if available (for x402)
      const paymentSignature = getPaymentToken()

      // Create wallet adapter
      const safeWallet = getSafeWalletAdapter({ publicKey, connected, sendTransaction } as any, connection)
      const wallet = safeWallet as any

      // Call auto-resolve service
      const result = await autoResolveFromProof({
        connection,
        wallet,
        agentWallet: agentWalletPubkey,
        marketId: marketIdPubkey,
        agentServerUrl,
        paymentSignature,
      })

      if (result.success && result.outcome) {
        setOutcome(result.outcome.toUpperCase())
        setMessage(
          `Market auto-resolved as ${result.outcome.toUpperCase()}! Transaction: ${result.resolutionSignature}`
        )
      } else {
        setMessage(result.error || "Failed to auto-resolve market")
      }
    } catch (error: any) {
      console.error("Auto-resolve error:", error)
      setMessage(error.message || "Failed to auto-resolve market")
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--neon-green)]">
          Auto-Resolve from Proof
        </p>
        {outcome && (
          <span className="font-mono text-[11px] text-muted-foreground">Outcome: {outcome}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleAutoResolve}
          disabled={resolving}
          className="neon-glow-green border border-[var(--neon-green)] bg-[var(--neon-green)]/10 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--neon-green)]"
        >
          {resolving ? "Resolving..." : "Auto-Resolve from Proof"}
        </Button>
        {message && (
          <span
            className={`font-mono text-xs ${
              outcome ? "text-[var(--neon-green)]" : "text-muted-foreground"
            }`}
          >
            {message}
          </span>
        )}
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">
        Automatically resolves market by parsing proof logs from agent. Requires proof to be
        submitted first.
      </p>
    </div>
  )
}
