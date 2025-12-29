// frontend/lib/wagmi-providers.ts
// Lazily resolve `publicProvider` at runtime to avoid throwing during module evaluation.
//
// This tries several common package layouts for wagmi (v3+) and @wagmi/core (legacy)
// and returns the provider instance (the result of calling the provider factory).
export async function getPublicProvider(): Promise<any> {
  const candidates = [
    "wagmi/providers/public",
    "wagmi/providers",
    "wagmi/dist/providers/public",
    "@wagmi/core/providers/public",
    "@wagmi/core/providers",
    "@wagmi/core/dist/providers/public",
  ]

  for (const path of candidates) {
    try {
      // dynamic import so this code only runs when invoked (safe during Next/Turbopack build)
      const mod = await import(path)
      // Try common export shapes
      const exported =
          mod.publicProvider ?? // named export
          mod.default ?? // default export
          mod.public ?? // possible variant
          null

      if (!exported) continue

      // If exported is a function it's usually the factory: call it to get the provider instance
      if (typeof exported === "function") {
        try {
          return exported()
        } catch (e) {
          // If calling failed, continue to next candidate
          continue
        }
      }

      // Otherwise return the exported provider object directly
      return exported
    } catch (err) {
      // ignore and try next candidate
      continue
    }
  }

  throw new Error(
      "Could not load 'publicProvider'. Please ensure you have 'wagmi' (v3+) or '@wagmi/core' installed and available to the frontend package."
  )
}
