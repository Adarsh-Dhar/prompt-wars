"use client"

import { useEffect, useState, useRef } from "react"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { fetchAgentLogs, getPaymentToken, setPaymentToken, clearPaymentToken, PEEK_PRICE, type AgentLog } from "@/lib/agent-server"
import { sendSolPayment } from "@/lib/payments"
import { assertPaymentToServer, solToLamports } from "@/lib/solana/transactions"
import { PublicKey } from "@solana/web3.js"
import { getConnection as getClusterConnection } from "@/lib/solana/client"

interface ChainOfThoughtProps {
  agentId: string
  initialLogs?: any[]
}

export function ChainOfThought({ agentId, initialLogs = [] }: ChainOfThoughtProps) {
  const [logs, setLogs] = useState<AgentLog[]>(initialLogs || [])
  const [loading, setLoading] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const paymentTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (paymentTimerRef.current) {
        clearTimeout(paymentTimerRef.current)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        // Always pass payment token if available
        const token = getPaymentToken()
        const data = await fetchAgentLogs(token)

        const baseLogs = data.logs || []
        const hasPaymentAccess = timeRemaining !== null && timeRemaining > 0

        // Surface a success alert once while access is active
        const paymentOkLog: AgentLog = {
          id: "payment-ok",
          type: "alert",
          timestamp: new Date().toISOString(),
          message: "Payment verified; premium logs unlocked."
        }

        const withStatus = hasPaymentAccess && !baseLogs.some((log) => log.id === "payment-ok")
          ? [paymentOkLog, ...baseLogs]
          : baseLogs

        setLogs(withStatus)
      } catch (error) {
        console.error("Error fetching logs:", error)
        const message = (error as any)?.message || "Failed to fetch logs"
        setLogs((prev) => [
          {
            id: `payment-error-${Date.now()}`,
            type: "alert",
            timestamp: new Date().toISOString(),
            message: `Payment verification failed: ${message}`
          },
          ...(prev || [])
        ])
      } finally {
        setLoading(false)
      }
    }

    // Fetch logs initially and then poll for updates
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [timeRemaining]) // Re-fetch when payment timer changes

  const handleUnlockLogs = async () => {
    if (!connected || !publicKey) {
      setVisible(true)
      return
    }

    const serverWallet = process.env.NEXT_PUBLIC_SERVER_WALLET
    if (!serverWallet) {
      alert("Server wallet not configured")
      return
    }

    const serverPubkey = new PublicKey(serverWallet)
    const paymentConnection = getClusterConnection()

    // Guard against cluster mismatch: wallet must be on the same cluster as paymentConnection
    const endpoint = (connection as any)?.rpcEndpoint || ""
    if (endpoint && endpoint.includes("mainnet") && paymentConnection.rpcEndpoint.includes("devnet")) {
      alert("Please switch wallet to devnet to send this transaction.")
      return
    }

    try {
      setUnlocking(true)
      const userBalanceBefore = await paymentConnection.getBalance(publicKey, "confirmed")
      const serverBalanceBefore = await paymentConnection.getBalance(serverPubkey, "confirmed")

      // Send payment
      if (!sendTransaction) {
        throw new Error("Wallet sendTransaction not available")
      }
      const signature = await sendSolPayment(paymentConnection, { publicKey, sendTransaction } as any, serverWallet, PEEK_PRICE)
      console.info("ChainOfThought payment signature", signature, {
        amountSol: PEEK_PRICE,
        userBalanceBefore,
        serverBalanceBefore,
      })
      // Confirm on-chain that payment hit the server wallet for the expected amount
      await assertPaymentToServer(signature, solToLamports(PEEK_PRICE), publicKey.toBase58())

      const userBalanceAfter = await paymentConnection.getBalance(publicKey, "confirmed")
      const serverBalanceAfter = await paymentConnection.getBalance(serverPubkey, "confirmed")
      console.info("ChainOfThought payment confirmed", {
        signature,
        amountSol: PEEK_PRICE,
        userBalanceBefore,
        userBalanceAfter,
        serverBalanceBefore,
        serverBalanceAfter,
      })

      // Store payment token
      setPaymentToken(signature)
      setTimeRemaining(10) // Start with 10 seconds
      
      // Immediately refresh logs with payment token
      const data = await fetchAgentLogs(signature)
      setLogs(data.logs || [])
      
      // Clear any existing timers
      if (paymentTimerRef.current) {
        clearTimeout(paymentTimerRef.current)
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
      }
      
      // Start countdown timer
      countdownTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      // Set 10-second timer to expire access
      paymentTimerRef.current = setTimeout(() => {
        clearPaymentToken()
        setTimeRemaining(null)
        paymentTimerRef.current = null
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
        }
      }, 10000) // 10 seconds
    } catch (error: any) {
      console.error("Error unlocking logs:", error)
      const message = error?.message || "Failed to unlock logs"
      setLogs((prev) => [
        {
          id: `payment-error-${Date.now()}`,
          type: "alert",
          timestamp: new Date().toISOString(),
          message: `Payment failed: ${message}`,
        },
        ...(prev || []),
      ])
      alert(message)
    } finally {
      setUnlocking(false)
    }
  }

  // Separate logs by type
  // Note: "thought" logs are now premium and require payment
  const publicLogs = logs.filter((log) => 
    log.type === "agent_speech" || 
    log.type === "system"
  )
  
  const premiumLogs = logs.filter((log) => 
    log.type === "thought" ||
    log.type === "tool_use" || 
    log.type === "tool_result" || 
    log.type === "premium"
  )
  
  const alertLogs = logs.filter((log) => log.type === "alert")

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${hours}:${minutes}:${seconds}`
  }

  const getLogColor = (message: string) => {
    if (message.includes("Buy signal") || message.includes("confirmed")) {
      return "text-[var(--neon-green)]"
    }
    if (message.includes("Detected") || message.includes("Executing")) {
      return "text-[var(--neon-cyan)]"
    }
    if (message.includes("GOD MODE") || message.includes("INTERVENTION")) {
      return "text-[var(--neon-red)]"
    }
    return "text-foreground"
  }

  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)]">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-magenta)]" />
          Live Chain of Thought Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {/* Scrollable terminal */}
        <div className="h-[500px] overflow-hidden">
          {/* Public logs + Alert logs - top half */}
          <div className="h-[280px] overflow-y-auto bg-terminal-bg p-4">
            {loading && logs.length === 0 ? (
              <div className="font-mono text-xs text-muted-foreground">Loading logs...</div>
            ) : (
              <div className="space-y-2">
                {/* Show alert logs first (always visible) */}
                {alertLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      [{formatTime(log.timestamp)}]
                    </span>
                    <span className={`font-mono text-xs ${getLogColor(log.message)}`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                
                {/* Show public logs */}
                {publicLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      [{formatTime(log.timestamp)}]
                    </span>
                    <span className={`font-mono text-xs ${getLogColor(log.message)}`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                
                {logs.length === 0 && !loading && (
                  <div className="font-mono text-xs text-muted-foreground">No logs yet...</div>
                )}
                <div className="font-mono text-xs text-[var(--neon-cyan)] cursor-blink">{">"} _</div>
              </div>
            )}
          </div>

          {/* Premium/Redacted section - bottom half */}
          <div className="relative h-[220px] bg-terminal-bg">
            {/* Premium logs content (including thought logs which are now premium) */}
            {premiumLogs.length > 0 && (
              <div className="relative z-0 h-full overflow-y-auto p-4 pr-28">
                <div className="space-y-2">
                  {premiumLogs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        [{formatTime(log.timestamp)}]
                      </span>
                      <span className={`font-mono text-xs ${timeRemaining !== null && timeRemaining > 0 ? getLogColor(log.message) : 'text-muted-foreground'}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment overlay - hide when time is remaining, show when expired */}
            {timeRemaining === null || timeRemaining === 0 ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background">
                <div className="relative z-20 mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--neon-magenta)] bg-card shadow-lg">
                  <Lock className="h-8 w-8 text-[var(--neon-magenta)]" />
                </div>
                <Button 
                  onClick={handleUnlockLogs}
                  disabled={unlocking}
                  className="relative z-20 neon-glow-magenta border-2 border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/20 font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)] shadow-lg hover:bg-[var(--neon-magenta)]/30"
                >
                  {unlocking ? "Processing..." : "Unlock Real-Time Thoughts"}
                  <span className="ml-2 rounded bg-[var(--neon-magenta)]/30 px-1.5 py-0.5 text-[10px] font-bold">
                    {PEEK_PRICE} SOL via x402
                  </span>
                </Button>
              </div>
            ) : (
              /* Show countdown and extend button in corner when time is remaining */
              <div className="pointer-events-none absolute bottom-2 right-2 z-20 flex flex-col items-end gap-2">
                <div className="rounded border-2 border-[var(--neon-magenta)] bg-card px-4 py-2 font-mono text-sm font-bold text-[var(--neon-magenta)] shadow-lg">
                  {timeRemaining}s remaining
                </div>
                <Button 
                  onClick={handleUnlockLogs}
                  disabled={unlocking}
                  size="sm"
                  className="pointer-events-auto border-2 border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/20 font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)] shadow-lg hover:bg-[var(--neon-magenta)]/30"
                >
                  {unlocking ? "Processing..." : "Extend"}
                  <span className="ml-1 rounded bg-[var(--neon-magenta)]/30 px-1 py-0.5 text-[10px] font-bold">
                    {PEEK_PRICE} SOL
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
