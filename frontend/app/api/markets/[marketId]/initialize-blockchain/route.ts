import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Connection, PublicKey } from "@solana/web3.js"
import { initializeMarket, generateMarketId, getMarketPda } from "@/lib/prediction/client"
import * as anchor from "@coral-xyz/anchor"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    const { marketId } = await params
    const body = await request.json()
    
    const { walletAddress, txSignature } = body
    
    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Get the market from database
    const market = await db.market.findUnique({
      where: { id: marketId },
    })

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 })
    }

    if (market.marketPda && market.marketPda !== `dummy-${market.id}`) {
      return NextResponse.json({ error: "Market already has blockchain component" }, { status: 400 })
    }

    // Generate a unique blockchain market ID
    const blockchainMarketId = generateMarketId()
    
    // Calculate the market PDA that would be created
    const authority = new PublicKey(walletAddress)
    const marketPda = getMarketPda(authority, blockchainMarketId)

    // Create connection to devnet for testing
    const connection = new Connection("https://api.devnet.solana.com", "confirmed")
    
    // For now, we'll just update the database with the calculated values
    // In a real implementation, you would call initializeMarket here
    
    const updatedMarket = await db.market.update({
      where: { id: marketId },
      data: {
        marketPda: marketPda.toString(),
        authority: walletAddress,
        blockchainMarketId: blockchainMarketId.toString(),
      },
    })

    return NextResponse.json({
      success: true,
      marketPda: marketPda.toString(),
      blockchainMarketId,
      message: "Blockchain component initialized (simulated)",
      market: updatedMarket
    })
  } catch (error) {
    console.error("Error initializing blockchain market:", error)
    return NextResponse.json({ 
      error: "Failed to initialize blockchain market",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}