import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { cronosTestnet } from 'wagmi/chains';

// Use this config ONLY if you are not using /lib/evm-wallet-config.ts
// For Prompt Wars, always prefer importing from /lib/evm-wallet-config.ts

export const config = getDefaultConfig({
    appName: 'Prompt Wars',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'MISSING_PROJECT_ID',
    chains: [cronosTestnet],
    ssr: true, // If using Next.js, set to true
});