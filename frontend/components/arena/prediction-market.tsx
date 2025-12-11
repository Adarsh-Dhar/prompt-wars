"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useConnection } from "@solana/wallet-adapter-react"
import { buyTokens, BuyTokensParams, Outcome } from "@/lib/prediction/client"
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, getAccount, createSyncNativeInstruction } from "@solana/spl-token"
import { Transaction, PublicKey, SystemProgram } from "@solana/web3.js"
import * as anchor from "@coral-xyz/anchor"

interface PredictionMarketProps {
  market?: any
  agentId: string
  marketId?: string
}

export function PredictionMarket({ market: legacyMarket, agentId: _agentId, marketId }: PredictionMarketProps) {
  const { publicKey, connected, signTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const { connection } = useConnection()
  const [market, setMarket] = useState<any>(legacyMarket)
  const [buyAmount, setBuyAmount] = useState("")
  const [side, setSide] = useState<"YES" | "NO">("YES")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const dbMarketId = legacyMarket?.id || marketId
  const isActive = market?.state === "ACTIVE" || market?.state === "PENDING"

  const refreshMarket = async () => {
    if (!dbMarketId) return
    try {
      const res = await fetch(`/api/markets/${dbMarketId}`)
      if (!res.ok) return
      const data = await res.json()
      setMarket(data.market)
    } catch (error) {
      console.error("Failed to refresh market", error)
    }
  }

  const executeBlockchainTrade = async (amount: number, side: "YES" | "NO") => {
    if (!publicKey || !signTransaction || !market?.marketPda) {
      throw new Error("Wallet not connected or market PDA not available")
    }

    if (!market.mints?.yesMint || !market.mints?.noMint) {
      throw new Error("Market mint addresses not available")
    }

    // Convert side to Outcome enum
    const outcome: Outcome = side === "YES" ? { yes: {} } : { no: {} }
    
    // Get market PDA
    const marketPda = new PublicKey(market.marketPda)
    
    // Get mint addresses from market data
    const yesMint = new PublicKey(market.mints.yesMint)
    const noMint = new PublicKey(market.mints.noMint)
    
    // For now, we'll use SOL as collateral (we need to add WSOL support)
    // This is a simplified version - in production you'd want proper collateral handling
    const collateralMint = new PublicKey("So11111111111111111111111111111111111111112") // WSOL
    
    // Get associated token accounts
    const userCollateralAccount = await getAssociatedTokenAddress(collateralMint, publicKey)
    const userYesAccount = await getAssociatedTokenAddress(yesMint, publicKey)
    const userNoAccount = await getAssociatedTokenAddress(noMint, publicKey)

    console.log("Executing blockchain trade:", {
      marketPda: marketPda.toString(),
      amount: amount * 1e9,
      outcome: side,
      userCollateralAccount: userCollateralAccount.toString(),
      userYesAccount: userYesAccount.toString(),
      userNoAccount: userNoAccount.toString()
    })

    // Check if token accounts exist and create them if they don't
    const transaction = new Transaction()
    let needsTransaction = false

    let collateralAccountExists = false
    try {
      await getAccount(connection, userCollateralAccount)
      console.log("Collateral account exists")
      collateralAccountExists = true
    } catch (error) {
      console.log("Creating collateral account")
      transaction.add(
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          userCollateralAccount, // ata
          publicKey, // owner
          collateralMint // mint
        )
      )
      needsTransaction = true
    }

    // Add SOL to WSOL wrapping (we need collateral for the trade)
    const wsolAmount = Math.ceil(amount * 1e9) // Convert to lamports and round up
    console.log(`Adding ${wsolAmount} lamports (${amount} SOL) to WSOL account`)
    
    // Transfer SOL to the WSOL account
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: userCollateralAccount,
        lamports: wsolAmount,
      })
    )
    
    // Sync native (convert SOL to WSOL)
    transaction.add(createSyncNativeInstruction(userCollateralAccount))
    needsTransaction = true

    try {
      await getAccount(connection, userYesAccount)
      console.log("YES account exists")
    } catch (error) {
      console.log("Creating YES account")
      transaction.add(
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          userYesAccount, // ata
          publicKey, // owner
          yesMint // mint
        )
      )
      needsTransaction = true
    }

    try {
      await getAccount(connection, userNoAccount)
      console.log("NO account exists")
    } catch (error) {
      console.log("Creating NO account")
      transaction.add(
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          userNoAccount, // ata
          publicKey, // owner
          noMint // mint
        )
      )
      needsTransaction = true
    }

    // Create wallet adapter for the prediction client
    const wallet = {
      publicKey,
      signTransaction,
      signAllTransactions: async (txs: Transaction[]) => {
        if (signTransaction) {
          return Promise.all(txs.map(tx => signTransaction(tx)))
        }
        throw new Error("signAllTransactions not available")
      }
    }

    // If we need to create accounts, do it first
    if (needsTransaction) {
      console.log("Creating missing token accounts...")
      try {
        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey
        
        const signedTx = await signTransaction(transaction)
        const txSig = await connection.sendRawTransaction(signedTx.serialize())
        await connection.confirmTransaction(txSig, 'confirmed')
        console.log("Token accounts created successfully:", txSig)
      } catch (createError) {
        console.error("Failed to create token accounts:", createError)
        throw new Error(`Failed to create token accounts: ${createError.message}`)
      }
    }
    
    try {
      // Attempt real blockchain transaction
      const txSignature = await buyTokens(connection, wallet, {
        marketPda,
        amount: new anchor.BN(amount * 1e9), // Convert to lamports
        outcome,
        userCollateralAccount,
        userYesAccount,
        userNoAccount
      })

      return txSignature
    } catch (error) {
      console.error("Blockchain transaction failed:", error)
      
      // If the blockchain transaction fails, we'll simulate it for now
      // This could happen if the market isn't properly initialized on-chain
      console.log("Falling back to simulated transaction")
      
      const txSignature = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      // Add a small delay to simulate network transaction
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      throw error // Re-throw the error so the caller knows it was simulated
    }
  }

  useEffect(() => {
    if (!dbMarketId) return
    refreshMarket()
    const interval = setInterval(refreshMarket, 4000)
    return () => clearInterval(interval)
  }, [dbMarketId])

  const initializeBlockchain = async () => {
    if (!publicKey || !connected) {
      setMessage("Please connect your wallet first")
      return
    }

    if (!dbMarketId) {
      setMessage("Market ID not available")
      return
    }

    setLoading(true)
    setMessage("Initializing blockchain component...")

    try {
      const res = await fetch(`/api/markets/${dbMarketId}/initialize-blockchain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          txSignature: Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize blockchain")
      }

      setMessage("Blockchain component initialized! You can now make on-chain trades.")
      
      // Refresh market data to get the updated marketPda
      await refreshMarket()
      
    } catch (error: any) {
      setMessage(error.message || "Failed to initialize blockchain")
    } finally {
      setLoading(false)
    }
  }

  const handleTrade = async () => {
    setMessage(null)
    try {
      if (!dbMarketId) {
        setMessage("Missing market id")
        return
      }

      if (!connected || !publicKey) {
        setVisible(true)
        throw new Error("Connect wallet to trade")
      }

      const amount = parseFloat(buyAmount)
      if (!isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid amount")
      }
      
      console.log("Trade validation:", { amount, side, walletAddress: publicKey.toBase58() })
    
      if (!isActive) {
        throw new Error("Market is closed")
      }

      setLoading(true)
      
      let txSignature: string
      
      let blockchainSuccess = false
      
      // First, try to execute the blockchain transaction if market PDA is available
      if (market?.marketPda) {
        try {
          setMessage("Executing blockchain transaction...")
          txSignature = await executeBlockchainTrade(amount, side)
          setMessage("Blockchain transaction successful, updating database...")
          blockchainSuccess = true
        } catch (blockchainError) {
          console.error("Blockchain transaction failed:", blockchainError)
          setMessage(`Blockchain transaction failed: ${blockchainError.message}. Falling back to database-only trade...`)
          // Fall back to simulated transaction signature
          txSignature = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        }
      } else {
        // No market PDA available, use simulated transaction
        setMessage("No blockchain market found, executing database-only trade...")
        txSignature = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      }
      
      // Update the database with the trade
      const requestBody = {
        side,
        amount,
        walletAddress: publicKey.toBase58(),
        txSignature,
      }
      
      console.log("Trade request:", requestBody)
      
      const res = await fetch(`/api/markets/${dbMarketId}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()
      console.log("Trade response:", { status: res.status, data })
      
      if (!res.ok) {
        throw new Error(data.error || "Trade failed")
      }
        
      setMarket(data.market)
      setBuyAmount("")
      
      if (blockchainSuccess) {
        setMessage("Trade executed successfully on blockchain and database!")
      } else if (market?.marketPda) {
        setMessage("Trade recorded in database (blockchain transaction failed)")
      } else {
        setMessage("Trade recorded in database (blockchain market not available)")
      }
    } catch (error: any) {
      setMessage(error.message || "Trade failed")
    } finally {
      setLoading(false)
    }
  }

  const formatVolume = (vol?: number) => {
    if (!isFinite(vol || 0)) return "$0.00"
    const value = Number(vol || 0)
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }

  const moonPrice = Number(market?.moonPrice ?? 0.5)
  const rugPrice = Number(market?.rugPrice ?? 0.5)
  const reserveYes = Number(market?.reserveYes ?? 0)
  const reserveNo = Number(market?.reserveNo ?? 0)
  const totalLiquidity = Number(market?.liquidity ?? reserveYes + reserveNo)

  return (
    <Card className="flex flex-col border-border/50 bg-card/80">
      <CardHeader className="border-b border-border/50 py-3">
        <CardTitle className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[var(--neon-lime)]">
          <span className="flex items-center gap-2">
            Prediction Market
            <span className={`rounded px-1.5 py-0.5 text-[10px] ${
              market?.marketPda 
                ? "bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]" 
                : "bg-[var(--neon-lime)]/20 text-[var(--neon-lime)]"
            }`}>
              {market?.marketPda ? "On-chain" : "Off-chain"}
            </span>
          </span>
          {dbMarketId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshMarket}
              className="h-6 w-6 p-0"
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        {!connected && (
          <div className="rounded border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10 p-3 text-center">
            <p className="font-mono text-xs text-[var(--neon-cyan)] mb-2">Connect your wallet to place bets</p>
            <Button
              onClick={() => setVisible(true)}
              className="neon-glow-cyan border border-[var(--neon-cyan)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
            >
              Connect Wallet
            </Button>
          </div>
        )}

        {connected && !market?.marketPda && (
          <div className="rounded border border-[var(--neon-magenta)]/50 bg-[var(--neon-magenta)]/10 p-3 text-center">
            <p className="font-mono text-xs text-[var(--neon-magenta)] mb-2">Initialize blockchain trading for this market</p>
            <Button
              onClick={initializeBlockchain}
              disabled={loading}
              className="neon-glow-magenta border border-[var(--neon-magenta)] bg-transparent font-mono text-xs uppercase tracking-widest text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10"
            >
              {loading ? "Initializing..." : "Initialize Blockchain"}
            </Button>
          </div>
        )}

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
              onClick={() => {
                setSide("YES")
                handleTrade()
              }}
              disabled={loading || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-green)] bg-[var(--neon-green)]/10 transition-all hover:bg-[var(--neon-green)]/20 hover:shadow-[0_0_30px_rgba(0,255,100,0.3)]"
            >
              <ArrowUp className="h-5 w-5 text-[var(--neon-green)] transition-transform group-hover:-translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-green)]">BUY YES</span>
              <span className="font-mono text-[10px] text-[var(--neon-green)]/80">${moonPrice.toFixed(4)}</span>
            </Button>
            <Button
              onClick={() => {
                setSide("NO")
                handleTrade()
              }}
              disabled={loading || !buyAmount || parseFloat(buyAmount) <= 0 || !connected || !isActive}
              className="group relative h-20 flex-col gap-1 overflow-hidden border-2 border-[var(--neon-red)] bg-[var(--neon-red)]/10 transition-all hover:bg-[var(--neon-red)]/20 hover:shadow-[0_0_30px_rgba(255,50,50,0.3)]"
            >
              <ArrowDown className="h-5 w-5 text-[var(--neon-red)] transition-transform group-hover:translate-y-1" />
              <span className="font-mono text-base font-bold text-[var(--neon-red)]">BUY NO</span>
              <span className="font-mono text-[10px] text-[var(--neon-red)]/80">${rugPrice.toFixed(4)}</span>
            </Button>
          </div>
          {message && <p className="font-mono text-xs text-muted-foreground">{message}</p>}
        </div>

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
            <div className="font-mono text-sm font-bold text-foreground">{((market?.feeBps ?? 100) / 100).toFixed(2)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
