// x402 Middleware for Next.js API Routes
// Handles payment verification for x402-protected endpoints

import { NextRequest, NextResponse } from "next/server"
import { assertPaymentToServer, solToLamports } from "./solana/transactions"
import { PEEK_PRICE } from "./agent-server"

const SERVER_WALLET = process.env.NEXT_PUBLIC_SERVER_WALLET

export interface PaymentRequiredResponse {
  error: string
  price: number
  currency: string
  recipient: string
  memo: string
}

/**
 * Creates x402 middleware for a specific endpoint with custom price
 * @param price Price in SOL
 * @param endpointName Name of the endpoint for memo
 * @returns Middleware function
 */
export function createX402Middleware(price: number = PEEK_PRICE, endpointName: string = "endpoint") {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    if (!SERVER_WALLET) {
      return NextResponse.json(
        { error: "Server wallet not configured" },
        { status: 500 }
      )
    }

    // Extract signature from Authorization header: "Signature <tx_signature>"
    const authHeader = req.headers.get("authorization")
    let paymentSignature: string | null = null

    if (authHeader && authHeader.startsWith("Signature ")) {
      paymentSignature = authHeader.substring(11).trim()
    }

    // If no payment signature, demand payment with proper 402 response
    if (!paymentSignature) {
      const timestamp = new Date().toISOString()
      const memo = `Payment for ${endpointName} ${timestamp}`

      return NextResponse.json(
        {
          error: "Payment Required",
          price: price,
          currency: "SOL",
          recipient: SERVER_WALLET,
          memo: memo,
        },
        { status: 402 }
      )
    }

    // Verify Payment on-chain
    try {
      const expectedLamports = solToLamports(price)
      await assertPaymentToServer(paymentSignature, expectedLamports)

      // Payment valid - return null to continue
      return null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment verification failed"
      
      // If transaction not found or not confirmed, return 400
      if (errorMessage.includes("not found") || errorMessage.includes("not yet confirmed")) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        )
      }

      // Otherwise, return 402
      return NextResponse.json(
        { error: errorMessage },
        { status: 402 }
      )
    }
  }
}

/**
 * Default x402 middleware using PEEK_PRICE
 */
export const x402Middleware = createX402Middleware(PEEK_PRICE, "premium endpoint")
