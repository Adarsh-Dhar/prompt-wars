import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { cronosTestnet } from 'wagmi/chains'

// Prefer environment variable; fallback to a placeholder so build errors point clearly if missing
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'MISSING_PROJECT_ID'

export const evmConfig = getDefaultConfig({
  appName: 'Prompt Wars',
  projectId,
  chains: [cronosTestnet],
  ssr: true,
})

