"use client"

import React, { useMemo } from "react"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit"
import { evmConfig } from "@/lib/evm-wallet-config"

// Solana wallet adapter imports
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"

// Import Solana wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css"

const queryClient = new QueryClient()

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
    // Solana configuration
    const solanaEndpoint = useMemo(() => {
        return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet")
    }, [])

    const solanaWallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
    ], [])

    return (
        <ConnectionProvider endpoint={solanaEndpoint}>
            <WalletProvider wallets={solanaWallets} autoConnect>
                <WalletModalProvider>
                    <WagmiProvider config={evmConfig}>
                        <QueryClientProvider client={queryClient}>
                            <RainbowKitProvider theme={darkTheme()}>
                                {children}
                            </RainbowKitProvider>
                        </QueryClientProvider>
                    </WagmiProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}
