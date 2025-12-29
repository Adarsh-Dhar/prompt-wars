// frontend/lib/db.ts
// Safe wrapper around Prisma client so dev server doesn't crash when the generated client is missing.
// If @prisma/client or @prisma/adapter-pg cannot be loaded, a simple stub is exported
// that matches the minimal API used by the frontend pages (market.findMany, bet.findMany, mission.count, agent.count).

import { Pool } from "pg"

type AnyDB = any

let dbClient: AnyDB
let _testConnection = async () => false

try {
    // Use require() so bundlers that evaluate static imports don't fail here if package isn't present.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require("@prisma/client")
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require("@prisma/adapter-pg")

    const globalForPrisma = globalThis as unknown as {
        prisma?: AnyDB
        pool?: Pool
    }

    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set")
    }

    const pool =
        globalForPrisma.pool ??
        new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 30000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        })

    pool.on("error", (err: Error) => {
        console.error("Unexpected error on idle client", err)
    })

    if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool

    const adapter = new PrismaPg(pool)

    globalForPrisma.prisma =
        globalForPrisma.prisma ??
        new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        })

    dbClient = globalForPrisma.prisma

    _testConnection = async () => {
        try {
            // lightweight check
            await dbClient.$queryRaw`SELECT 1`
            return true
        } catch (err) {
            console.error("Database connection test failed:", err)
            return false
        }
    }
} catch (err) {
    // If prisma packages or generated client are missing, export a small stub that prevents runtime crashes.
    // This returns safe empty/default values used by the frontend pages.
    // Log a warn so you know the reason in dev console.
    // eslint-disable-next-line no-console
    console.warn("@prisma/client or adapter not available — using fallback DB stub. Error:", err)

    const stub = {
        market: {
            findMany: async (_opts?: any) => [] as any[],
        },
        bet: {
            findMany: async (_opts?: any) => [] as any[],
        },
        mission: {
            count: async (_opts?: any) => 0,
        },
        agent: {
            count: async (_opts?: any) => 0,
        },
        // minimal $queryRaw to satisfy testConnection usage
        $queryRaw: async () => {
            throw new Error("Prisma client not available")
        },
    }

    dbClient = stub
    _testConnection = async () => false
}

export const db: AnyDB = dbClient

// Helper function (kept for compatibility)
export async function testConnection(): Promise<boolean> {
    return _testConnection()
}
