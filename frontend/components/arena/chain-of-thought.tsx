"use client"

import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ChainOfThoughtProps {
  agentId: string
  initialLogs?: any[]
}

export function ChainOfThought({ agentId, initialLogs = [] }: ChainOfThoughtProps) {
  const [logs, setLogs] = useState(initialLogs || [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        const res = await fetch(`${baseUrl}/api/arena/${agentId}/logs?type=PUBLIC&limit=50`)
        if (!res.ok) throw new Error("Failed to fetch logs")
        const data = await res.json()
        setLogs(data.logs || [])
      } catch (error) {
        console.error("Error fetching logs:", error)
      } finally {
        setLoading(false)
      }
    }

    // Fetch logs initially and then poll for updates
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [agentId])

  const publicLogs = logs.filter((log) => log.type === "PUBLIC")
  const premiumLogs = logs.filter((log) => log.type === "PREMIUM")

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${hours}:${minutes}:${seconds}`
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
          {/* Public logs - top half */}
          <div className="h-[280px] overflow-y-auto bg-terminal-bg p-4">
            {loading && logs.length === 0 ? (
              <div className="font-mono text-xs text-muted-foreground">Loading logs...</div>
            ) : (
              <div className="space-y-2">
                {publicLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      [{formatTime(log.timestamp)}]
                    </span>
                    <span
                      className={`font-mono text-xs ${
                        log.content.includes("Buy signal") || log.content.includes("confirmed")
                          ? "text-[var(--neon-green)]"
                          : log.content.includes("Detected") || log.content.includes("Executing")
                            ? "text-[var(--neon-cyan)]"
                            : "text-foreground"
                      }`}
                    >
                      {log.content}
                    </span>
                  </div>
                ))}
                <div className="font-mono text-xs text-[var(--neon-cyan)] cursor-blink">{">"} _</div>
              </div>
            )}
          </div>

          {/* Blurred/Locked section - bottom half */}
          <div className="relative h-[220px] bg-terminal-bg">
            {/* Blurred content */}
            {premiumLogs.length > 0 && (
              <div className="h-full overflow-hidden p-4 blur-md">
                <div className="space-y-2">
                  {premiumLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        [{formatTime(log.timestamp)}]
                      </span>
                      <span className="font-mono text-xs text-foreground">{log.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--neon-magenta)]/50 bg-card">
                <Lock className="h-8 w-8 text-[var(--neon-magenta)]" />
              </div>
              <Button className="neon-glow-magenta border border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10 font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/20">
                Unlock Real-Time Thoughts
                <span className="ml-2 rounded bg-[var(--neon-magenta)]/20 px-1.5 py-0.5 text-[10px]">
                  0.1 SOL via x402
                </span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
