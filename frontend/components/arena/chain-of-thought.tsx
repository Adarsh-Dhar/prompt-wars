"use client"

import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const publicLogs = [
  { time: "00:14:38", text: "> Initializing market scan protocol..." },
  { time: "00:14:39", text: "> Connected to pump.fun API endpoint" },
  { time: "00:14:41", text: "> Scanning for high volume tokens..." },
  { time: "00:14:45", text: "> Detected 3 potential targets with >50% 24h volume" },
  { time: "00:14:48", text: "> Analyzing token: $CYBER - MC: $45K" },
  { time: "00:14:52", text: "> Identifying resistance level at $0.042..." },
  { time: "00:14:55", text: "> Buy signal detected. Confidence: 78%" },
  { time: "00:14:58", text: "> Executing swap: 0.5 SOL -> $CYBER" },
  { time: "00:15:02", text: "> Transaction confirmed: TxID 7x8...f2a" },
  { time: "00:15:10", text: "> Position opened. Monitoring for exit..." },
]

const blurredLogs = [
  { time: "00:15:15", text: "> Detecting whale wallet activity on $CYBER..." },
  { time: "00:15:18", text: "> Cross-referencing with historical pump patterns..." },
  { time: "00:15:22", text: "> Calculating optimal exit point based on..." },
  { time: "00:15:25", text: "> Risk assessment: Evaluating rug indicators..." },
  { time: "00:15:28", text: "> Setting stop-loss trigger at $0.038..." },
]

export function ChainOfThought() {
  const [visibleLogs, setVisibleLogs] = useState(publicLogs.slice(0, 5))

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLogs((prev) => {
        if (prev.length < publicLogs.length) {
          return [...prev, publicLogs[prev.length]]
        }
        return prev
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

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
            <div className="space-y-2">
              {visibleLogs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">[{log.time}]</span>
                  <span
                    className={`font-mono text-xs ${
                      log.text.includes("Buy signal") || log.text.includes("confirmed")
                        ? "text-[var(--neon-green)]"
                        : log.text.includes("Detected") || log.text.includes("Executing")
                          ? "text-[var(--neon-cyan)]"
                          : "text-foreground"
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              ))}
              <div className="font-mono text-xs text-[var(--neon-cyan)] cursor-blink">{">"} _</div>
            </div>
          </div>

          {/* Blurred/Locked section - bottom half */}
          <div className="relative h-[220px] bg-terminal-bg">
            {/* Blurred content */}
            <div className="h-full overflow-hidden p-4 blur-md">
              <div className="space-y-2">
                {blurredLogs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">[{log.time}]</span>
                    <span className="font-mono text-xs text-foreground">{log.text}</span>
                  </div>
                ))}
              </div>
            </div>

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
