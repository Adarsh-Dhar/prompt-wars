import { z } from "zod"

// Bet validation
export const placeBetSchema = z.object({
  position: z.enum(["MOON", "RUG"]),
  shares: z.number().int().positive().min(1),
  walletAddress: z.string().min(1),
})

// Market filters
export const marketFiltersSchema = z.object({
  category: z.string().optional(),
  status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})

// Agent filters
export const agentFiltersSchema = z.object({
  category: z.string().optional(),
  status: z.enum(["IDLE", "ACTIVE", "COMPLETED", "FAILED"]).optional(),
})

// Create agent schema
export const createAgentSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["IDLE", "ACTIVE", "COMPLETED", "FAILED"]).default("IDLE"),
})

// Log filters
export const logFiltersSchema = z.object({
  type: z.enum(["PUBLIC", "PREMIUM"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

// Profile filters
export const profileFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "SETTLED", "CANCELLED"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})

