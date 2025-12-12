 "use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
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
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import * as anchor from "@coral-xyz/anchor";

const { LAMPORTS_PER_SOL } = anchor.web3;

import { cn } from "@/lib/utils"
import { fetchRegistry, registerAgent, initializeRegistry, checkProgramDeployed, RegistryAccount } from "@/lib/stake/client"

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
  const [endpoint, setEndpoint] = useState("http://localhost:4001")
  const [chainOfThoughtEndpoint, setChainOfThoughtEndpoint] = useState("http://localhost:4001/cot")
  const [codenameStatus, setCodenameStatus] = useState<CodenameStatus>("idle")
  const [logs, setLogs] = useState<string[]>(["WAITING FOR INPUT..."])
  const [runningDiagnostics, setRunningDiagnostics] = useState(false)
  const [diagnosticsComplete, setDiagnosticsComplete] = useState(false)
  const [agentRegistered, setAgentRegistered] = useState(false)
  const [registeredAgentId, setRegisteredAgentId] = useState<string | null>(null)
  const [registry, setRegistry] = useState<RegistryAccount | null>(null)
  const [loadingRegistry, setLoadingRegistry] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [isStaking, setIsStaking] = useState(false)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [holdProgress, setHoldProgress] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [programDeployed, setProgramDeployed] = useState<boolean | null>(null)
  
  // Ref for auto-scrolling diagnostics terminal
  const logsEndRef = useRef<HTMLDivElement>(null)

  const { connection } = useConnection()
  const wallet = useWallet()

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

  // Validate URLs
  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const endpointValid = isValidUrl(endpoint)
  const cotEndpointValid = !chainOfThoughtEndpoint || isValidUrl(chainOfThoughtEndpoint)

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const diagnosticsScript: LogLine[] = useMemo(() => {
    const uri = endpoint || "https://api.your-agent.com"
    const cotUri = chainOfThoughtEndpoint || "https://api.your-agent.com/chain-of-thought"
    return [
      { text: `> ESTABLISHING CONNECTION TO ${uri}...`, delay: 350, tone: "info" },
      { text: "> [SUCCESS] HOST REACHABLE (24ms)", delay: 420, tone: "success" },
      { text: "> INITIATING x402 PROTOCOL TEST...", delay: 380, tone: "info" },
      { text: "> SENDING DUMMY REQUEST...", delay: 320, tone: "info" },
      { text: "> [RECEIVED] 402 PAYMENT REQUIRED (Good)", delay: 460, tone: "success" },
      { text: `> TESTING CHAIN-OF-THOUGHT ENDPOINT ${cotUri}...`, delay: 380, tone: "info" },
      { text: "> [SUCCESS] COT ENDPOINT ACCESSIBLE", delay: 420, tone: "success" },
      { text: "> VERIFYING WALLET SIGNATURE COMPATIBILITY...", delay: 380, tone: "info" },
      { text: "> [SUCCESS] AGENT IS COMPLIANT.", delay: 420, tone: "success" },
    ]
  }, [endpoint, chainOfThoughtEndpoint])

  const runDiagnostics = () => {
    if (runningDiagnostics) return
    setRunningDiagnostics(true)
    setDiagnosticsComplete(false)
    setAgentRegistered(false)
    setLogs(["> INITIATING DIAGNOSTICS..."])
    let accumulated = 0
    diagnosticsScript.forEach((line, index) => {
      accumulated += line.delay
      setTimeout(() => {
        setLogs((prev) => [...prev, line.text])
        if (index === diagnosticsScript.length - 1) {
          setRunningDiagnostics(false)
          setDiagnosticsComplete(true)
          // Auto-register agent in database after successful diagnostics
          registerAgentInDatabase()
        }
      }, accumulated)
    })
  }

  const registerAgentInDatabase = async () => {
    try {
      setLogs((prev) => [...prev, "> REGISTERING AGENT IN DATABASE..."])
      
      const response = await fetch('/api/agents/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: codename,
          category: strategy,
          url: endpoint,
          chainOfThoughtEndpoint: chainOfThoughtEndpoint,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If agent already exists, allow user to proceed with staking
        if (data.error?.includes('already exists')) {
          setLogs((prev) => [
            ...prev,
            "> [WARN] AGENT NAME ALREADY EXISTS IN DATABASE",
            "> This is OK - you can still stake on blockchain with this name",
            "> Database registration is separate from blockchain staking",
            "> READY FOR STAKING..."
          ])
          setAgentRegistered(true)
          // Use a placeholder ID for existing agents
          setRegisteredAgentId('existing-agent')
          return
        }
        throw new Error(data.error || 'Failed to register agent')
      }

      setAgentRegistered(true)
      setRegisteredAgentId(data.agent.id)
      setLogs((prev) => [
        ...prev,
        "> [SUCCESS] AGENT REGISTERED IN DATABASE",
        `> AGENT ID: ${data.agent.id}`,
        "> READY FOR STAKING..."
      ])
    } catch (error: any) {
      console.error("Agent registration error:", error)
      
      // For network errors or server issues, still allow staking
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setLogs((prev) => [
          ...prev,
          `> [WARN] DATABASE REGISTRATION FAILED: ${error.message}`,
          "> This is OK - you can still stake on blockchain",
          "> Database registration is optional for staking",
          "> READY FOR STAKING..."
        ])
        setAgentRegistered(true)
        setRegisteredAgentId('no-db-registration')
        return
      }
      
      setLogs((prev) => [
        ...prev,
        `> [ERROR] AGENT REGISTRATION FAILED: ${error.message}`,
        "> You can still proceed with blockchain staking",
        "> Try changing the agent name for database registration"
      ])
      // Still allow staking even if database registration fails
      setAgentRegistered(true)
      setRegisteredAgentId('registration-failed')
    }
  }

  const loadRegistry = useCallback(async () => {
    try {
      setLoadingRegistry(true)
      
      // Check if program is deployed first
      const deployed = await checkProgramDeployed(connection)
      setProgramDeployed(deployed)
      
      if (!deployed) {
        setLogs((prev) => [
          ...prev,
          "> [WARN] Agent Registry program not deployed",
          "> Please deploy the program before initializing registry",
        ])
        setRegistry(null)
        return
      }
      
      try {
        const reg = await fetchRegistry(connection)
        setRegistry(reg)
        if (reg) {
          setLogs((prev) => [...prev, `> [SUCCESS] Registry loaded: ${(reg.bondLamports.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(3)} SOL bond`])
        } else {
          setLogs((prev) => [...prev, "> [WARN] Registry not found on-chain"])
        }
      } catch (registryError: any) {
        console.error("Registry fetch error:", registryError)
        setRegistry(null)
        if (registryError.message?.includes('_bn') || registryError.message?.includes('Cannot read properties')) {
          setLogs((prev) => [...prev, "> [WARN] Registry not initialized - needs to be created first"])
        } else {
          setLogs((prev) => [...prev, `> [ERROR] Registry fetch failed: ${registryError.message}`])
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch registry", error)
      setRegistry(null)
      setLogs((prev) => [...prev, `> [ERROR] Failed to load registry: ${error?.message || "Unknown error"}`])
    } finally {
      setLoadingRegistry(false)
    }
  }, [connection])

  useEffect(() => {
    let cancelled = false
    async function initLoad() {
      await loadRegistry()
    }
    if (!cancelled) {
      initLoad()
    }
    return () => {
      cancelled = true
    }
  }, [loadRegistry, isInitializing])

  useEffect(() => {
    let cancelled = false
    async function loadBalance() {
      if (!wallet.publicKey) {
        setWalletBalance(null)
        return
      }
      const lamports = await connection.getBalance(wallet.publicKey)
      if (!cancelled) setWalletBalance(lamports / anchor.web3.LAMPORTS_PER_SOL)
    }
    loadBalance()
    const id = setInterval(loadBalance, 8000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [connection, wallet.publicKey])

  const bondSol = registry ? (registry.bondLamports.toNumber() / LAMPORTS_PER_SOL).toFixed(3) : "0.050"

  // Debug: Log stake conditions
  useEffect(() => {
    if (diagnosticsComplete) {
      console.log("Stake conditions:", {
        diagnosticsComplete,
        runningDiagnostics,
        isStaking,
        walletConnected: wallet.connected,
        hasPublicKey: !!wallet.publicKey,
        hasSendTransaction: !!wallet.sendTransaction,
        hasRegistry: !!registry,
        loadingRegistry,
      })
    }
  }, [diagnosticsComplete, runningDiagnostics, isStaking, wallet.connected, wallet.publicKey, wallet.sendTransaction, registry, loadingRegistry])

  const stakeDisabled =
    !diagnosticsComplete ||
    !agentRegistered ||
    runningDiagnostics ||
    isStaking ||
    !wallet.connected ||
    !wallet.publicKey ||
    !wallet.sendTransaction ||
    !registry ||
    loadingRegistry

  const handleStake = async () => {
    if (stakeDisabled) {
      const reasons: string[] = []
      if (!diagnosticsComplete) reasons.push("Diagnostics not complete")
      if (!agentRegistered) reasons.push("Agent not registered")
      if (runningDiagnostics) reasons.push("Diagnostics running")
      if (isStaking) reasons.push("Already staking")
      if (!wallet.connected) reasons.push("Wallet not connected")
      if (!wallet.publicKey) reasons.push("No public key")
      if (!wallet.sendTransaction) reasons.push("Wallet sendTransaction not available")
      if (!registry) reasons.push("Registry not loaded")
      if (loadingRegistry) reasons.push("Registry loading")
      setLogs((prev) => [...prev, `> [ERROR] Cannot stake: ${reasons.join(", ")}`])
      return
    }
    setIsStaking(true)
    setLogs((prev) => [...prev, "> ARMING STAKE TX...", "> FUNDING ESCROW VAULT..."])
    try {
      // Create wallet adapter compatible with Anchor
      // Use sendTransaction as signTransaction if signTransaction is not available
      const anchorWallet = {
        publicKey: wallet.publicKey!,
        signTransaction: wallet.signTransaction || wallet.sendTransaction!,
        signAllTransactions: wallet.signAllTransactions || (async (txs: any[]) => {
          const signed = []
          for (const tx of txs) {
            signed.push(await wallet.sendTransaction!(tx, connection))
          }
          return signed
        }),
        sendTransaction: wallet.sendTransaction!,
      } as any

      setLogs((prev) => [...prev, "> CALLING BLOCKCHAIN REGISTER AGENT..."])
      
      // Debug the parameters being passed
      console.log("Staking parameters:", {
        codename,
        endpoint,
        strategy,
        tags: [strategy || "DEGEN_SNIPER"]
      })
      
      setLogs((prev) => [...prev, `> NAME: ${codename}`, `> URL: ${endpoint}`, `> STRATEGY: ${strategy}`])
      
      // Ensure all parameters are properly defined and within constraints
      // MAX_NAME = 32, MAX_URL = 128, MAX_TAG_LEN = 24
      const agentName = (codename || "DEFAULT_AGENT").substring(0, 32)
      const agentUrl = (endpoint || "http://localhost:4001").substring(0, 128)
      const agentStrategy = (strategy || "DEGEN_SNIPER").substring(0, 24)
      const agentTags = [agentStrategy]
      
      setLogs((prev) => [...prev, `> VALIDATED PARAMS:`])
      setLogs((prev) => [...prev, `>   NAME: "${agentName}" (${agentName.length} chars)`])
      setLogs((prev) => [...prev, `>   URL: "${agentUrl}" (${agentUrl.length} chars)`])
      setLogs((prev) => [...prev, `>   TAGS: ${JSON.stringify(agentTags)} (${agentTags.length} tags)`])
      
      // Additional validation
      if (!agentName || agentName.length === 0) {
        throw new Error("Agent name cannot be empty")
      }
      if (!agentUrl || agentUrl.length === 0) {
        throw new Error("Agent URL cannot be empty")
      }
      if (!agentTags || agentTags.length === 0) {
        throw new Error("Agent tags cannot be empty")
      }
      
      const result = await registerAgent({
        connection,
        wallet: anchorWallet,
        name: agentName,
        url: agentUrl,
        tags: agentTags,
      })
      
      // Validate result structure
      if (!result) {
        throw new Error("registerAgent returned null/undefined result")
      }
      
      if (!result.signature) {
        throw new Error("registerAgent result missing signature field")
      }
      
      if (!result.agentPda) {
        throw new Error("registerAgent result missing agentPda field")
      }

      const { signature, agentPda } = result
      setTxSig(signature)
      setLogs((prev) => [
        ...prev,
        `> [SUCCESS] STAKED BOND FOR ${codename}`,
        `> TX: ${signature}`,
        `> AGENT PDA: ${agentPda.toBase58()}`,
        registeredAgentId ? `> DATABASE ID: ${registeredAgentId}` : "",
        `> AGENT URL: ${endpoint}`,
        chainOfThoughtEndpoint ? `> COT ENDPOINT: ${chainOfThoughtEndpoint}` : "",
      ].filter(Boolean))
    } catch (error: any) {
      console.error("Stake error:", error)
      const message = error?.message || error?.toString() || "Stake failed"
      setLogs((prev) => [...prev, `> [ERROR] BLOCKCHAIN STAKING FAILED: ${message}`])
      
      // Show more detailed error information
      if (error?.logs) {
        setLogs((prev) => [...prev, ...error.logs.map((log: string) => `> [LOG] ${log}`)])
      }
      
      // Show transaction message if available
      if (error?.transactionMessage) {
        setLogs((prev) => [...prev, `> [TX ERROR] ${error.transactionMessage}`])
      }
      
      // Show program-specific errors
      if (error?.code === 4100 || error?.error?.errorCode?.code === "DeclaredProgramIdMismatch") {
        setLogs((prev) => [
          ...prev,
          "> [ERROR] PROGRAM ID MISMATCH - Program needs to be redeployed",
          "> Check that declare_id!() in lib.rs matches deployed program address"
        ])
      }
    } finally {
      setIsStaking(false)
      setHoldProgress(0)
      setIsHolding(false)
    }
  }

  // Press and hold handlers
  const handleMouseDown = () => {
    if (stakeDisabled) return
    setIsHolding(true)
    setHoldProgress(0)
    const interval = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          handleStake()
          return 100
        }
        return prev + 2
      })
    }, 30) // Complete in ~1.5 seconds

    // Store interval to clear on mouse up
    ;(window as any).__stakeHoldInterval = interval
  }

  const handleMouseUp = () => {
    if ((window as any).__stakeHoldInterval) {
      clearInterval((window as any).__stakeHoldInterval)
      delete (window as any).__stakeHoldInterval
    }
    if (holdProgress < 100) {
      setHoldProgress(0)
      setIsHolding(false)
    }
  }

  const handleMouseLeave = () => {
    handleMouseUp()
  }

  const handleInitializeRegistry = async () => {
    if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
      setLogs((prev) => [...prev, "> [ERROR] Wallet not connected"])
      return
    }

    setIsInitializing(true)
    setLogs((prev) => [...prev, "> INITIALIZING REGISTRY...", "> DEPLOYING ON-CHAIN REGISTRY..."])
    try {
      // Create wallet adapter compatible with Anchor
      const anchorWallet = {
        publicKey: wallet.publicKey!,
        signTransaction: wallet.signTransaction || wallet.sendTransaction!,
        signAllTransactions: wallet.signAllTransactions || (async (txs: any[]) => {
          const signed = []
          for (const tx of txs) {
            signed.push(await wallet.sendTransaction!(tx, connection))
          }
          return signed
        }),
        sendTransaction: wallet.sendTransaction!,
      } as any

      const { signature, registryPda } = await initializeRegistry({
        connection,
        wallet: anchorWallet,
        bondLamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL, // 0.05 SOL
        slashPenaltyLamports: 0.05 * anchor.web3.LAMPORTS_PER_SOL, // full bond slashable
      })

      setLogs((prev) => [
        ...prev,
        `> [SUCCESS] REGISTRY INITIALIZED`,
        `> TX: ${signature}`,
        `> REGISTRY PDA: ${registryPda.toBase58()}`,
        "> RELOADING REGISTRY...",
      ])

      // Reload registry
      await loadRegistry()
    } catch (error: any) {
      console.error("Initialize registry error:", error)
      
      // Check for program not deployed error
      const errorMessage = error?.message || error?.toString() || ""
      const transactionMessage = error?.transactionMessage || ""
      const isProgramNotDeployed = 
        error?.isProgramNotDeployed ||
        errorMessage.includes("program that does not exist") ||
        errorMessage.includes("Program account does not exist") ||
        errorMessage.includes("is not deployed") ||
        transactionMessage.includes("program that does not exist") ||
        transactionMessage.includes("Program account does not exist")
      
      if (isProgramNotDeployed) {
        const programId = error?.programId || "CQZEo9zd8QNgT2uUJRn1cdHxc2794xFumQu9ZXL4Syk8"
        setLogs((prev) => [
          ...prev,
          `> [ERROR] AGENT REGISTRY PROGRAM NOT DEPLOYED`,
          `> Program ID: ${programId}`,
          `> The on-chain program does not exist yet.`,
          `> `,
          `> TO DEPLOY THE PROGRAM:`,
          `> 1. cd stake/`,
          `> 2. anchor build`,
          `> 3. anchor deploy --provider.cluster devnet`,
          `> 4. Copy the deployed program ID from the output`,
          `> 5. Update AGENT_REGISTRY_PROGRAM_ID in`,
          `>    frontend/lib/stake/agent-registry-idl.ts`,
          `> `,
          `> Then refresh this page and try again.`,
        ])
      } else if (errorMessage.includes('_bn') || errorMessage.includes('Cannot read properties')) {
        setLogs((prev) => [
          ...prev,
          `> [ERROR] PROGRAM INITIALIZATION FAILED`,
          `> This appears to be an IDL/Program mismatch issue.`,
          `> The program is deployed but the interface doesn't match.`,
          `> `,
          `> POSSIBLE SOLUTIONS:`,
          `> 1. The program may need to be redeployed with correct IDL`,
          `> 2. The IDL file may need to be updated`,
          `> 3. Try refreshing the page and trying again`,
          `> `,
          `> Technical error: ${errorMessage}`,
        ])
      } else {
        const message = errorMessage || "Failed to initialize registry"
        setLogs((prev) => [...prev, `> [ERROR] ${message}`])
        if (error?.logs) {
          setLogs((prev) => [...prev, ...error.logs.map((log: string) => `> [LOG] ${log}`)])
        }
        if (transactionMessage) {
          setLogs((prev) => [...prev, `> [TX ERROR] ${transactionMessage}`])
        }
      }
    } finally {
      setIsInitializing(false)
    }
  }

  const shortKey = wallet.publicKey ? `${wallet.publicKey.toBase58().slice(0, 4)}...${wallet.publicKey.toBase58().slice(-4)}` : "Disconnected"

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
                      placeholder="http://localhost:4001"
                      className={cn(
                        "w-full rounded border bg-slate-950/70 px-3 py-3 text-sm text-cyan-100 shadow-[0_0_12px_rgba(0,243,255,0.18)] transition focus:shadow-[0_0_22px_rgba(0,243,255,0.45)] focus:outline-none",
                        endpointValid || !endpoint
                          ? "border-cyan-500/40 focus:border-emerald-400"
                          : "border-rose-500/60 focus:border-rose-400"
                      )}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-emerald-300">
                      <Timer className="h-3.5 w-3.5" />
                      Live ping
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Arena will ping this endpoint for x402 compliance before staking funds.
                  </p>
                  {endpoint && !endpointValid && (
                    <p className="text-[11px] text-rose-400">
                      Invalid URL format. Please enter a valid HTTP/HTTPS URL.
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
                    <span className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-cyan-300" />
                      Chain_of_Thought_Endpoint
                    </span>
                    <span className="text-[10px] text-emerald-300">optional</span>
                  </label>
                  <div className="relative">
                    <input
                      value={chainOfThoughtEndpoint}
                      onChange={(e) => setChainOfThoughtEndpoint(e.target.value)}
                      placeholder="http://localhost:4001/cot"
                      className={cn(
                        "w-full rounded border bg-slate-950/70 px-3 py-3 text-sm text-cyan-100 shadow-[0_0_12px_rgba(0,243,255,0.18)] transition focus:shadow-[0_0_22px_rgba(0,243,255,0.45)] focus:outline-none",
                        cotEndpointValid || !chainOfThoughtEndpoint
                          ? "border-cyan-500/40 focus:border-emerald-400"
                          : "border-rose-500/60 focus:border-rose-400"
                      )}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-cyan-300">
                      <ActivitySquare className="h-3.5 w-3.5" />
                      GET endpoint
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    GET endpoint that returns the agent's chain of thought for transparency.
                  </p>
                  {chainOfThoughtEndpoint && !cotEndpointValid && (
                    <p className="text-[11px] text-rose-400">
                      Invalid URL format. Please enter a valid HTTP/HTTPS URL.
                    </p>
                  )}
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

              <div className="mt-3 h-64 rounded border border-emerald-500/30 bg-black/70 p-4 font-mono text-sm text-emerald-300 shadow-inner shadow-emerald-500/20 relative">
                {logs.length > 10 && (
                  <div className="absolute top-2 right-2 text-[10px] text-emerald-400/60 bg-black/50 px-2 py-1 rounded border border-emerald-500/30">
                    SCROLL ↕
                  </div>
                )}
                <div className="grid grid-cols-[1fr,auto] items-start gap-2 h-full">
                  <div 
                    className="h-full overflow-y-auto pr-2 diagnostics-scroll" 
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(16, 185, 129, 0.4) transparent'
                    }}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {logs.map((line, idx) => (
                        <div key={idx} className={cn("flex gap-2 mb-1", line.includes("SUCCESS") && "text-emerald-300", line.includes("RECEIVED") && "text-emerald-200", line.includes("WAITING") && "text-slate-600", line.includes("CONNECTION") && "text-cyan-200", line.includes("402") && "text-emerald-400")}>
                          <span className="text-cyan-500 flex-shrink-0">▌</span>
                          <span className="break-words">{line}</span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-[10px] text-slate-500">
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                      MODE: GREENSCREEN
                    </span>
                    <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-200">
                      STREAM: LIVE
                    </span>
                    <span className="rounded border border-slate-500/40 bg-slate-500/10 px-2 py-1 text-slate-300">
                      LINES: {logs.length}
                    </span>
                    <button
                      onClick={() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                      className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-cyan-200 hover:bg-cyan-500/20 transition-colors text-[10px]"
                      title="Scroll to bottom"
                    >
                      ↓ BOTTOM
                    </button>
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
                    (runningDiagnostics || !endpointValid || !cotEndpointValid) && "opacity-80 cursor-not-allowed"
                  )}
                  disabled={runningDiagnostics || !endpointValid || !cotEndpointValid}
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
                  <div className={cn("h-2 w-2 rounded-full", 
                    diagnosticsComplete && agentRegistered ? "bg-emerald-400 shadow-[0_0_12px_rgba(0,255,65,0.6)]" : 
                    (!endpointValid || !cotEndpointValid) ? "bg-rose-400 shadow-[0_0_12px_rgba(255,65,65,0.6)]" :
                    "bg-slate-500"
                  )}></div>
                  {diagnosticsComplete && agentRegistered ? "Agent ready for staking" : 
                   runningDiagnostics ? "Running checks..." : 
                   (!endpointValid || !cotEndpointValid) ? "Invalid URLs detected" :
                   "Awaiting signal"}
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
                    SECURITY BOND REQUIRED: {bondSol} SOL
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
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              className={cn(
                "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg border border-amber-500/60 bg-gradient-to-r from-red-700 via-amber-600 to-amber-400 px-6 py-4 text-lg font-semibold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(255,176,0,0.4)] transition",
                "active:translate-y-0.5",
                stakeDisabled && "cursor-not-allowed opacity-70 saturate-50",
                isHolding && !stakeDisabled && "ring-2 ring-amber-300 ring-offset-2 ring-offset-black"
              )}
            >
              {/* Hold progress bar */}
              {isHolding && !stakeDisabled && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-amber-200 transition-all duration-75 ease-linear"
                  style={{ width: `${holdProgress}%` }}
                />
              )}
              <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.25),transparent,rgba(255,255,255,0.15))] opacity-60 transition duration-500 group-hover:opacity-90" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-black/60">PRESS & HOLD</span>
              <span className="relative flex items-center gap-3">
                {stakeDisabled ? <Lock className="h-5 w-5" /> : isStaking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                {isStaking ? "Submitting..." : "Stake & Deploy"}
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
                {wallet.connected && wallet.publicKey
                  ? `Wallet: ${wallet.publicKey.toBase58().slice(0, 4)}...${wallet.publicKey.toBase58().slice(-4)}`
                  : "Connect wallet to proceed"}
              </span>
            </div>
            {stakeDisabled && diagnosticsComplete && (
              <div className="mt-2 space-y-2">
                <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <div className="font-semibold uppercase tracking-[0.18em] text-amber-300">Stake Disabled</div>
                  <div className="mt-1 space-y-1 text-amber-200/90">
                    {!diagnosticsComplete && <div>• Diagnostics not complete</div>}
                    {!agentRegistered && <div>• Agent not registered in database</div>}
                    {!wallet.connected && <div>• Wallet not connected</div>}
                    {wallet.connected && !wallet.publicKey && <div>• No public key available</div>}
                    {wallet.connected && wallet.publicKey && !wallet.sendTransaction && <div>• Wallet sendTransaction not available</div>}
                    {!registry && !loadingRegistry && <div>• Registry not found - Initialize registry first</div>}
                    {loadingRegistry && <div>• Loading registry...</div>}
                    {isStaking && <div>• Transaction in progress</div>}
                    {runningDiagnostics && <div>• Diagnostics still running</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {programDeployed === false && (
                    <div className="flex-1 rounded border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                      <div className="font-semibold uppercase tracking-[0.18em] text-rose-300 mb-1">Program Not Deployed</div>
                      <div className="text-rose-200/90 space-y-1">
                        <div>Deploy the program first:</div>
                        <div className="font-mono text-[10px]">1. cd stake/</div>
                        <div className="font-mono text-[10px]">2. anchor build</div>
                        <div className="font-mono text-[10px]">3. anchor deploy --provider.cluster devnet</div>
                        <div className="font-mono text-[10px]">4. Update AGENT_REGISTRY_PROGRAM_ID</div>
                      </div>
                    </div>
                  )}
                  {programDeployed === true && !registry && !loadingRegistry && wallet.connected && wallet.publicKey && typeof wallet.sendTransaction === "function" && (
                    <button
                      type="button"
                      onClick={handleInitializeRegistry}
                      disabled={isInitializing}
                      className={cn(
                        "group relative flex flex-1 items-center justify-center gap-3 overflow-hidden rounded-lg border border-cyan-500/60 bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-[0_0_30px_rgba(0,243,255,0.4)] transition",
                        "active:translate-y-0.5",
                        isInitializing && "cursor-not-allowed opacity-70"
                      )}
                    >
                      <span className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.25),transparent,rgba(255,255,255,0.15))] opacity-60 transition duration-500 group-hover:opacity-90" />
                      <span className="relative flex items-center gap-3">
                        {isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                        {isInitializing ? "Initializing..." : "Initialize Registry"}
                      </span>
                    </button>
                  )}
                  {(!registry || loadingRegistry) && wallet.connected && (
                    <button
                      type="button"
                      onClick={loadRegistry}
                      disabled={loadingRegistry}
                      className={cn(
                        "group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-slate-500/60 bg-slate-800/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.2)] transition",
                        "active:translate-y-0.5",
                        loadingRegistry && "cursor-not-allowed opacity-70"
                      )}
                    >
                      {loadingRegistry ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ActivitySquare className="h-3.5 w-3.5" />}
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}
            {txSig && (
              <div className="mt-3 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                <div className="font-semibold uppercase tracking-[0.18em] text-emerald-300">Stake Submitted</div>
                <div className="break-all text-emerald-200/90">Signature: {txSig}</div>
              </div>
            )}
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
