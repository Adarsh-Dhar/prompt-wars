 "use client"

import { useEffect, useMemo, useState } from "react"
import {
  ActivitySquare,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Hexagon,
  Link2,
  Loader2,
  Lock,
  Network,
  Play,
  Shield,
  Sparkles,
  Timer,
  Wallet,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"

type CodenameStatus = "idle" | "checking" | "unique" | "taken"
type LogLine = {
  text: string
  tone?: "success" | "warn" | "info"
  delay: number
}

const strategyOptions = [
  { label: "DEGEN_SNIPER", value: "DEGEN_SNIPER" },
  { label: "ARBITRAGE_BOT", value: "ARBITRAGE_BOT" },
  { label: "LIQUIDATION_HUNTER", value: "LIQUIDATION_HUNTER" },
]

export default function NewAgentPage() {
  const [codename, setCodename] = useState("TRADER_BOT_X1")
  const [strategy, setStrategy] = useState(strategyOptions[0]?.value)
  const [endpoint, setEndpoint] = useState("https://api.your-agent.com")
  const [codenameStatus, setCodenameStatus] = useState<CodenameStatus>("idle")
  const [logs, setLogs] = useState<string[]>(["WAITING FOR INPUT..."])
  const [runningDiagnostics, setRunningDiagnostics] = useState(false)
  const [diagnosticsComplete, setDiagnosticsComplete] = useState(false)

  // lightweight pseudo-unique check to mimic on-chain unicity feedback
  useEffect(() => {
    if (!codename) {
      setCodenameStatus("idle")
      return
    }
    setCodenameStatus("checking")
    const timer = setTimeout(() => {
      const checksum =
        codename
          .toUpperCase()
          .split("")
          .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 7
      setCodenameStatus(checksum % 3 === 0 ? "taken" : "unique")
    }, 420)
    return () => clearTimeout(timer)
  }, [codename])

  const diagnosticsScript: LogLine[] = useMemo(() => {
    const uri = endpoint || "https://api.your-agent.com"
    return [
      { text: `> ESTABLISHING CONNECTION TO ${uri}...`, delay: 350, tone: "info" },
      { text: "> [SUCCESS] HOST REACHABLE (24ms)", delay: 420, tone: "success" },
      { text: "> INITIATING x402 PROTOCOL TEST...", delay: 380, tone: "info" },
      { text: "> SENDING DUMMY REQUEST...", delay: 320, tone: "info" },
      { text: "> [RECEIVED] 402 PAYMENT REQUIRED (Good)", delay: 460, tone: "success" },
      { text: "> VERIFYING WALLET SIGNATURE COMPATIBILITY...", delay: 380, tone: "info" },
      { text: "> [SUCCESS] AGENT IS COMPLIANT.", delay: 420, tone: "success" },
    ]
  }, [endpoint])

  const runDiagnostics = () => {
    if (runningDiagnostics) return
    setRunningDiagnostics(true)
    setDiagnosticsComplete(false)
    setLogs(["> INITIATING DIAGNOSTICS..."])
    let accumulated = 0
    diagnosticsScript.forEach((line, index) => {
      accumulated += line.delay
      setTimeout(() => {
        setLogs((prev) => [...prev, line.text])
        if (index === diagnosticsScript.length - 1) {
          setRunningDiagnostics(false)
          setDiagnosticsComplete(true)
        }
      }, accumulated)
    })
  }

  const stakeDisabled = !diagnosticsComplete || runningDiagnostics

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040506] font-mono text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#0f172a_1px,transparent_0)] [background-size:26px_26px] opacity-30" />
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen" style={{ backgroundImage: "linear-gradient(90deg, rgba(0,243,255,0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(0,255,65,0.08) 1px, transparent 1px)", backgroundSize: "80px 80px, 80px 80px" }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-emerald-500/5" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 md:px-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Initialize New Operator</p>
            <h1 className="mt-3 text-3xl font-black uppercase text-emerald-200 sm:text-4xl md:text-5xl">
              <span className="glitch-text">Uplink //</span>{" "}
              <span className="text-cyan-300">New_Agent_Registry</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Register your autonomous agent for the Arena. Compliance verification required.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            <div className="flex items-center gap-3 rounded border border-cyan-500/40 bg-black/50 px-4 py-2 shadow-[0_0_20px_rgba(0,255,255,0.15)]">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Wallet Balance</p>
                <p className="text-lg font-semibold text-emerald-300">◎ 12.42 SOL</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded border border-amber-400/50 bg-black/60 px-3 py-2 text-xs uppercase tracking-wide">
              <Network className="h-4 w-4 text-cyan-300" />
              <span className="text-amber-200">Not Connected</span>
              <span className="text-slate-500">/</span>
              <span className="text-emerald-300">0x...abc</span>
            </div>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-black/60 shadow-[0_0_40px_rgba(0,243,255,0.08)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="scanline absolute inset-0" />
          </div>
          <div className="relative grid gap-8 p-6 lg:grid-cols-2 lg:p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <Hexagon className="h-4 w-4" />
                Identity Matrix
              </div>
              <p className="text-sm text-slate-400">
                Clean, grid-based intake. Glow-guarded fields enforce on-chain uniqueness and reachable endpoints before you enter the Arena.
              </p>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
                    <span>Codename</span>
                    <span className={cn("flex items-center gap-1 text-[10px]", codenameStatus === "unique" && "text-emerald-400", codenameStatus === "taken" && "text-rose-400", codenameStatus === "checking" && "text-cyan-300", codenameStatus === "idle" && "text-slate-500")}>
                      <ActivitySquare className="h-3 w-3" />
                      {codenameStatus === "unique" && "UNIQUE ON-CHAIN"}
                      {codenameStatus === "taken" && "CONFLICT FOUND"}
                      {codenameStatus === "checking" && "QUERYING LEDGER..."}
                      {codenameStatus === "idle" && "AWAITING INPUT"}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      value={codename}
                      onChange={(e) => setCodename(e.target.value)}
                      placeholder="TRADER_BOT_X1"
                      className="w-full rounded border border-cyan-500/40 bg-slate-950/70 px-3 py-3 text-sm text-emerald-100 shadow-[0_0_12px_rgba(0,243,255,0.18)] transition focus:border-emerald-400 focus:shadow-[0_0_18px_rgba(0,255,65,0.35)] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-cyan-300/70">
                      <span className="cursor-blink" />
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300">
                    <Shield className="h-4 w-4 text-cyan-300" />
                    Strategy Class
                  </label>
                  <div className="relative">
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      className="w-full rounded border border-cyan-500/40 bg-slate-950/70 px-3 py-3 text-sm text-cyan-100 shadow-[0_0_12px_rgba(0,243,255,0.18)] focus:border-emerald-400 focus:shadow-[0_0_18px_rgba(0,255,65,0.35)] focus:outline-none"
                    >
                      {strategyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Sparkles className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-300" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-cyan-300" />
                      Neural_Link_URI
                    </span>
                    <span className="text-[10px] text-amber-300">critical field</span>
                  </label>
                  <div className="relative">
                    <input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="https://api.your-agent.com"
                      className="w-full rounded border border-cyan-500/40 bg-slate-950/70 px-3 py-3 text-sm text-cyan-100 shadow-[0_0_12px_rgba(0,243,255,0.18)] transition focus:border-emerald-400 focus:shadow-[0_0_22px_rgba(0,243,255,0.45)] focus:outline-none"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-emerald-300">
                      <Timer className="h-3.5 w-3.5" />
                      Live ping
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Arena will ping this endpoint for x402 compliance before staking funds.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative rounded-lg border border-emerald-500/30 bg-[#050806]/80 p-4 shadow-[0_0_30px_rgba(0,255,65,0.12)]">
              <div className="absolute inset-0 -skew-y-2 bg-gradient-to-b from-emerald-500/5 via-transparent to-cyan-500/5" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  <ActivitySquare className="h-4 w-4" />
                  Diagnostics Terminal
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  Pre-flight
                </div>
              </div>

              <div className="mt-3 h-64 overflow-hidden rounded border border-emerald-500/30 bg-black/70 p-4 font-mono text-sm text-emerald-300 shadow-inner shadow-emerald-500/20">
                <div className="grid grid-cols-[1fr,auto] items-start gap-2">
                  <pre className="scrollbar-thin scrollbar-thumb-emerald-500/40 scrollbar-track-transparent max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {logs.map((line, idx) => (
                      <div key={idx} className={cn("flex gap-2", line.includes("SUCCESS") && "text-emerald-300", line.includes("RECEIVED") && "text-emerald-200", line.includes("WAITING") && "text-slate-600", line.includes("CONNECTION") && "text-cyan-200", line.includes("402") && "text-emerald-400")}>
                        <span className="text-cyan-500">▌</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </pre>
                  <div className="flex flex-col items-end gap-2 text-[10px] text-slate-500">
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                      MODE: GREENSCREEN
                    </span>
                    <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                      STREAM: LIVE
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={runDiagnostics}
                  className={cn(
                    "group relative inline-flex items-center gap-2 overflow-hidden rounded-md border border-emerald-500/60 bg-gradient-to-r from-emerald-600 to-cyan-500 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-black shadow-[0_0_20px_rgba(0,255,65,0.35)] transition",
                    "active:translate-y-0.5",
                    runningDiagnostics && "opacity-80"
                  )}
                  disabled={runningDiagnostics}
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(0,0,0,0.2),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(255,255,255,0.12),transparent_35%)] opacity-70 transition duration-500 group-hover:opacity-100" />
                  <span className="relative flex items-center gap-2">
                    {runningDiagnostics ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Initiate Diagnostics
                  </span>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-black/70">
                    HOLD
                  </span>
                </button>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <div className={cn("h-2 w-2 rounded-full", diagnosticsComplete ? "bg-emerald-400 shadow-[0_0_12px_rgba(0,255,65,0.6)]" : "bg-slate-500")}></div>
                  {diagnosticsComplete ? "Diagnostics passed" : runningDiagnostics ? "Running checks..." : "Awaiting signal"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-[#0a0603]/80 p-6 shadow-[0_0_40px_rgba(255,176,0,0.25)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,176,0,0.05)_25%,transparent_25%,transparent_50%,rgba(255,176,0,0.05)_50%,rgba(255,176,0,0.05)_75%,transparent_75%,transparent)] bg-[length:18px_18px]" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
                <Lock className="h-4 w-4" />
                Blood Oath // Staking
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-amber-100">
                <span className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-1 font-semibold">
                  SECURITY BOND REQUIRED: 5.00 SOL
                </span>
                <span className="flex items-center gap-2 text-amber-200/80">
                  <AlertTriangle className="h-4 w-4" />
                  If your agent fails to resolve markets or provides falsified logs, this bond will be SLASHED.
                </span>
              </div>
              <div className="text-[12px] text-amber-200/80">
                Diagnostics must complete to arm the staking trigger. Wallet signature required post-confirmation.
              </div>
            </div>
            <div className="hidden flex-col items-end text-[11px] uppercase tracking-wide text-amber-300/70 sm:flex">
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Arm Status
              </span>
              <span className={cn("mt-1 flex items-center gap-2 rounded px-2 py-1", diagnosticsComplete ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/50" : "bg-slate-700/40 text-slate-200 border border-slate-500/50")}>
                {diagnosticsComplete ? "SAFE TO DEPLOY" : "LOCKED"}
              </span>
            </div>
          </div>

          <div className="relative mt-6">
            <button
              type="button"
              disabled={stakeDisabled}
              className={cn(
                "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg border border-amber-500/60 bg-gradient-to-r from-red-700 via-amber-600 to-amber-400 px-6 py-4 text-lg font-semibold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(255,176,0,0.4)] transition",
                "active:translate-y-0.5",
                stakeDisabled && "cursor-not-allowed opacity-70 saturate-50"
              )}
            >
              <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.25),transparent,rgba(255,255,255,0.15))] opacity-60 transition duration-500 group-hover:opacity-90" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/60">PRESS & HOLD</span>
              <span className="relative flex items-center gap-3">
                {stakeDisabled ? <Lock className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                Stake & Deploy
              </span>
              <ArrowRight className="relative h-5 w-5" />
            </button>
            <div className="mt-2 flex items-center justify-between text-[11px] text-amber-200/80">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                Bond auto-mints agent license upon success.
              </span>
              <span className="flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-amber-200" />
                Cooldown: 3s
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 rounded-lg border border-cyan-500/30 bg-black/60 p-4 text-xs text-slate-400 shadow-[0_0_25px_rgba(0,243,255,0.12)] md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-200">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">Live relay</p>
              <p className="text-slate-300">Auto-sync logs to Arena observers.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Compliance</p>
              <p className="text-slate-300">x402 ready. Wallet sig pre-flight verified.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-amber-500/50 bg-amber-500/10 text-amber-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">Risk</p>
              <p className="text-slate-300">Non-compliant payloads trigger bond slash.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
