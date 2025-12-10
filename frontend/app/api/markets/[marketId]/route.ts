import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPrices } from "@/lib/solana/amm"
import { getMarketPda } from "@/lib/prediction-market/client"
import { PublicKey } from "@solana/web3.js"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const logPrefix = `[API /api/markets/[marketId]]`
  console.log(`${logPrefix} Starting request`)
  
  try {
    const { marketId } = await params
    console.log(`${logPrefix} Market ID: ${marketId}`)

    console.log(`${logPrefix} Querying database for market...`)
    const market = await db.market.findUnique({
      where: { id: marketId },
      include: {
        mission: {
          include: {
            agent: {
              include: {
                stats: true,
              },
            },
          },
        },
        bets: {
          where: {
            status: "ACTIVE",
          },
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
        trades: {
          include: {
            user: true,
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 100,
        },
        _count: {
          select: {
            bets: true,
            trades: true,
          },
        },
      },
    })

    if (!market) {
      console.error(`${logPrefix} Market not found in database: ${marketId}`)
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    console.log(`${logPrefix} Market found:`, {
      id: market.id,
      statement: market.statement,
      missionId: market.missionId,
      agentId: market.mission?.agent?.id,
      agentName: market.mission?.agent?.name,
    })

    const reserveYes = Number(market.reserveYes || 0)
    const reserveNo = Number(market.reserveNo || 0)
    console.log(`${logPrefix} Reserves - YES: ${reserveYes}, NO: ${reserveNo}`)
    
    const { priceYes, priceNo } = getPrices(reserveYes, reserveNo)
    const moonOdds = priceYes * 100
    const rugOdds = priceNo * 100
    console.log(`${logPrefix} Prices - YES: ${priceYes}, NO: ${priceNo}`)

    // Try to derive the market PDA if we have agent wallet and statement
    // Note: This requires the agent's wallet to be configured in environment variables
    let marketPda: string | null = null
    let pdaError: any = null
    const pdaDiagnostics: any = {}
    
    try {
      console.log(`${logPrefix} Attempting to derive market PDA...`)
      
      // Check if market statement is valid
      pdaDiagnostics.statement = market.statement
      pdaDiagnostics.statementValid = !!(market.statement && market.statement !== "TBD" && market.statement.trim() !== "")
      
      if (!pdaDiagnostics.statementValid) {
        pdaError = {
          type: "INVALID_STATEMENT",
          message: `Market statement is invalid: "${market.statement}". Cannot derive PDA.`,
          statement: market.statement,
        }
        console.error(`${logPrefix} ${pdaError.message}`)
        throw new Error(pdaError.message)
      }
      
      // Try to get agent wallet from environment
      const agentId = market.mission?.agent?.id
      if (!agentId) {
        pdaError = {
          type: "MISSING_AGENT_ID",
          message: "Agent ID not found in market data",
        }
        console.error(`${logPrefix} ${pdaError.message}`)
        throw new Error(pdaError.message)
      }
      
      const agentIdUpper = agentId.toUpperCase().replace(/-/g, '_')
      pdaDiagnostics.agentId = agentId
      pdaDiagnostics.agentIdUpper = agentIdUpper
      
      const envVarsToCheck = [
        `AGENT_${agentIdUpper}_WALLET`,
        'AGENT_WALLET',
        `NEXT_PUBLIC_AGENT_${agentIdUpper}_WALLET`,
        'NEXT_PUBLIC_AGENT_WALLET'
      ]
      
      pdaDiagnostics.envVarsChecked = envVarsToCheck
      pdaDiagnostics.envVarValues = {}
      
      let agentWallet: string | undefined
      let foundEnvVar: string | null = null
      
      for (const envVar of envVarsToCheck) {
        const value = process.env[envVar]
        pdaDiagnostics.envVarValues[envVar] = value ? `${value.substring(0, 8)}...${value.substring(value.length - 8)}` : null
        if (value) {
          agentWallet = value
          foundEnvVar = envVar
          console.log(`${logPrefix} Found agent wallet in ${envVar}`)
          break
        }
      }
      
      pdaDiagnostics.foundEnvVar = foundEnvVar
      pdaDiagnostics.agentWalletFound = !!agentWallet
      
      if (!agentWallet) {
        pdaError = {
          type: "MISSING_AGENT_WALLET",
          message: `Agent wallet not found in environment variables. Checked: ${envVarsToCheck.join(', ')}`,
          envVarsChecked: envVarsToCheck,
        }
        console.error(`${logPrefix} ${pdaError.message}`)
        throw new Error(pdaError.message)
      }
      
      console.log(`${logPrefix} Creating PublicKey from agent wallet...`)
      let agentPublicKey: PublicKey
      try {
        agentPublicKey = new PublicKey(agentWallet)
        pdaDiagnostics.agentPublicKey = agentPublicKey.toBase58()
        console.log(`${logPrefix} Agent PublicKey created: ${pdaDiagnostics.agentPublicKey}`)
      } catch (error) {
        pdaError = {
          type: "INVALID_AGENT_WALLET",
          message: `Failed to create PublicKey from agent wallet: ${error instanceof Error ? error.message : String(error)}`,
          agentWallet: `${agentWallet.substring(0, 8)}...${agentWallet.substring(agentWallet.length - 8)}`,
          error: error instanceof Error ? error.stack : String(error),
        }
        console.error(`${logPrefix} ${pdaError.message}`, error)
        throw error
      }
      
      console.log(`${logPrefix} Deriving market PDA using getMarketPda(${pdaDiagnostics.agentPublicKey}, "${market.statement}")...`)
      let pda: PublicKey
      try {
        pda = getMarketPda(agentPublicKey, market.statement)
        marketPda = pda.toBase58()
        pdaDiagnostics.marketPda = marketPda
        console.log(`${logPrefix} Successfully derived market PDA: ${marketPda}`)
      } catch (error) {
        pdaError = {
          type: "PDA_DERIVATION_FAILED",
          message: `Failed to derive market PDA: ${error instanceof Error ? error.message : String(error)}`,
          agentPublicKey: pdaDiagnostics.agentPublicKey,
          statement: market.statement,
          error: error instanceof Error ? error.stack : String(error),
        }
        console.error(`${logPrefix} ${pdaError.message}`, error)
        throw error
      }
    } catch (error) {
      if (!pdaError) {
        pdaError = {
          type: "UNEXPECTED_ERROR",
          message: `Unexpected error deriving PDA: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.stack : String(error),
        }
      }
      console.error(`${logPrefix} Error in PDA derivation:`, {
        error: pdaError,
        diagnostics: pdaDiagnostics,
        fullError: error instanceof Error ? error.stack : String(error),
      })
    }

    const response = {
      market: {
        ...market,
        moonPrice: Number(priceYes),
        rugPrice: Number(priceNo),
        totalVolume: Number(market.totalVolume),
        liquidity: Number(market.liquidity),
        minBet: Number(market.minBet),
        maxBet: market.maxBet ? Number(market.maxBet) : null,
        reserveYes,
        reserveNo,
        feeBps: market.feeBps,
        odds: {
          moon: Math.round(moonOdds),
          rug: Math.round(rugOdds),
        },
        mints: {
          yesMint: market.yesMint,
          noMint: market.noMint,
          lpMint: market.lpMint,
          poolAuthority: market.poolAuthority,
          poolYesAccount: market.poolYesAccount,
          poolNoAccount: market.poolNoAccount,
        },
        marketPda, // Include the derived PDA
        _diagnostics: pdaError ? {
          error: pdaError,
          diagnostics: pdaDiagnostics,
        } : undefined,
      },
    }
    
    console.log(`${logPrefix} Response prepared:`, {
      marketId: market.id,
      marketPda: marketPda || "null",
      hasError: !!pdaError,
      errorType: pdaError?.type,
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error(`${logPrefix} Fatal error fetching market:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      marketId: await params.then(p => p.marketId).catch(() => "unknown"),
    })
    return NextResponse.json({ 
      error: "Failed to fetch market",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}

