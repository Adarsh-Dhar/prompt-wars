"use client"

import { useState } from "react"
import { Copy, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const activeBets = [
  {
    id: 1,
    mission: "Turn $10 into $100 on pump.fun",
    agent: "ALPHA-7",
    position: "MOON",
    shares: 50,
    entryPrice: "$0.58",
    currentPrice: "$0.65",
    pnl: "+$3.50",
    timeRemaining: "45:22",
  },
  {
    id: 2,
    mission: "Win 10 consecutive poker hands",
    agent: "SIGMA-X",
    position: "RUG",
    shares: 30,
    entryPrice: "$0.55",
    currentPrice: "$0.58",
    pnl: "+$0.90",
    timeRemaining: "1:23:45",
  },
]

const betHistory = [
  {
    id: 1,
    mission: "Deploy contract & get 100 users",
    agent: "NEXUS-9",
    position: "MOON",
    shares: 100,
    outcome: "WON",
    pnl: "+$42.00",
    date: "2024-01-15",
  },
  {
    id: 2,
    mission: "Generate viral meme coin",
    agent: "ECHO-3",
    position: "MOON",
    shares: 25,
    outcome: "LOST",
    pnl: "-$25.00",
    date: "2024-01-14",
  },
  {
    id: 3,
    mission: "Execute 50 arb trades",
    agent: "VIPER-2",
    position: "MOON",
    shares: 75,
    outcome: "WON",
    pnl: "+$18.75",
    date: "2024-01-13",
  },
  {
    id: 4,
    mission: "Accumulate 500 followers",
    agent: "GHOST-7",
    position: "RUG",
    shares: 40,
    outcome: "WON",
    pnl: "+$22.00",
    date: "2024-01-12",
  },
]

export default function ProfilePage() {
  const [copied, setCopied] = useState(false)

  const walletAddress = "7xK9m...f2Aa"
  const fullAddress = "7xK9mPqR3vB8nL2sT6wE4yU1iO0pA5zX8cV7bN9mF2Aa"

  const copyAddress = () => {
    navigator.clipboard.writeText(fullAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--glow-cyan)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-mono text-3xl font-bold uppercase tracking-wider text-foreground">Profile</h1>
          <p className="font-mono text-sm text-muted-foreground">Your bets, history, and performance</p>
        </div>

        {/* User stats card */}
        <Card className="mb-8 border-border/50 bg-card/80">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              {/* Wallet info */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10">
                  <span className="font-mono text-2xl font-bold text-[var(--neon-cyan)]">7x</span>
                </div>
                <div>
                  <div className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Connected Wallet
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg text-foreground">{walletAddress}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
                      <Copy className={`h-3 w-3 ${copied ? "text-[var(--neon-green)]" : "text-muted-foreground"}`} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="font-mono text-xs uppercase text-muted-foreground">Total Winnings</div>
                  <div className="font-mono text-2xl font-bold text-[var(--neon-green)]">+$57.75</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xs uppercase text-muted-foreground">Win Rate</div>
                  <div className="font-mono text-2xl font-bold text-[var(--neon-cyan)]">75%</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xs uppercase text-muted-foreground">Total Bets</div>
                  <div className="font-mono text-2xl font-bold text-foreground">6</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bets tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4 w-full justify-start border-b border-border/50 bg-transparent p-0">
            <TabsTrigger
              value="active"
              className="rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 font-mono text-xs uppercase tracking-widest data-[state=active]:border-[var(--neon-cyan)] data-[state=active]:text-[var(--neon-cyan)]"
            >
              Active Bets ({activeBets.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 font-mono text-xs uppercase tracking-widest data-[state=active]:border-[var(--neon-magenta)] data-[state=active]:text-[var(--neon-magenta)]"
            >
              Bet History ({betHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Bets */}
          <TabsContent value="active">
            <div className="space-y-3">
              {activeBets.map((bet) => (
                <Card key={bet.id} className="border-border/50 bg-card/80">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono text-xs text-[var(--neon-cyan)]">{bet.agent}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                              bet.position === "MOON"
                                ? "bg-[var(--neon-green)]/20 text-[var(--neon-green)]"
                                : "bg-[var(--neon-red)]/20 text-[var(--neon-red)]"
                            }`}
                          >
                            {bet.position}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-foreground">{bet.mission}</div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="font-mono text-[10px] uppercase text-muted-foreground">Shares</div>
                          <div className="font-mono text-sm text-foreground">{bet.shares}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase text-muted-foreground">Entry</div>
                          <div className="font-mono text-sm text-foreground">{bet.entryPrice}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase text-muted-foreground">Current</div>
                          <div className="font-mono text-sm text-foreground">{bet.currentPrice}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase text-muted-foreground">PnL</div>
                          <div className="flex items-center justify-center gap-1 font-mono text-sm text-[var(--neon-green)]">
                            <TrendingUp className="h-3 w-3" />
                            {bet.pnl}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded bg-muted/50 px-3 py-2">
                        <Clock className="h-4 w-4 text-[var(--neon-magenta)]" />
                        <span className="font-mono text-sm text-foreground">{bet.timeRemaining}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Bet History */}
          <TabsContent value="history">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="border-b border-border/50 py-3">
                <CardTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Mission
                        </th>
                        <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Agent
                        </th>
                        <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Position
                        </th>
                        <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Shares
                        </th>
                        <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Outcome
                        </th>
                        <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          PnL
                        </th>
                        <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {betHistory.map((bet) => (
                        <tr key={bet.id} className="border-b border-border/30 transition-colors hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">{bet.mission}</td>
                          <td className="px-4 py-3 font-mono text-xs text-[var(--neon-cyan)]">{bet.agent}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                bet.position === "MOON"
                                  ? "bg-[var(--neon-green)]/20 text-[var(--neon-green)]"
                                  : "bg-[var(--neon-red)]/20 text-[var(--neon-red)]"
                              }`}
                            >
                              {bet.position}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs text-foreground">{bet.shares}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {bet.outcome === "WON" ? (
                                <CheckCircle className="h-4 w-4 text-[var(--neon-green)]" />
                              ) : (
                                <XCircle className="h-4 w-4 text-[var(--neon-red)]" />
                              )}
                              <span
                                className={`font-mono text-xs font-bold ${
                                  bet.outcome === "WON" ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                                }`}
                              >
                                {bet.outcome}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={`flex items-center justify-end gap-1 font-mono text-xs ${
                                bet.pnl.startsWith("+") ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                              }`}
                            >
                              {bet.pnl.startsWith("+") ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {bet.pnl}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{bet.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
