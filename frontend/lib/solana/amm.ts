import { Keypair } from "@solana/web3.js"

export type CpmmReserves = {
  reserveYes: number
  reserveNo: number
  feeBps: number
}

export type TradeQuote = {
  sharesOut: number
  newReserveYes: number
  newReserveNo: number
  priceYes: number
  priceNo: number
  invariant: number
}

export function generateMintAddresses() {
  // We currently generate throwaway addresses to keep API responses shaped for on-chain integration.
  // Replace this with real mint creation + tx signatures when wiring to Solana programs.
  const yesMint = Keypair.generate().publicKey.toBase58()
  const noMint = Keypair.generate().publicKey.toBase58()
  const lpMint = Keypair.generate().publicKey.toBase58()
  const poolAuthority = Keypair.generate().publicKey.toBase58()
  const poolYesAccount = Keypair.generate().publicKey.toBase58()
  const poolNoAccount = Keypair.generate().publicKey.toBase58()

  return { yesMint, noMint, lpMint, poolAuthority, poolYesAccount, poolNoAccount }
}

export function initialCpmmState(initialLiquidity: number, feeBps: number): CpmmReserves {
  const half = Number(initialLiquidity) / 2
  return {
    reserveYes: half,
    reserveNo: half,
    feeBps,
  }
}

export function getPrices(reserveYes: number, reserveNo: number) {
  const total = reserveYes + reserveNo
  if (total === 0) {
    return { priceYes: 0.5, priceNo: 0.5 }
  }

  // PriceYes rises as reserveYes falls relative to reserveNo, mirroring CPMM scarcity
  const priceYes = reserveNo / total
  const priceNo = reserveYes / total
  return {
    priceYes: clampPrice(priceYes),
    priceNo: clampPrice(priceNo),
  }
}

export function getTradeQuote(
  side: "YES" | "NO",
  amountIn: number,
  state: CpmmReserves
): TradeQuote {
  const feeMultiplier = 1 - state.feeBps / 10_000
  const amount = amountIn * feeMultiplier
  const k = state.reserveYes * state.reserveNo

  if (side === "YES") {
    const newReserveNo = state.reserveNo + amount
    const newReserveYes = k / newReserveNo
    const sharesOut = state.reserveYes - newReserveYes
    const { priceYes, priceNo } = getPrices(newReserveYes, newReserveNo)
    return {
      sharesOut,
      newReserveYes,
      newReserveNo,
      priceYes,
      priceNo,
      invariant: newReserveYes * newReserveNo,
    }
  } else {
    const newReserveYes = state.reserveYes + amount
    const newReserveNo = k / newReserveYes
    const sharesOut = state.reserveNo - newReserveNo
    const { priceYes, priceNo } = getPrices(newReserveYes, newReserveNo)
    return {
      sharesOut,
      newReserveYes,
      newReserveNo,
      priceYes,
      priceNo,
      invariant: newReserveYes * newReserveNo,
    }
  }
}

function clampPrice(price: number) {
  return Math.max(0.01, Math.min(0.99, Number(price.toFixed(4))))
}
