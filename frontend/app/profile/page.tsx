"use client"

import { useState, useEffect } from "react"
import { Copy, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

export default function ProfilePage() {
  const [copied, setCopied] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [activeBets, setActiveBets] = useState<any[]>([])
  const [betHistory, setBetHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [walletInput, setWalletInput] = useState("")

  useEffect(() => {
    // Try to get wallet from localStorage or URL params
    const storedWallet = localStorage.getItem("walletAddress")
    const urlParams = new URLSearchParams(window.location.search)
    const walletParam = urlParams.get("wallet")
    const wallet = walletParam || storedWallet || ""

    if (wallet) {
      setWalletAddress(wallet)
      fetchProfileData(wallet)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProfileData = async (wallet: string) => {
    try {
      setLoading(true)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin

      // Fetch profile
      const profileRes = await fetch(`${baseUrl}/api/profile/${wallet}`)
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData.user)
      }

      // Fetch active bets
      const betsRes = await fetch(`${baseUrl}/api/profile/${wallet}/bets?status=ACTIVE`)
      if (betsRes.ok) {
        const betsData = await betsRes.json()
        setActiveBets(betsData.bets || [])
      }

      // Fetch bet history
      const historyRes = await fetch(`${baseUrl}/api/profile/${wallet}/history`)
      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setBetHistory(historyData.history || [])
      }
    } catch (error) {
      console.error("Error fetching profile data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleWalletSubmit = () => {
    if (walletInput.trim()) {
      const wallet = walletInput.trim()
      setWalletAddress(wallet)
      localStorage.setItem("walletAddress", wallet)
      fetchProfileData(wallet)
    }
  }

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatWallet = (address: string) => {
    if (!address) return ""
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatWinnings = (winnings: number) => {
    const sign = winnings >= 0 ? "+" : ""
    return `${sign}$${winnings.toFixed(2)}`
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

        {/* Wallet input if not set */}
        {!walletAddress && (
          <Card className="mb-8 border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="font-mono text-sm text-foreground">Enter your wallet address to view your profile</div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Wallet address"
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    className="font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleWalletSubmit()}
                  />
                  <Button onClick={handleWalletSubmit} className="font-mono">
                    Load Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center font-mono text-sm text-muted-foreground py-12">Loading profile...</div>
        ) : walletAddress && profile ? (
          <>
            {/* User stats card */}
            <Card className="mb-8 border-border/50 bg-card/80">
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  {/* Wallet info */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10">
                      <span className="font-mono text-2xl font-bold text-[var(--neon-cyan)]">
                        {walletAddress.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Connected Wallet
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg text-foreground">{formatWallet(walletAddress)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
                          <Copy
                            className={`h-3 w-3 ${copied ? "text-[var(--neon-green)]" : "text-muted-foreground"}`}
                          />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="font-mono text-xs uppercase text-muted-foreground">Total Winnings</div>
                      <div
                        className={`font-mono text-2xl font-bold ${
                          profile.totalWinnings >= 0 ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                        }`}
                      >
                        {formatWinnings(profile.totalWinnings)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-xs uppercase text-muted-foreground">Win Rate</div>
                      <div className="font-mono text-2xl font-bold text-[var(--neon-cyan)]">
                        {profile.winRate.toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-xs uppercase text-muted-foreground">Total Bets</div>
                      <div className="font-mono text-2xl font-bold text-foreground">{profile.totalBets}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Bets tabs */}
        {walletAddress && profile && (
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
              {activeBets.length === 0 ? (
                <div className="text-center font-mono text-sm text-muted-foreground py-12">No active bets</div>
              ) : (
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
                          <div
                            className={`flex items-center justify-center gap-1 font-mono text-sm ${
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
                        </div>
                      </div>
                      {bet.timeRemaining && (
                        <div className="flex items-center gap-2 rounded bg-muted/50 px-3 py-2">
                          <Clock className="h-4 w-4 text-[var(--neon-magenta)]" />
                          <span className="font-mono text-sm text-foreground">{bet.timeRemaining}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                  ))}
                </div>
              )}
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
                  {betHistory.length === 0 ? (
                    <div className="p-8 text-center font-mono text-sm text-muted-foreground">No bet history</div>
                  ) : (
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
