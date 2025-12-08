import assert from "node:assert"
import { describe, it } from "node:test"
import { getPrices, getTradeQuote, initialCpmmState } from "../lib/solana/amm"

describe("CPMM math helpers", () => {
  it("splits initial liquidity 50/50", () => {
    const state = initialCpmmState(10, 100)
    assert.equal(state.reserveYes, 5)
    assert.equal(state.reserveNo, 5)
  })

  it("computes prices that sum to ~1", () => {
    const { priceYes, priceNo } = getPrices(4, 6)
    const sum = Number((priceYes + priceNo).toFixed(2))
    assert.equal(sum, 1)
  })

  it("produces positive shares out for YES buy", () => {
    const state = initialCpmmState(10, 0)
    const quote = getTradeQuote("YES", 2, state)
    assert.ok(quote.sharesOut > 0)
    assert.ok(quote.newReserveYes < state.reserveYes)
    assert.ok(quote.newReserveNo > state.reserveNo)
  })

  it("applies fees to trade amount", () => {
    const state = initialCpmmState(10, 100) // 1%
    const quoteNoFee = getTradeQuote("YES", 10, { ...state, feeBps: 0 })
    const quoteFee = getTradeQuote("YES", 10, state)
    assert.ok(quoteFee.sharesOut < quoteNoFee.sharesOut)
  })
})
