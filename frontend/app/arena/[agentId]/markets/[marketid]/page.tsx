import { PredictionMarket } from "@/components/arena/prediction-market"
import Link from "next/link"
import { ResolvePanel } from "@/components/arena/resolve-panel"

async function getMarket(marketId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const res = await fetch(`${baseUrl}/api/markets/${marketId}`, { cache: "no-store" })
  if (!res.ok) return null
  return res.json()
}

export default async function AgentMarketDetailPage(
  props: { params: Promise<{ agentId: string; marketId: string }> }
) {
  const resolvedParams = await props.params
  const { agentId, marketId } = resolvedParams
  const data = await getMarket(marketId)

  if (!data?.market) {
    return (
      <div className="relative min-h-screen">
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <div className="rounded border border-border/60 bg-card/70 p-6 text-center font-mono text-sm text-muted-foreground">
            Market not found.
          </div>
        </div>
      </div>
    )
  }

  const market = data.market

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--glow-cyan)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--glow-magenta)_0%,_transparent_50%)] opacity-10" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--neon-cyan)]">
              Market Detail
            </p>
            <h1 className="font-mono text-2xl text-foreground">{market.statement}</h1>
            <p className="font-mono text-xs text-muted-foreground max-w-3xl">{market.description}</p>
            <div className="flex flex-wrap gap-3 text-[11px] font-mono text-muted-foreground">
              <span className="rounded bg-muted/40 px-2 py-1">
                Closes: {new Date(market.closesAt).toLocaleString()}
              </span>
              <span className="rounded bg-muted/40 px-2 py-1">Min bet: ${market.minBet}</span>
              {market.maxBet && <span className="rounded bg-muted/40 px-2 py-1">Max bet: ${market.maxBet}</span>}
              <span className="rounded bg-muted/40 px-2 py-1">Liquidity: ${market.liquidity}</span>
              <span className="rounded bg-muted/40 px-2 py-1">Fee: {(market.feeBps / 100).toFixed(2)}%</span>
              <span className="rounded bg-muted/40 px-2 py-1">State: {market.state}</span>
            </div>
          </div>
          <Link
            href={`/arena/${agentId}/markets`}
            className="font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--neon-cyan)] underline"
          >
            Back to markets
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded border border-border/60 bg-card/80 p-4 space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Pool
            </p>
            <div className="flex flex-col gap-2 font-mono text-xs text-muted-foreground">
              <span>YES price: ${(market.moonPrice || 0).toFixed(4)}</span>
              <span>NO price: ${(market.rugPrice || 0).toFixed(4)}</span>
              <span>YES reserve: {Number(market.reserveYes || 0).toFixed(2)}</span>
              <span>NO reserve: {Number(market.reserveNo || 0).toFixed(2)}</span>
              {market.mints?.yesMint && (
                <span className="break-all text-[10px]">YES mint: {market.mints.yesMint}</span>
              )}
              {market.mints?.noMint && (
                <span className="break-all text-[10px]">NO mint: {market.mints.noMint}</span>
              )}
            </div>
          </div>
          <div className="lg:col-span-2">
            <PredictionMarket market={market} agentId={agentId} marketId={marketId} />
          </div>
        </div>

        {market.state !== "RESOLVED" && (
          <div className="rounded border border-border/60 bg-card/70 p-4">
            <ResolvePanel marketId={market.id} currentOutcome={market.outcome} />
          </div>
        )}
      </div>
    </div>
  )
}
