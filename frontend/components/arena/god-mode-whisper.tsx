"use client"

import { Lock, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function GodModeWhisper() {
  return (
    <Card className="border-[var(--neon-magenta)]/30 bg-gradient-to-r from-[var(--neon-magenta)]/5 to-[var(--neon-cyan)]/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neon-magenta)]/50 bg-[var(--neon-magenta)]/10">
              <Sparkles className="h-5 w-5 text-[var(--neon-magenta)]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">God Mode Whisper</h3>
              <p className="font-mono text-xs text-muted-foreground">Influence the agent{"'"}s decisions</p>
            </div>
          </div>

          {/* Input field */}
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <Input
                disabled
                placeholder="Enter prompt to influence agent..."
                className="border-border/50 bg-muted/30 pr-10 font-mono text-sm placeholder:text-muted-foreground/50"
              />
              <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Button
              disabled
              className="shrink-0 border border-border bg-muted font-mono text-xs uppercase tracking-widest text-muted-foreground"
            >
              Send Whisper
            </Button>
          </div>

          {/* Access badge */}
          <div className="flex items-center gap-2 rounded border border-[var(--neon-magenta)]/30 bg-[var(--neon-magenta)]/10 px-3 py-2">
            <Lock className="h-4 w-4 text-[var(--neon-magenta)]" />
            <span className="font-mono text-xs text-[var(--neon-magenta)]">Requires Alphabot Access Pass</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
