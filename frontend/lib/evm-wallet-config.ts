import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains'

// Prefer environment variable; fallback to a placeholder so build errors point clearly if missing
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'MISSING_PROJECT_ID'

export const evmConfig = getDefaultConfig({
  appName: 'Prompt Wars',
  projectId,
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: true,
})

