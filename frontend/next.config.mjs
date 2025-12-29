import path from "path";
import { fileURLToPath } from "url";

/** Create __dirname in ESM (import.meta.url) */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    turbopack: true,
    // set the root directory for turbopack to frontend
    root: __dirname,
  },
};

export default nextConfig;