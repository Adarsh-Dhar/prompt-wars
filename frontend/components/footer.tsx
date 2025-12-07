import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-background/50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-center gap-8 px-4">
        <Link
          href="#"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
        >
          Indie.fun
        </Link>
        <Link
          href="#"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-magenta)]"
        >
          Solana
        </Link>
        <Link
          href="#"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-lime)]"
        >
          Moddio
        </Link>
        <Link
          href="#"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-[var(--neon-cyan)]"
        >
          icm.run
        </Link>
      </div>
    </footer>
  )
}
