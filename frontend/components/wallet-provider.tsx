// frontend/components/wallet-provider.tsx
"use client"

import React, { useMemo, useEffect, useState } from "react"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit"
import { evmConfig } from "@/lib/evm-wallet-config"

const queryClient = new QueryClient()

/**
 * This component dynamically imports the Solana wallet adapter modules at runtime (client-side).
 * If those packages are not installed/resolvable, we fall back to rendering the app without
 * the Solana providers so bundling doesn't fail.
 */
export function WalletContextProvider({ children }: { children: React.ReactNode }) {
    const [solanaLoaded, setSolanaLoaded] = useState(false)
    const [SolanaComponents, setSolanaComponents] = useState<any>(null)

    // Solana configuration values kept same as before but only used if dynamic import succeeds
    const solanaEndpoint = useMemo(() => {
        // eslint-disable-next-line no-undef
        const envUrl = (process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string) || undefined
        // clusterApiUrl will be provided by dynamic import if needed
        return envUrl
    }, [])

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                // Dynamically import all Solana-related modules (client-side only).
                const [
                    solanaReact,
                    solanaReactUi,
                    solanaWallets,
                    solanaWeb3,
                ] = await Promise.all([
                    import("@solana/wallet-adapter-react"),
                    import("@solana/wallet-adapter-react-ui"),
                    import("@solana/wallet-adapter-wallets"),
                    import("@solana/web3.js"),
                ])

                if (!mounted) return

                // Build the wallets array using the adapters
                const PhantomWalletAdapter = solanaWallets.PhantomWalletAdapter
                const SolflareWalletAdapter = solanaWallets.SolflareWalletAdapter
                const ConnectionProvider = solanaReact.ConnectionProvider
                const WalletProvider = solanaReact.WalletProvider
                const WalletModalProvider = solanaReactUi.WalletModalProvider
                const clusterApiUrl = solanaWeb3.clusterApiUrl

                setSolanaComponents({
                    ConnectionProvider,
                    WalletProvider,
                    WalletModalProvider,
                    PhantomWalletAdapter,
                    SolflareWalletAdapter,
                    clusterApiUrl,
                })
                setSolanaLoaded(true)
            } catch (err) {
                // If dynamic import fails (packages not installed), log a warning and continue.
                // This prevents dev server crashes when packages are missing.
                // eslint-disable-next-line no-console
                console.warn("Solana adapters not available; WalletProvider will render without Solana adapters:", err)
                setSolanaLoaded(false)
                setSolanaComponents(null)
            }
        })()

        return () => {
            mounted = false
        }
    }, [])

    // If Solana components are loaded, render the full nested provider tree.
    if (solanaLoaded && SolanaComponents) {
        const {
            ConnectionProvider,
            WalletProvider,
            WalletModalProvider,
            PhantomWalletAdapter,
            SolflareWalletAdapter,
            clusterApiUrl,
        } = SolanaComponents

        const endpoint = solanaEndpoint || clusterApiUrl("devnet")
        const solanaWallets = [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ]

        return (
            // EVM + React Query wrappers remain as before
            <WagmiProvider config={evmConfig}>
                <QueryClientProvider client={queryClient}>
                    <RainbowKitProvider theme={darkTheme()}>
                        <ConnectionProvider endpoint={endpoint}>
                            <WalletProvider wallets={solanaWallets} autoConnect>
                                <WalletModalProvider>
                                    {children}
                                </WalletModalProvider>
                            </WalletProvider>
                        </ConnectionProvider>
                    </RainbowKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        )
    }

    // Fallback: render with EVM + React Query + RainbowKit only (no Solana wrappers)
    return (
        <WagmiProvider config={evmConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme()}>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}
