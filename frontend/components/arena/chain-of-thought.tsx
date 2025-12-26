"use client"

import { useEffect, useState, useRef } from "react"
import { Lock, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { fetchAgentLogs, fetchPremiumLogs, getPaymentToken, setPaymentToken, clearPaymentToken, PEEK_PRICE, type AgentLog, type AgentLogsResponse } from "@/lib/agent-server"
import { getSafeWalletAdapter } from "@/lib/blockchain-adapter"

interface ChainOfThoughtProps {
  agentId: string
  initialLogs?: any[]
}

export function ChainOfThought({ agentId, initialLogs = [] }: ChainOfThoughtProps) {
  const [logs, setLogs] = useState<AgentLog[]>(initialLogs || [])
  const [loading, setLoading] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [chainStatus, setChainStatus] = useState<{
    valid: boolean | null;
    errors?: string[];
    warnings?: string[];
    agentPublicKey?: string;
  } | null>(null)
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
        const data = await fetchAgentLogs(agentId, token, connection, connected && publicKey ? { publicKey, connected, sendTransaction } as any : null)

        const baseLogs = data.logs || []
        const hasPaymentAccess = timeRemaining !== null && timeRemaining > 0

        // Update chain verification status
        const responseData = data as AgentLogsResponse & {
          chainValid?: boolean | null;
          verificationErrors?: string[];
          verificationWarnings?: string[];
        };
        
        if (responseData.chainValid !== undefined) {
          setChainStatus({
            valid: responseData.chainValid,
            errors: responseData.verificationErrors,
            warnings: responseData.verificationWarnings,
            agentPublicKey: responseData.agent_public_key
          });
        } else {
          setChainStatus(null);
        }

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
  }, [timeRemaining, connection, connected, publicKey, sendTransaction]) // Re-fetch when payment timer changes

  const handleUnlockLogs = async () => {
    if (!connected || !publicKey || !connection) {
      setVisible(true)
      return
    }

    if (!sendTransaction) {
      alert("Wallet sendTransaction not available")
      return
    }

    try {
      setUnlocking(true)

      // Use fetchPremiumLogs which handles 402 payment flow automatically
      // It will trigger payment if needed and retry with signature
      const safeWallet = getSafeWalletAdapter({ publicKey, connected, sendTransaction } as any, connection)
      const result = await fetchPremiumLogs(agentId, connection, safeWallet as any)

      // Get the signature from the result (set by fetchPremiumLogs internally)
      const signature = result.signature
      if (signature) {
        setPaymentToken(signature)
        setTimeRemaining(10) // Start with 10 seconds
        
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
      }

      // Update logs with premium data
      setLogs(result.data.logs || [])
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

  const getChainStatusIcon = () => {
    if (chainStatus === null) return null;
    if (chainStatus.valid === true) {
      return <CheckCircle2 className="h-4 w-4 text-[var(--neon-green)]" />;
    }
    if (chainStatus.valid === false) {
      return <AlertTriangle className="h-4 w-4 text-[var(--neon-red)]" />;
    }
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)]">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--neon-magenta)]" />
            Live Chain of Thought Logs
          </CardTitle>
          {chainStatus && (
            <div className="flex items-center gap-2">
              {getChainStatusIcon()}
              <span className="font-mono text-xs text-muted-foreground">
                {chainStatus.valid === true ? 'Verified' : chainStatus.valid === false ? 'Corrupted' : 'Unverified'}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {/* Chain Corruption Warning */}
        {chainStatus && chainStatus.valid === false && chainStatus.errors && chainStatus.errors.length > 0 && (
          <Alert className="m-4 border-[var(--neon-red)] bg-[var(--neon-red)]/10">
            <AlertTriangle className="h-4 w-4 text-[var(--neon-red)]" />
            <AlertTitle className="font-mono text-sm text-[var(--neon-red)]">Chain Corruption Detected</AlertTitle>
            <AlertDescription className="font-mono text-xs text-muted-foreground mt-2">
              <div className="space-y-1">
                {chainStatus.errors.map((error, idx) => (
                  <div key={idx}>• {error}</div>
                ))}
              </div>
              {chainStatus.agentPublicKey && (
                <div className="mt-2 pt-2 border-t border-[var(--neon-red)]/20">
                  Agent: {chainStatus.agentPublicKey.substring(0, 8)}...{chainStatus.agentPublicKey.slice(-8)}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Chain Verification Warnings */}
        {chainStatus && chainStatus.valid === true && chainStatus.warnings && chainStatus.warnings.length > 0 && (
          <Alert className="m-4 border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="font-mono text-sm text-yellow-500">Verification Warning</AlertTitle>
            <AlertDescription className="font-mono text-xs text-muted-foreground mt-2">
              {chainStatus.warnings.map((warning, idx) => (
                <div key={idx}>• {warning}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
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
