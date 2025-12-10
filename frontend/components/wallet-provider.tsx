"use client"

import React, { useMemo } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { SolflareWalletAdapter, PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"
import * as anchor from "@coral-xyz/anchor";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

export function WalletContextProvider({ children }: { children: React.ReactNode }) {
  // Configure network to devnet
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => anchor.web3.clusterApiUrl(network), [network])

  // Initialize wallet adapters - prioritize Solflare, include Phantom as fallback
  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
      new PhantomWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

