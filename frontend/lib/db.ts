import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Configure pool with proper settings to prevent connection issues
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 30000, // Increased to 30 seconds for slow connections
    // Prevent connection from being closed prematurely
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  })

// Handle pool errors
pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle client", err)
})

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool

const adapter = new PrismaPg(pool)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}

