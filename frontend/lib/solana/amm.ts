// Minimal AMM helpers used by the frontend. Returns safe defaults compatible with existing calls.
export function getPrices(reserveYes: number, reserveNo: number) {
  const rYes = Number(reserveYes || 0)
  const rNo = Number(reserveNo || 0)
  const total = rYes + rNo
  const priceYes = total > 0 ? rYes / total : 0.5
  const priceNo = 1 - priceYes
  return {
    priceYes,
    priceNo,
  }
}

export function getTradeQuote(amount: number) {
  // Simple deterministic quote stub
  const price = 0.5
  return {
    estimatedOutcomeYes: amount * price,
    estimatedOutcomeNo: amount * (1 - price),
    feeBps: 50,
  }
}

