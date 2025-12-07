"use client"

import { useState } from "react"
import { Lock, Sparkles, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { sendGodModeInjection, GOD_MODE_PRICE } from "@/lib/agent-server"
import { sendSolPayment } from "@/lib/payments"

export function GodModeWhisper() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()

  const handleSendWhisper = async () => {
    if (!prompt.trim()) {
      alert("Please enter a prompt")
      return
    }

    if (!connected || !publicKey) {
      setVisible(true)
      return
    }

    if (!sendTransaction) {
      alert("Wallet sendTransaction not available")
      return
    }

    const serverWallet = process.env.NEXT_PUBLIC_SERVER_WALLET
    if (!serverWallet) {
      alert("Server wallet not configured")
      return
    }

    try {
      setLoading(true)

      // Send payment (1.0 SOL for God Mode)
      const signature = await sendSolPayment(
        connection,
        { publicKey, sendTransaction } as any,
        serverWallet,
        GOD_MODE_PRICE
      )

      // Send injection to agent server
      await sendGodModeInjection(prompt.trim(), signature)

      // Clear input and show success
      setPrompt("")
      alert("God Mode injection sent successfully! The agent will process it shortly.")
    } catch (error: any) {
      console.error("Error sending God Mode injection:", error)
      alert(error.message || "Failed to send God Mode injection")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-[var(--neon-magenta)]/30 bg-gradient-to-r from-[var(--neon-magenta)]/5 to-[var(--neon-cyan)]/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neon-magenta)]/50 bg-[var(--neon-magenta)]/10">
              <Sparkles className="h-5 w-5 text-[var(--neon-magenta)]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
                God Mode Whisper
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                Influence the agent{"'"}s decisions
              </p>
            </div>
          </div>

          {/* Input field */}
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading && prompt.trim()) {
                    handleSendWhisper()
                  }
                }}
                placeholder="Enter prompt to influence agent..."
                disabled={loading}
                className="border-border/50 bg-muted/30 pr-10 font-mono text-sm placeholder:text-muted-foreground/50"
              />
              {!connected && (
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            <Button
              onClick={handleSendWhisper}
              disabled={loading || !prompt.trim() || !connected}
              className="shrink-0 border border-[var(--neon-magenta)]/50 bg-[var(--neon-magenta)]/10 font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)] transition-all hover:bg-[var(--neon-magenta)]/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Whisper"
              )}
            </Button>
          </div>

          {/* Access badge */}
          <div className="flex items-center gap-2 rounded border border-[var(--neon-magenta)]/30 bg-[var(--neon-magenta)]/10 px-3 py-2">
            <Lock className="h-4 w-4 text-[var(--neon-magenta)]" />
            <span className="font-mono text-xs text-[var(--neon-magenta)]">
              {GOD_MODE_PRICE} SOL per injection
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
