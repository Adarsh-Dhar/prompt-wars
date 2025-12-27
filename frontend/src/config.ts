import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'My Crypto App',
    projectId: 'a7e2d08a1841f27f707fccb991d66dab', // Replace with your actual Project ID
    chains: [mainnet, polygon, optimism, arbitrum, base],
    ssr: true, // If using Next.js, set to true
});