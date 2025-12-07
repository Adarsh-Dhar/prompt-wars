"use client"

import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { fetchAgentLogs, getPaymentToken, setPaymentToken, PEEK_PRICE, type AgentLog } from "@/lib/agent-server"
import { sendSolPayment } from "@/lib/payments"

interface ChainOfThoughtProps {
  agentId: string
  initialLogs?: any[]
}

export function ChainOfThought({ agentId, initialLogs = [] }: ChainOfThoughtProps) {
  const [logs, setLogs] = useState<AgentLog[]>(initialLogs || [])
  const [loading, setLoading] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [hasPaid, setHasPaid] = useState(false)
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()

  // Check if user has payment token on mount
  useEffect(() => {
    const token = getPaymentToken()
    setHasPaid(!!token)
  }, [])

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        const data = await fetchAgentLogs()
        setLogs(data.logs || [])
      } catch (error) {
        console.error("Error fetching logs:", error)
      } finally {
        setLoading(false)
      }
    }

    // Fetch logs initially and then poll for updates
    fetchLogs()
    const interval = setInterval(fetchLogs, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [])

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

    try {
      setUnlocking(true)
      
      // Send payment
      if (!sendTransaction) {
        throw new Error("Wallet sendTransaction not available")
      }
      const signature = await sendSolPayment(connection, { publicKey, sendTransaction } as any, serverWallet, PEEK_PRICE)
      
      // Store payment token
      setPaymentToken(signature)
      setHasPaid(true)
      
      // Immediately refresh logs with payment token
      const data = await fetchAgentLogs(signature)
      setLogs(data.logs || [])
    } catch (error: any) {
      console.error("Error unlocking logs:", error)
      alert(error.message || "Failed to unlock logs")
    } finally {
      setUnlocking(false)
    }
  }

  // Separate logs by type
  const publicLogs = logs.filter((log) => 
    log.type === "thought" || 
    log.type === "agent_speech" || 
    log.type === "system"
  )
  
  const premiumLogs = logs.filter((log) => 
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
            {/* Premium logs content */}
            {premiumLogs.length > 0 && (
              <div className={`h-full overflow-y-auto p-4 ${!hasPaid ? 'blur-sm' : ''}`}>
                <div className="space-y-2">
                  {premiumLogs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        [{formatTime(log.timestamp)}]
                      </span>
                      <span className={`font-mono text-xs ${hasPaid ? getLogColor(log.message) : 'text-muted-foreground'}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lock overlay - only show if not paid */}
            {!hasPaid && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--neon-magenta)]/50 bg-card">
                  <Lock className="h-8 w-8 text-[var(--neon-magenta)]" />
                </div>
                <Button 
                  onClick={handleUnlockLogs}
                  disabled={unlocking}
                  className="neon-glow-magenta border border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10 font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/20"
                >
                  {unlocking ? "Processing..." : "Unlock Real-Time Thoughts"}
                  <span className="ml-2 rounded bg-[var(--neon-magenta)]/20 px-1.5 py-0.5 text-[10px]">
                    {PEEK_PRICE} SOL via x402
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
