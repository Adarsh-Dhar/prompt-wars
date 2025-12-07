"use client"

import { ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const recentTrades = [
  { user: "0x8A...f2", action: "bought", shares: 50, type: "MOON", time: "2s ago" },
  { user: "0x3C...9a", action: "sold", shares: 25, type: "RUG", time: "8s ago" },
  { user: "0xB7...1d", action: "bought", shares: 100, type: "MOON", time: "15s ago" },
  { user: "0x92...e4", action: "bought", shares: 30, type: "RUG", time: "23s ago" },
  { user: "0x5F...8b", action: "bought", shares: 75, type: "MOON", time: "31s ago" },
  { user: "0xD1...c7", action: "sold", shares: 40, type: "MOON", time: "45s ago" },
]

export function PredictionMarket() {
  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <CardTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--neon-lime)]">
          Prediction Market
          <span className="rounded bg-[var(--neon-lime)]/20 px-1.5 py-0.5 text-[10px] text-[var(--neon-lime)]">
            icm.run
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        {/* Betting buttons */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {/* MOON Button */}
          <Button className="group relative h-24 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-green)] bg-[var(--neon-green)]/10 transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_30px_rgba(0,255,100,0.3)]">
            <ArrowUp className="h-6 w-6 text-[var(--neon-green)] transition-transform group-hover:-translate-y-1" />
            <span className="font-mono text-lg font-bold text-[var(--neon-green)]">MOON</span>
            <span className="font-mono text-xs text-[var(--neon-green)]/80">Buy Yes • $0.65</span>
          </Button>

          {/* RUG Button */}
          <Button className="group relative h-24 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-red)] bg-[var(--neon-red)]/10 transition-all hover:bg-[var(--neon-red)]/20 hover:shadow-[0_0_30px_rgba(255,50,50,0.3)]">
            <ArrowDown className="h-6 w-6 text-[var(--neon-red)] transition-transform group-hover:translate-y-1" />
            <span className="font-mono text-lg font-bold text-[var(--neon-red)]">RUG</span>
            <span className="font-mono text-xs text-[var(--neon-red)]/80">Buy No • $0.35</span>
          </Button>
        </div>

        {/* Market stats */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-xs uppercase text-muted-foreground">Total Volume</div>
            <div className="font-mono text-lg font-bold text-foreground">$12,450</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-xs uppercase text-muted-foreground">Liquidity</div>
            <div className="font-mono text-lg font-bold text-foreground">$8,230</div>
          </div>
        </div>

        {/* Recent trades */}
        <div className="rounded border border-border/50 bg-terminal-bg">
          <div className="border-b border-border/50 px-3 py-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Recent Trades</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            <div className="space-y-1">
              {recentTrades.map((trade, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{trade.user}</span>
                    <span className="font-mono text-xs text-foreground">
                      {trade.action} {trade.shares}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        trade.type === "MOON" ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                      }`}
                    >
                      {trade.type}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">{trade.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
