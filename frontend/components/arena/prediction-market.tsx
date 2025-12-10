"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import {
  buyShares,
  sellShares,
  fetchMarket,
  calculatePrice,
  getUserTokenBalance,
  getMarketPda,
  type MarketAccount,
} from "@/lib/prediction-market/client"
import { BN } from "@coral-xyz/anchor"

interface PredictionMarketProps {
  market?: any // Legacy market data from API (for fallback)
  agentId: string
  marketId?: string // On-chain market PDA address
}

export function PredictionMarket({ market: legacyMarket, agentId, marketId }: PredictionMarketProps) {
  const { publicKey, connected, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [onChainMarket, setOnChainMarket] = useState<MarketAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [betting, setBetting] = useState(false)
  const [selling, setSelling] = useState(false)
  const [yesBalance, setYesBalance] = useState(0)
  const [noBalance, setNoBalance] = useState(0)
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null)

  // Helper function to validate if a string is a valid Solana public key
  const isValidPublicKey = (str: string): boolean => {
    try {
      if (!str || typeof str !== 'string') return false
      // Trim whitespace
      const trimmed = str.trim()
      if (trimmed.length === 0) return false
      // Solana public keys are base58 encoded and typically 32-44 characters
      if (trimmed.length < 32 || trimmed.length > 44) return false
      // Check if it's valid base58 (only contains base58 characters)
      // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
      if (!base58Regex.test(trimmed)) return false
      // Try to create PublicKey to validate - this will throw if invalid
      try {
        // eslint-disable-next-line no-new
        new PublicKey(trimmed)
        return true
      } catch {
        // Silently catch PublicKey construction errors (e.g., "Non-base58 character")
        return false
      }
    } catch {
      // Catch any other unexpected errors in validation
      return false
    }
  }

  // Fetch on-chain market data
  useEffect(() => {
    const logPrefix = `[PredictionMarket loadMarket]`
    
    async function loadMarket() {
      console.log(`${logPrefix} Starting loadMarket`, {
        marketId,
        agentId,
        hasLegacyMarket: !!legacyMarket,
        legacyMarketPda: legacyMarket?.marketPda,
        legacyMarketStatement: legacyMarket?.statement,
      })
      
      try {
        let marketPda: PublicKey | null = null
        const diagnostics: any = {
          step: "initialization",
          attempts: [],
        }

        // First, try to use marketPda from legacyMarket if available (from API)
        if (legacyMarket?.marketPda) {
          console.log(`${logPrefix} Attempt 1: Using marketPda from legacyMarket: ${legacyMarket.marketPda}`)
          diagnostics.attempts.push({
            method: "legacyMarket.marketPda",
            value: legacyMarket.marketPda,
            isValid: isValidPublicKey(legacyMarket.marketPda),
          })
          
          if (isValidPublicKey(legacyMarket.marketPda)) {
            try {
              marketPda = new PublicKey(legacyMarket.marketPda)
              console.log(`${logPrefix} Successfully created PublicKey from legacyMarket.marketPda: ${marketPda.toBase58()}`)
              diagnostics.success = true
              diagnostics.method = "legacyMarket.marketPda"
              diagnostics.marketPda = marketPda.toBase58()
            } catch (error) {
              console.error(`${logPrefix} Failed to create PublicKey from legacyMarket.marketPda:`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                marketPda: legacyMarket.marketPda,
              })
              diagnostics.attempts[diagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
            }
          } else {
            console.warn(`${logPrefix} legacyMarket.marketPda is not a valid public key: ${legacyMarket.marketPda}`)
            diagnostics.attempts[diagnostics.attempts.length - 1].error = "Invalid public key format"
          }
        }
        
        // If marketId is provided and is a valid public key, use it directly
        if (!marketPda && marketId) {
          console.log(`${logPrefix} Attempt 2: Using marketId: ${marketId}`)
          diagnostics.attempts.push({
            method: "marketId",
            value: marketId,
            isValid: isValidPublicKey(marketId),
          })
          
          if (isValidPublicKey(marketId)) {
            try {
              marketPda = new PublicKey(marketId)
              console.log(`${logPrefix} Successfully created PublicKey from marketId: ${marketPda.toBase58()}`)
              diagnostics.success = true
              diagnostics.method = "marketId"
              diagnostics.marketPda = marketPda.toBase58()
            } catch (error) {
              console.error(`${logPrefix} Failed to create PublicKey from marketId:`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                marketId,
              })
              diagnostics.attempts[diagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
              return
            }
          } else {
            console.warn(`${logPrefix} marketId is not a valid public key: ${marketId}`)
            diagnostics.attempts[diagnostics.attempts.length - 1].error = "Invalid public key format"
          }
        }
        
        // If marketId is not a valid public key, try to derive the PDA
        if (!marketPda && legacyMarket?.statement && agentId) {
          console.log(`${logPrefix} Attempt 3: Deriving PDA from agent wallet and statement`, {
            agentId,
            statement: legacyMarket.statement,
          })
          
          diagnostics.attempts.push({
            method: "derive_from_agent",
            agentId,
            statement: legacyMarket.statement,
          })
          
          try {
            // Check if statement is valid
            if (!legacyMarket.statement || legacyMarket.statement === "TBD" || legacyMarket.statement.trim() === "") {
              const error = `Market statement is invalid: "${legacyMarket.statement}"`
              console.error(`${logPrefix} ${error}`)
              diagnostics.attempts[diagnostics.attempts.length - 1].error = error
              return
            }
            
            // Try to get agent public key from environment variable
            const agentIdUpper = agentId.toUpperCase().replace(/-/g, '_')
            const envVarsToCheck = [
              `NEXT_PUBLIC_AGENT_${agentIdUpper}_WALLET`,
              'NEXT_PUBLIC_AGENT_WALLET'
            ]
            
            console.log(`${logPrefix} Checking environment variables:`, envVarsToCheck)
            diagnostics.attempts[diagnostics.attempts.length - 1].envVarsChecked = envVarsToCheck
            diagnostics.attempts[diagnostics.attempts.length - 1].envVarValues = {}
            
            let agentWalletEnv: string | undefined
            let foundEnvVar: string | null = null
            
            for (const envVar of envVarsToCheck) {
              const value = process.env[envVar]
              diagnostics.attempts[diagnostics.attempts.length - 1].envVarValues[envVar] = value ? "found" : "not found"
              if (value) {
                agentWalletEnv = value
                foundEnvVar = envVar
                console.log(`${logPrefix} Found agent wallet in ${envVar}`)
                break
              }
            }
            
            diagnostics.attempts[diagnostics.attempts.length - 1].foundEnvVar = foundEnvVar
            diagnostics.attempts[diagnostics.attempts.length - 1].agentWalletFound = !!agentWalletEnv
            
            if (!agentWalletEnv) {
              const error = `Agent wallet not found in environment variables. Checked: ${envVarsToCheck.join(', ')}`
              console.error(`${logPrefix} ${error}`)
              diagnostics.attempts[diagnostics.attempts.length - 1].error = error
              return
            }
            
            if (!isValidPublicKey(agentWalletEnv)) {
              const error = `Agent wallet from ${foundEnvVar} is not a valid public key: ${agentWalletEnv}`
              console.error(`${logPrefix} ${error}`)
              diagnostics.attempts[diagnostics.attempts.length - 1].error = error
              return
            }
            
            console.log(`${logPrefix} Creating PublicKey from agent wallet...`)
            let agentPublicKey: PublicKey
            try {
              agentPublicKey = new PublicKey(agentWalletEnv)
              console.log(`${logPrefix} Agent PublicKey created: ${agentPublicKey.toBase58()}`)
              diagnostics.attempts[diagnostics.attempts.length - 1].agentPublicKey = agentPublicKey.toBase58()
            } catch (error) {
              const errorMsg = `Failed to create PublicKey from agent wallet: ${error instanceof Error ? error.message : String(error)}`
              console.error(`${logPrefix} ${errorMsg}`, error)
              diagnostics.attempts[diagnostics.attempts.length - 1].error = errorMsg
              return
            }
            
            console.log(`${logPrefix} Deriving market PDA using getMarketPda(${agentPublicKey.toBase58()}, "${legacyMarket.statement}")...`)
            try {
              marketPda = getMarketPda(agentPublicKey, legacyMarket.statement)
              console.log(`${logPrefix} Successfully derived market PDA: ${marketPda.toBase58()}`)
              diagnostics.success = true
              diagnostics.method = "derive_from_agent"
              diagnostics.marketPda = marketPda.toBase58()
            } catch (error) {
              const errorMsg = `Failed to derive market PDA: ${error instanceof Error ? error.message : String(error)}`
              console.error(`${logPrefix} ${errorMsg}`, error)
              diagnostics.attempts[diagnostics.attempts.length - 1].error = errorMsg
              return
            }
          } catch (error) {
            const errorMsg = `Unexpected error deriving market PDA: ${error instanceof Error ? error.message : String(error)}`
            console.error(`${logPrefix} ${errorMsg}`, {
              error: error instanceof Error ? error.stack : String(error),
              agentId,
              statement: legacyMarket.statement,
            })
            diagnostics.attempts[diagnostics.attempts.length - 1].error = errorMsg
            return
          }
        } else if (!marketPda) {
          const error = "No marketId and no way to derive PDA (missing legacyMarket.statement or agentId)"
          console.warn(`${logPrefix} ${error}`, {
            hasMarketId: !!marketId,
            hasLegacyMarket: !!legacyMarket,
            hasStatement: !!legacyMarket?.statement,
            hasAgentId: !!agentId,
          })
          diagnostics.error = error
          return
        }

        if (!marketPda) {
          console.error(`${logPrefix} Failed to determine market PDA after all attempts`, diagnostics)
          return
        }
        
        // Check if connection is available and valid
        if (!connection) {
          console.warn(`${logPrefix} Connection not available, skipping on-chain fetch`)
          return
        }
        
        // Validate connection object has required methods
        if (typeof connection.getAccountInfo !== 'function') {
          console.warn(`${logPrefix} Connection object is invalid (missing getAccountInfo), skipping on-chain fetch`)
          return
        }
        
        console.log(`${logPrefix} Fetching market from on-chain using PDA: ${marketPda.toBase58()}`)
        try {
          const market = await fetchMarket(connection, marketPda)
          if (market) {
            console.log(`${logPrefix} Successfully fetched market from on-chain`)
            setOnChainMarket(market)
          } else {
            console.warn(`${logPrefix} Market not found on-chain for PDA: ${marketPda.toBase58()}`)
          }
        } catch (error) {
          // Safely extract error information, handling Anchor errors and other complex error types
          // Wrap in try-catch to ensure error logging never throws
          try {
            const errorInfo: Record<string, any> = {
              marketPda: marketPda?.toBase58() || 'unknown',
            }
            
            if (error instanceof Error) {
              errorInfo.error = error.message || 'Error without message'
              errorInfo.errorName = error.name || 'Error'
              errorInfo.stack = error.stack
              // Try to extract additional properties from Error
              if ('code' in error) errorInfo.code = (error as any).code
              if ('logs' in error) errorInfo.logs = (error as any).logs
              if ('programErrorCode' in error) errorInfo.programErrorCode = (error as any).programErrorCode
            } else if (error !== null && error !== undefined) {
              // Handle non-Error objects (like Anchor errors)
              errorInfo.error = String(error)
              errorInfo.errorType = typeof error
              
              // Try to extract common Anchor error properties
              if (typeof error === 'object') {
                const err = error as any
                if (err.message) errorInfo.message = err.message
                if (err.code) errorInfo.code = err.code
                if (err.name) errorInfo.name = err.name
                if (err.logs) errorInfo.logs = err.logs
                if (err.errorCode) errorInfo.errorCode = err.errorCode
                if (err.errorMessage) errorInfo.errorMessage = err.errorMessage
                if (err.programErrorCode) errorInfo.programErrorCode = err.programErrorCode
              }
            } else {
              errorInfo.error = 'Unknown error (null or undefined)'
            }
            
            console.error(`${logPrefix} Error fetching market from on-chain:`, errorInfo)
          } catch (loggingError) {
            // If even error logging fails, use a minimal safe log
            console.error(`${logPrefix} Error fetching market from on-chain (logging failed):`, {
              marketPda: marketPda?.toBase58() || 'unknown',
              originalErrorType: typeof error,
              loggingError: String(loggingError),
            })
          }
          
          // Don't throw - just log and continue
          // The component will fall back to legacy market data if available
        }
      } catch (error) {
        console.error(`${logPrefix} Fatal error in loadMarket:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          marketId,
          agentId,
        })
      }
    }

    loadMarket()
    const interval = setInterval(loadMarket, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [connection, marketId, legacyMarket, agentId])

  // Fetch user token balances
  useEffect(() => {
    if (!connected || !publicKey || !onChainMarket) {
      setYesBalance(0)
      setNoBalance(0)
      return
    }

    // Store in const to help TypeScript with type narrowing
    const market = onChainMarket
    const userPublicKey = publicKey

    async function loadBalances() {
      try {
        const yes = await getUserTokenBalance(connection, userPublicKey, market.yesMint)
        const no = await getUserTokenBalance(connection, userPublicKey, market.noMint)
        setYesBalance(yes)
        setNoBalance(no)
      } catch (error) {
        console.error("Error fetching balances:", error)
      }
    }

    loadBalances()
    const interval = setInterval(loadBalances, 3000)
    return () => clearInterval(interval)
  }, [connection, publicKey, connected, onChainMarket])

  const market = onChainMarket || legacyMarket
  const isActive =
    market &&
    (onChainMarket
      ? 'active' in onChainMarket.state && onChainMarket.state.active !== undefined
      : legacyMarket?.state !== "RESOLVED" && legacyMarket?.state !== "FROZEN")

  // Calculate prices from reserves
  const reserveYes = onChainMarket
    ? onChainMarket.reserveYes.toNumber() / LAMPORTS_PER_SOL
    : legacyMarket?.reserveYes || 0
  const reserveNo = onChainMarket
    ? onChainMarket.reserveNo.toNumber() / LAMPORTS_PER_SOL
    : legacyMarket?.reserveNo || 0

  const { yesPrice, noPrice } = calculatePrice(reserveYes, reserveNo)
  const moonPrice = yesPrice
  const rugPrice = noPrice

  const totalLiquidity = reserveYes + reserveNo

  const handleBuy = async (side: "yes" | "no") => {
    const logPrefix = `[PredictionMarket handleBuy ${side}]`
    console.log(`${logPrefix} Starting buy transaction`, {
      marketId,
      buyAmount,
      side,
      agentId,
      hasLegacyMarket: !!legacyMarket,
    })
    
    if (!marketId || !buyAmount || parseFloat(buyAmount) <= 0) {
      console.warn(`${logPrefix} Invalid input: marketId=${marketId}, buyAmount=${buyAmount}`)
      return
    }
    
    if (!isActive) {
      console.warn(`${logPrefix} Market is closed`)
      alert("Market is closed")
      return
    }

    if (!connected || !publicKey || !sendTransaction) {
      console.warn(`${logPrefix} Wallet not connected`, { connected, hasPublicKey: !!publicKey, hasSendTransaction: !!sendTransaction })
      setVisible(true)
      return
    }

    const amountSol = parseFloat(buyAmount)
    if (!isFinite(amountSol) || amountSol <= 0) {
      console.warn(`${logPrefix} Invalid amount: ${buyAmount} -> ${amountSol}`)
      alert("Enter a valid amount")
      return
    }

    console.log(`${logPrefix} Determining market PDA...`)
    // Get market PDA - prefer legacyMarket.marketPda, then marketId if valid, otherwise derive it
    let marketPda: PublicKey | null = null
    const pdaDiagnostics: any = { attempts: [] }
    
    if (legacyMarket?.marketPda && isValidPublicKey(legacyMarket.marketPda)) {
      console.log(`${logPrefix} Attempt 1: Using legacyMarket.marketPda: ${legacyMarket.marketPda}`)
      pdaDiagnostics.attempts.push({ method: "legacyMarket.marketPda", value: legacyMarket.marketPda })
      try {
        marketPda = new PublicKey(legacyMarket.marketPda)
        console.log(`${logPrefix} Successfully created PublicKey: ${marketPda.toBase58()}`)
        pdaDiagnostics.success = true
        pdaDiagnostics.method = "legacyMarket.marketPda"
      } catch (error) {
        console.error(`${logPrefix} Failed to create PublicKey from legacyMarket.marketPda:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
      }
    }
    
    if (!marketPda && marketId && isValidPublicKey(marketId)) {
      console.log(`${logPrefix} Attempt 2: Using marketId: ${marketId}`)
      pdaDiagnostics.attempts.push({ method: "marketId", value: marketId })
      try {
        marketPda = new PublicKey(marketId)
        console.log(`${logPrefix} Successfully created PublicKey: ${marketPda.toBase58()}`)
        pdaDiagnostics.success = true
        pdaDiagnostics.method = "marketId"
      } catch (error) {
        console.error(`${logPrefix} Failed to create PublicKey from marketId:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
      }
    }
    
    if (!marketPda && legacyMarket?.statement && agentId) {
      console.log(`${logPrefix} Attempt 3: Deriving PDA from agent wallet and statement`, {
        agentId,
        statement: legacyMarket.statement,
      })
      pdaDiagnostics.attempts.push({ method: "derive_from_agent", agentId, statement: legacyMarket.statement })
      
      try {
        if (!legacyMarket.statement || legacyMarket.statement === "TBD" || legacyMarket.statement.trim() === "") {
          const error = `Market statement is invalid: "${legacyMarket.statement}"`
          console.error(`${logPrefix} ${error}`)
          pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error
          throw new Error(error)
        }
        
        const agentIdUpper = agentId.toUpperCase().replace(/-/g, '_')
        const envVarsToCheck = [
          `NEXT_PUBLIC_AGENT_${agentIdUpper}_WALLET`,
          'NEXT_PUBLIC_AGENT_WALLET'
        ]
        
        console.log(`${logPrefix} Checking environment variables:`, envVarsToCheck)
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].envVarsChecked = envVarsToCheck
        
        let agentWalletEnv: string | undefined
        let foundEnvVar: string | null = null
        
        for (const envVar of envVarsToCheck) {
          const value = process.env[envVar]
          if (value) {
            agentWalletEnv = value
            foundEnvVar = envVar
            console.log(`${logPrefix} Found agent wallet in ${envVar}`)
            break
          }
        }
        
        if (!agentWalletEnv) {
          const error = `Agent wallet not found. Checked: ${envVarsToCheck.join(', ')}`
          console.error(`${logPrefix} ${error}`)
          pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error
          throw new Error(error)
        }
        
        if (!isValidPublicKey(agentWalletEnv)) {
          const error = `Agent wallet is not a valid public key: ${agentWalletEnv}`
          console.error(`${logPrefix} ${error}`)
          pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error
          throw new Error(error)
        }
        
        console.log(`${logPrefix} Creating PublicKey from agent wallet...`)
        const agentPublicKey = new PublicKey(agentWalletEnv)
        console.log(`${logPrefix} Agent PublicKey: ${agentPublicKey.toBase58()}`)
        
        console.log(`${logPrefix} Deriving market PDA...`)
        marketPda = getMarketPda(agentPublicKey, legacyMarket.statement)
        console.log(`${logPrefix} Successfully derived market PDA: ${marketPda.toBase58()}`)
        pdaDiagnostics.success = true
        pdaDiagnostics.method = "derive_from_agent"
      } catch (error) {
        console.error(`${logPrefix} Error deriving market PDA:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
      }
    }

    if (!marketPda) {
      console.error(`${logPrefix} Failed to determine market PDA after all attempts:`, pdaDiagnostics)
      const errorMsg = `Unable to determine market address. Check console for details. Diagnostics: ${JSON.stringify(pdaDiagnostics, null, 2)}`
      alert("Invalid market ID. Unable to determine market address. Check console for details.")
      return
    }

    // Ensure the on-chain market account exists before proceeding
    let activeMarket = onChainMarket
    if (!activeMarket) {
      console.log(`${logPrefix} On-chain market not cached; fetching before buy...`)
      activeMarket = await fetchMarket(connection, marketPda)
      setOnChainMarket(activeMarket)
    }
    if (!activeMarket) {
      const msg = "Market not found on-chain for this PDA. Cannot place trade."
      console.error(`${logPrefix} ${msg}`, { marketPda: marketPda.toBase58() })
      alert(msg)
      return
    }

    console.log(`${logPrefix} Executing buy transaction`, {
      marketPda: marketPda.toBase58(),
      side,
      amountSol,
      userPublicKey: publicKey.toBase58(),
    })

    try {
      setBetting(true)
      const { signature } = await buyShares({
        connection,
        wallet: { publicKey, sendTransaction } as any,
        marketPda,
        side,
        amountSol,
      })

      console.log(`${logPrefix} Buy transaction successful: ${signature}`)
      alert(`Trade executed! Transaction: ${signature}`)
      setBuyAmount("")
      
      // Refresh market data
      console.log(`${logPrefix} Refreshing market data...`)
      const updated = await fetchMarket(connection, marketPda)
      if (updated) {
        console.log(`${logPrefix} Market data refreshed`)
        setOnChainMarket(updated)
      } else {
        console.warn(`${logPrefix} Market data refresh returned null`)
      }
    } catch (error: any) {
      // Safely extract error information, handling Anchor errors and other complex error types
      // Wrap in try-catch to ensure error logging never throws
      try {
        const errorInfo: Record<string, any> = {
          marketPda: marketPda?.toBase58() || 'unknown',
          side,
          amountSol,
        }
        
        if (error instanceof Error) {
          errorInfo.error = error.message || 'Error without message'
          errorInfo.errorName = error.name || 'Error'
          errorInfo.stack = error.stack
          // Try to extract additional properties from Error
          if ('code' in error) errorInfo.code = (error as any).code
          if ('logs' in error) errorInfo.logs = (error as any).logs
          if ('programErrorCode' in error) errorInfo.programErrorCode = (error as any).programErrorCode
          if ('errorCode' in error) errorInfo.errorCode = (error as any).errorCode
          if ('errorMessage' in error) errorInfo.errorMessage = (error as any).errorMessage
          if ('program' in error) errorInfo.program = String((error as any).program)
        } else if (error !== null && error !== undefined) {
          // Handle non-Error objects (like Anchor errors)
          errorInfo.error = String(error)
          errorInfo.errorType = typeof error
          
          // Try to extract common Anchor error properties
          if (typeof error === 'object') {
            const err = error as any
            if (err.message) errorInfo.message = err.message
            if (err.code) errorInfo.code = err.code
            if (err.name) errorInfo.name = err.name
            if (err.logs) errorInfo.logs = err.logs
            if (err.errorCode) errorInfo.errorCode = err.errorCode
            if (err.errorMessage) errorInfo.errorMessage = err.errorMessage
            if (err.programErrorCode) errorInfo.programErrorCode = err.programErrorCode
            if (err.program) errorInfo.program = String(err.program)
            
            // Try to stringify the entire error object for debugging
            try {
              errorInfo.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error))
            } catch {
              // If stringify fails, at least log the keys
              errorInfo.errorKeys = Object.keys(error)
            }
          }
        } else {
          errorInfo.error = 'Unknown error (null or undefined)'
        }
        
        console.error(`${logPrefix} Buy transaction failed:`, errorInfo)
        
        // Show user-friendly error message
        const userMessage = errorInfo.error || errorInfo.message || errorInfo.errorMessage || errorInfo.errorCode || "Failed to place bet"
        alert(userMessage)
      } catch (loggingError) {
        // If even error logging fails, use a minimal safe log
        console.error(`${logPrefix} Buy transaction failed (logging failed):`, {
          marketPda: marketPda?.toBase58() || 'unknown',
          side,
          amountSol,
          originalErrorType: typeof error,
          originalError: String(error),
          loggingError: String(loggingError),
        })
        alert("Failed to place bet. Check console for details.")
      }
    } finally {
      setBetting(false)
    }
  }

  const handleSell = async (side: "yes" | "no") => {
    const logPrefix = `[PredictionMarket handleSell ${side}]`
    console.log(`${logPrefix} Starting sell transaction`, {
      marketId,
      sellAmount,
      side,
      agentId,
      hasLegacyMarket: !!legacyMarket,
    })
    
    if (!marketId || !sellAmount || parseFloat(sellAmount) <= 0) {
      console.warn(`${logPrefix} Invalid input: marketId=${marketId}, sellAmount=${sellAmount}`)
      return
    }
    
    if (!isActive) {
      console.warn(`${logPrefix} Market is closed`)
      alert("Market is closed")
      return
    }

    if (!connected || !publicKey || !sendTransaction) {
      console.warn(`${logPrefix} Wallet not connected`, { connected, hasPublicKey: !!publicKey, hasSendTransaction: !!sendTransaction })
      setVisible(true)
      return
    }

    const shares = Math.floor(parseFloat(sellAmount))
    if (!isFinite(shares) || shares <= 0) {
      console.warn(`${logPrefix} Invalid shares: ${sellAmount} -> ${shares}`)
      alert("Enter a valid number of shares")
      return
    }

    const balance = side === "yes" ? yesBalance : noBalance
    if (shares > balance) {
      console.warn(`${logPrefix} Insufficient balance: requested=${shares}, available=${balance}`)
      alert(`Insufficient balance. You have ${balance} ${side.toUpperCase()} shares`)
      return
    }

    console.log(`${logPrefix} Determining market PDA...`)
    // Get market PDA - prefer legacyMarket.marketPda, then marketId if valid, otherwise derive it
    let marketPda: PublicKey | null = null
    const pdaDiagnostics: any = { attempts: [] }
    
    if (legacyMarket?.marketPda && isValidPublicKey(legacyMarket.marketPda)) {
      console.log(`${logPrefix} Attempt 1: Using legacyMarket.marketPda: ${legacyMarket.marketPda}`)
      pdaDiagnostics.attempts.push({ method: "legacyMarket.marketPda", value: legacyMarket.marketPda })
      try {
        marketPda = new PublicKey(legacyMarket.marketPda)
        console.log(`${logPrefix} Successfully created PublicKey: ${marketPda.toBase58()}`)
        pdaDiagnostics.success = true
        pdaDiagnostics.method = "legacyMarket.marketPda"
      } catch (error) {
        console.error(`${logPrefix} Failed to create PublicKey from legacyMarket.marketPda:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
      }
    }
    
    if (!marketPda && marketId && isValidPublicKey(marketId)) {
      console.log(`${logPrefix} Attempt 2: Using marketId: ${marketId}`)
      pdaDiagnostics.attempts.push({ method: "marketId", value: marketId })
      try {
        marketPda = new PublicKey(marketId)
        console.log(`${logPrefix} Successfully created PublicKey: ${marketPda.toBase58()}`)
        pdaDiagnostics.success = true
        pdaDiagnostics.method = "marketId"
      } catch (error) {
        console.error(`${logPrefix} Failed to create PublicKey from marketId:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
      }
    }
    
    if (!marketPda && legacyMarket?.statement && agentId) {
      console.log(`${logPrefix} Attempt 3: Deriving PDA from agent wallet and statement`, {
        agentId,
        statement: legacyMarket.statement,
      })
      pdaDiagnostics.attempts.push({ method: "derive_from_agent", agentId, statement: legacyMarket.statement })
      
      try {
        if (!legacyMarket.statement || legacyMarket.statement === "TBD" || legacyMarket.statement.trim() === "") {
          const error = `Market statement is invalid: "${legacyMarket.statement}"`
          console.error(`${logPrefix} ${error}`)
          pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error
          throw new Error(error)
        }
        
        const agentIdUpper = agentId.toUpperCase().replace(/-/g, '_')
        const envVarsToCheck = [
          `NEXT_PUBLIC_AGENT_${agentIdUpper}_WALLET`,
          'NEXT_PUBLIC_AGENT_WALLET'
        ]
        
        console.log(`${logPrefix} Checking environment variables:`, envVarsToCheck)
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].envVarsChecked = envVarsToCheck
        
        let agentWalletEnv: string | undefined
        let foundEnvVar: string | null = null
        
        for (const envVar of envVarsToCheck) {
          const value = process.env[envVar]
          if (value) {
            agentWalletEnv = value
            foundEnvVar = envVar
            console.log(`${logPrefix} Found agent wallet in ${envVar}`)
            break
          }
        }
        
        if (!agentWalletEnv) {
          const error = `Agent wallet not found. Checked: ${envVarsToCheck.join(', ')}`
          console.error(`${logPrefix} ${error}`)
          pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error
          throw new Error(error)
        }
        
        if (!isValidPublicKey(agentWalletEnv)) {
          const error = `Agent wallet is not a valid public key: ${agentWalletEnv}`
          console.error(`${logPrefix} ${error}`)
          pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error
          throw new Error(error)
        }
        
        console.log(`${logPrefix} Creating PublicKey from agent wallet...`)
        const agentPublicKey = new PublicKey(agentWalletEnv)
        console.log(`${logPrefix} Agent PublicKey: ${agentPublicKey.toBase58()}`)
        
        console.log(`${logPrefix} Deriving market PDA...`)
        marketPda = getMarketPda(agentPublicKey, legacyMarket.statement)
        console.log(`${logPrefix} Successfully derived market PDA: ${marketPda.toBase58()}`)
        pdaDiagnostics.success = true
        pdaDiagnostics.method = "derive_from_agent"
      } catch (error) {
        console.error(`${logPrefix} Error deriving market PDA:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        pdaDiagnostics.attempts[pdaDiagnostics.attempts.length - 1].error = error instanceof Error ? error.message : String(error)
      }
    }

    if (!marketPda) {
      console.error(`${logPrefix} Failed to determine market PDA after all attempts:`, pdaDiagnostics)
      const errorMsg = `Unable to determine market address. Check console for details. Diagnostics: ${JSON.stringify(pdaDiagnostics, null, 2)}`
      alert("Invalid market ID. Unable to determine market address. Check console for details.")
      return
    }

    console.log(`${logPrefix} Executing sell transaction`, {
      marketPda: marketPda.toBase58(),
      side,
      shares,
      userPublicKey: publicKey.toBase58(),
    })

    try {
      setSelling(true)
      const { signature } = await sellShares({
        connection,
        wallet: { publicKey, sendTransaction } as any,
        marketPda,
        side,
        shares,
      })

      console.log(`${logPrefix} Sell transaction successful: ${signature}`)
      alert(`Shares sold! Transaction: ${signature}`)
      setSellAmount("")
      
      // Refresh market data
      console.log(`${logPrefix} Refreshing market data...`)
      const updated = await fetchMarket(connection, marketPda)
      if (updated) {
        console.log(`${logPrefix} Market data refreshed`)
        setOnChainMarket(updated)
      } else {
        console.warn(`${logPrefix} Market data refresh returned null`)
      }
    } catch (error: any) {
      // Safely extract error information, handling Anchor errors and other complex error types
      // Wrap in try-catch to ensure error logging never throws
      try {
        const errorInfo: Record<string, any> = {
          marketPda: marketPda?.toBase58() || 'unknown',
          side,
          shares,
        }
        
        if (error instanceof Error) {
          errorInfo.error = error.message || 'Error without message'
          errorInfo.errorName = error.name || 'Error'
          errorInfo.stack = error.stack
          // Try to extract additional properties from Error
          if ('code' in error) errorInfo.code = (error as any).code
          if ('logs' in error) errorInfo.logs = (error as any).logs
          if ('programErrorCode' in error) errorInfo.programErrorCode = (error as any).programErrorCode
          if ('errorCode' in error) errorInfo.errorCode = (error as any).errorCode
          if ('errorMessage' in error) errorInfo.errorMessage = (error as any).errorMessage
        } else if (error !== null && error !== undefined) {
          // Handle non-Error objects (like Anchor errors)
          errorInfo.error = String(error)
          errorInfo.errorType = typeof error
          
          // Try to extract common Anchor error properties
          if (typeof error === 'object') {
            const err = error as any
            if (err.message) errorInfo.message = err.message
            if (err.code) errorInfo.code = err.code
            if (err.name) errorInfo.name = err.name
            if (err.logs) errorInfo.logs = err.logs
            if (err.errorCode) errorInfo.errorCode = err.errorCode
            if (err.errorMessage) errorInfo.errorMessage = err.errorMessage
            if (err.programErrorCode) errorInfo.programErrorCode = err.programErrorCode
          }
        } else {
          errorInfo.error = 'Unknown error (null or undefined)'
        }
        
        console.error(`${logPrefix} Sell transaction failed:`, errorInfo)
        
        // Show user-friendly error message
        const userMessage = errorInfo.error || errorInfo.message || errorInfo.errorMessage || "Failed to sell shares"
        alert(userMessage)
      } catch (loggingError) {
        // If even error logging fails, use a minimal safe log
        console.error(`${logPrefix} Sell transaction failed (logging failed):`, {
          marketPda: marketPda?.toBase58() || 'unknown',
          side,
          shares,
          originalErrorType: typeof error,
          loggingError: String(loggingError),
        })
        alert("Failed to sell shares. Check console for details.")
      }
    } finally {
      setSelling(false)
    }
  }

  const formatVolume = (vol: number) => {
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`
    return `$${vol.toFixed(2)}`
  }

  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <CardTitle className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--neon-lime)]">
          <span className="flex items-center gap-2">
            Prediction Market
            <span className="rounded bg-[var(--neon-lime)]/20 px-1.5 py-0.5 text-[10px] text-[var(--neon-lime)]">
              On-Chain
            </span>
          </span>
          {onChainMarket && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  let marketPda: PublicKey | null = null
                  
                  if (legacyMarket?.marketPda && isValidPublicKey(legacyMarket.marketPda)) {
                    marketPda = new PublicKey(legacyMarket.marketPda)
                  } else if (marketId && isValidPublicKey(marketId)) {
                    marketPda = new PublicKey(marketId)
                  } else if (legacyMarket?.statement && agentId) {
                    const agentWalletEnv = process.env[`NEXT_PUBLIC_AGENT_${agentId.toUpperCase()}_WALLET`] || 
                                           process.env.NEXT_PUBLIC_AGENT_WALLET
                    if (agentWalletEnv && isValidPublicKey(agentWalletEnv)) {
                      const agentPublicKey = new PublicKey(agentWalletEnv)
                      marketPda = getMarketPda(agentPublicKey, legacyMarket.statement)
                    }
                  }
                  
                  if (marketPda) {
                    const market = await fetchMarket(connection, marketPda)
                    setOnChainMarket(market)
                  }
                } catch (error) {
                  console.error("Error refreshing market:", error)
                }
              }}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        {/* Wallet connection prompt */}
        {!connected && (
          <div className="rounded border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 p-3 text-center">
            <p className="font-mono text-xs text-[var(--neon-cyan)] mb-2">
              Connect your wallet to place bets
            </p>
            <Button
              onClick={() => setVisible(true)}
              className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
            >
              Connect Wallet
            </Button>
          </div>
        )}

        {/* User balances */}
        {connected && onChainMarket && (
          <div className="grid grid-cols-2 gap-2 rounded bg-muted/30 p-2">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">YES Shares</div>
              <div className="font-mono text-sm font-bold text-[var(--neon-green)]">{yesBalance}</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">NO Shares</div>
              <div className="font-mono text-sm font-bold text-[var(--neon-red)]">{noBalance}</div>
            </div>
          </div>
        )}

        {/* Buy section */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Buy Shares</div>
          <Input
            type="number"
            placeholder="Amount (SOL)"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="font-mono text-sm"
            min="0.01"
            step="0.01"
            disabled={!connected || !isActive}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleBuy("yes")}
              disabled={betting || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-green)] bg-[var(--neon-green)]/10 transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_30px_rgba(0,255,100,0.3)]"
            >
              <ArrowUp className="h-5 w-5 text-[var(--neon-green)] transition-transform group-hover:-translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-green)]">BUY YES</span>
              <span className="font-mono text-[10px] text-[var(--neon-green)]/80">
                ${moonPrice.toFixed(4)}
              </span>
            </Button>
            <Button
              onClick={() => handleBuy("no")}
              disabled={betting || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-red)] bg-[var(--neon-red)]/10 transition-all hover:bg-[var(--neon-red)]/20 hover:shadow-[0_0_30px_rgba(255,50,50,0.3)]"
            >
              <ArrowDown className="h-5 w-5 text-[var(--neon-red)] transition-transform group-hover:translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-red)]">BUY NO</span>
              <span className="font-mono text-[10px] text-[var(--neon-red)]/80">${rugPrice.toFixed(4)}</span>
            </Button>
          </div>
        </div>

        {/* Sell section */}
        {connected && (yesBalance > 0 || noBalance > 0) && (
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Sell Shares</div>
            <Input
              type="number"
              placeholder="Number of shares"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="font-mono text-sm"
              min="1"
              step="1"
              disabled={!connected || !isActive}
            />
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleSell("yes")}
                disabled={selling || !sellAmount || parseFloat(sellAmount) <= 0 || yesBalance === 0 || !isActive}
                className="h-16 flex-col gap-1 border border-[var(--neon-green)]/50 bg-[var(--neon-green)]/5 hover:bg-[var(--neon-green)]/10"
              >
                <span className="font-mono text-sm font-bold text-[var(--neon-green)]">SELL YES</span>
                <span className="font-mono text-[10px] text-muted-foreground">Balance: {yesBalance}</span>
              </Button>
              <Button
                onClick={() => handleSell("no")}
                disabled={selling || !sellAmount || parseFloat(sellAmount) <= 0 || noBalance === 0 || !isActive}
                className="h-16 flex-col gap-1 border border-[var(--neon-red)]/50 bg-[var(--neon-red)]/5 hover:bg-[var(--neon-red)]/10"
              >
                <span className="font-mono text-sm font-bold text-[var(--neon-red)]">SELL NO</span>
                <span className="font-mono text-[10px] text-muted-foreground">Balance: {noBalance}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Market stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">YES Reserve</div>
            <div className="font-mono text-sm font-bold text-foreground">{formatVolume(reserveYes)}</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">NO Reserve</div>
            <div className="font-mono text-sm font-bold text-foreground">{formatVolume(reserveNo)}</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Total Liquidity</div>
            <div className="font-mono text-sm font-bold text-foreground">{formatVolume(totalLiquidity)}</div>
          </div>
          <div className="rounded bg-muted/50 p-3 text-center">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Fee</div>
            <div className="font-mono text-sm font-bold text-foreground">
              {onChainMarket ? (onChainMarket.feeBps / 100).toFixed(2) : "1.00"}%
            </div>
          </div>
        </div>

        {/* Market state */}
        {onChainMarket && (
          <div className="rounded border border-border/50 bg-terminal-bg p-2">
            <div className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Market State</div>
            <div className="font-mono text-xs text-foreground">
              {'active' in onChainMarket.state && onChainMarket.state.active !== undefined
                ? "ACTIVE"
                : 'resolved' in onChainMarket.state && onChainMarket.state.resolved !== undefined
                  ? `RESOLVED (${onChainMarket.outcome && 'yes' in onChainMarket.outcome ? "YES" : "NO"})`
                  : "FROZEN"}
            </div>
            {onChainMarket.closesAt && (
              <div className="font-mono text-[10px] text-muted-foreground mt-1">
                Closes: {new Date(onChainMarket.closesAt.toNumber() * 1000).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
