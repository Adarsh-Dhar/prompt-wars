"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface ResolvePanelProps {
  marketId: string
  currentOutcome?: string | null
}

export function ResolvePanel({ marketId, currentOutcome }: ResolvePanelProps) {
  const [outcome, setOutcome] = useState<"YES" | "NO" | "INVALID">("YES")
  const [resolvedBy, setResolvedBy] = useState("")
  const [resolutionTx, setResolutionTx] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleResolve = async () => {
    setSubmitting(true)
    setMessage(null)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
      const res = await fetch(`${baseUrl}/api/markets/${marketId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, resolvedBy, resolutionTx }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve")
      }
      setMessage("Resolved successfully")
    } catch (error: any) {
      setMessage(error.message || "Failed to resolve")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--neon-cyan)]">
          Manual Resolve
        </p>
        {currentOutcome && (
          <span className="font-mono text-[11px] text-muted-foreground">Current: {currentOutcome}</span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={outcome} onValueChange={(v) => setOutcome(v as any)}>
          <SelectTrigger className="font-mono text-xs">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="YES">YES wins</SelectItem>
            <SelectItem value="NO">NO wins</SelectItem>
            <SelectItem value="INVALID">INVALID</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Resolved by (wallet/admin)"
          value={resolvedBy}
          onChange={(e) => setResolvedBy(e.target.value)}
          className="font-mono text-xs"
        />
        <Input
          placeholder="Resolution tx (optional)"
          value={resolutionTx}
          onChange={(e) => setResolutionTx(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleResolve}
          disabled={submitting}
          className="neon-glow-cyan border border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--neon-cyan)]"
        >
          {submitting ? "Resolving..." : "Resolve Market"}
        </Button>
        {message && <span className="font-mono text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  )
}
