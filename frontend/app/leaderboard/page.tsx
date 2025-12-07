"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trophy, Target, Zap, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LeaderboardEntry {
  rank: number
  walletAddress: string
  totalWinnings: number
  winRate: number | null
  totalBets: number
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"winnings" | "winRate" | "bets">("winnings")
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
        const res = await fetch(`${baseUrl}/api/leaderboard?sortBy=${activeTab}&limit=100`)
        
        if (!res.ok) throw new Error("Failed to fetch leaderboard")
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
      } catch (err) {
        console.error("Error fetching leaderboard:", err)
        setError("Failed to load leaderboard")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [activeTab])

  const formatWallet = (address: string) => {
    if (!address) return ""
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatWinnings = (winnings: number) => {
    const sign = winnings >= 0 ? "+" : ""
    if (Math.abs(winnings) >= 1000000) return `${sign}$${(Math.abs(winnings) / 1000000).toFixed(2)}M`
    if (Math.abs(winnings) >= 1000) return `${sign}$${(Math.abs(winnings) / 1000).toFixed(2)}K`
    return `${sign}$${winnings.toFixed(2)}`
  }

  const formatWinRate = (winRate: number | null) => {
    if (winRate === null) return "N/A"
    return `${winRate.toFixed(1)}%`
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return null
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-[var(--neon-lime)]"
    if (rank === 2) return "text-[var(--neon-cyan)]"
    if (rank === 3) return "text-[var(--neon-magenta)]"
    return "text-foreground"
  }

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--glow-cyan)_0%,_transparent_50%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-mono text-3xl font-bold uppercase tracking-wider text-foreground">
            Leaderboard
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            Top performers across the platform • Compete for the top spots
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="mb-6 w-full justify-start border-b border-border/50 bg-transparent p-0">
            <TabsTrigger
              value="winnings"
              className="rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 font-mono text-xs uppercase tracking-widest data-[state=active]:border-[var(--neon-lime)] data-[state=active]:text-[var(--neon-lime)]"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Top Earners
            </TabsTrigger>
            <TabsTrigger
              value="winRate"
              className="rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 font-mono text-xs uppercase tracking-widest data-[state=active]:border-[var(--neon-cyan)] data-[state=active]:text-[var(--neon-cyan)]"
            >
              <Target className="mr-2 h-4 w-4" />
              Best Accuracy
            </TabsTrigger>
            <TabsTrigger
              value="bets"
              className="rounded-none border-b-2 border-transparent bg-transparent px-6 py-3 font-mono text-xs uppercase tracking-widest data-[state=active]:border-[var(--neon-magenta)] data-[state=active]:text-[var(--neon-magenta)]"
            >
              <Zap className="mr-2 h-4 w-4" />
              Most Active
            </TabsTrigger>
          </TabsList>

          {/* Top Earners Tab */}
          <TabsContent value="winnings">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="border-b border-border/50 py-3">
                <CardTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
                  Top Earners by Total Winnings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center font-mono text-sm text-muted-foreground">Loading leaderboard...</div>
                ) : error ? (
                  <div className="p-8 text-center font-mono text-sm text-red-500">{error}</div>
                ) : leaderboard.length === 0 ? (
                  <div className="p-8 text-center font-mono text-sm text-muted-foreground">No data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Wallet
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Total Winnings
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Win Rate
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Total Bets
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry) => (
                          <tr
                            key={entry.walletAddress}
                            className="border-b border-border/30 transition-colors hover:bg-muted/20"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {getRankIcon(entry.rank) && (
                                  <span className="text-lg">{getRankIcon(entry.rank)}</span>
                                )}
                                <span className={`font-mono text-sm font-bold ${getRankColor(entry.rank)}`}>
                                  #{entry.rank}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/profile?wallet=${entry.walletAddress}`}
                                className="font-mono text-sm text-[var(--neon-cyan)] hover:underline"
                              >
                                {formatWallet(entry.walletAddress)}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={`font-mono text-sm font-bold ${
                                  entry.totalWinnings >= 0
                                    ? "text-[var(--neon-green)]"
                                    : "text-[var(--neon-red)]"
                                }`}
                              >
                                {formatWinnings(entry.totalWinnings)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-mono text-sm text-foreground">
                                {formatWinRate(entry.winRate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-mono text-sm text-foreground">{entry.totalBets}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Best Accuracy Tab */}
          <TabsContent value="winRate">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="border-b border-border/50 py-3">
                <CardTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
                  Best Accuracy by Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center font-mono text-sm text-muted-foreground">Loading leaderboard...</div>
                ) : error ? (
                  <div className="p-8 text-center font-mono text-sm text-red-500">{error}</div>
                ) : leaderboard.length === 0 ? (
                  <div className="p-8 text-center font-mono text-sm text-muted-foreground">No data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Wallet
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Win Rate
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Total Winnings
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Total Bets
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry) => (
                          <tr
                            key={entry.walletAddress}
                            className="border-b border-border/30 transition-colors hover:bg-muted/20"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {getRankIcon(entry.rank) && (
                                  <span className="text-lg">{getRankIcon(entry.rank)}</span>
                                )}
                                <span className={`font-mono text-sm font-bold ${getRankColor(entry.rank)}`}>
                                  #{entry.rank}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/profile?wallet=${entry.walletAddress}`}
                                className="font-mono text-sm text-[var(--neon-cyan)] hover:underline"
                              >
                                {formatWallet(entry.walletAddress)}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-mono text-sm font-bold text-[var(--neon-cyan)]">
                                {formatWinRate(entry.winRate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={`font-mono text-sm ${
                                  entry.totalWinnings >= 0
                                    ? "text-[var(--neon-green)]"
                                    : "text-[var(--neon-red)]"
                                }`}
                              >
                                {formatWinnings(entry.totalWinnings)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-mono text-sm text-foreground">{entry.totalBets}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Most Active Tab */}
          <TabsContent value="bets">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="border-b border-border/50 py-3">
                <CardTitle className="font-mono text-xs uppercase tracking-widest text-foreground">
                  Most Active by Total Bets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center font-mono text-sm text-muted-foreground">Loading leaderboard...</div>
                ) : error ? (
                  <div className="p-8 text-center font-mono text-sm text-red-500">{error}</div>
                ) : leaderboard.length === 0 ? (
                  <div className="p-8 text-center font-mono text-sm text-muted-foreground">No data available</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Rank
                          </th>
                          <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Wallet
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Total Bets
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Win Rate
                          </th>
                          <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Total Winnings
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry) => (
                          <tr
                            key={entry.walletAddress}
                            className="border-b border-border/30 transition-colors hover:bg-muted/20"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {getRankIcon(entry.rank) && (
                                  <span className="text-lg">{getRankIcon(entry.rank)}</span>
                                )}
                                <span className={`font-mono text-sm font-bold ${getRankColor(entry.rank)}`}>
                                  #{entry.rank}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/profile?wallet=${entry.walletAddress}`}
                                className="font-mono text-sm text-[var(--neon-cyan)] hover:underline"
                              >
                                {formatWallet(entry.walletAddress)}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TrendingUp className="h-3 w-3 text-[var(--neon-magenta)]" />
                                <span className="font-mono text-sm font-bold text-[var(--neon-magenta)]">
                                  {entry.totalBets}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-mono text-sm text-foreground">
                                {formatWinRate(entry.winRate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span
                                className={`font-mono text-sm ${
                                  entry.totalWinnings >= 0
                                    ? "text-[var(--neon-green)]"
                                    : "text-[var(--neon-red)]"
                                }`}
                              >
                                {formatWinnings(entry.totalWinnings)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

