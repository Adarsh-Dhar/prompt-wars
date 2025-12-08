// Proof Parser Utility
// Parses structured log content to extract market outcomes

import { AgentLog } from "./agent-server"
import { AgentLogsResponse } from "./agent-server"

export type LogOutcome = {
  outcome: "yes" | "no" | null
  confidence: "high" | "medium" | "low"
  reason?: string
}

export interface ProofData {
  chain_root_hash?: string
  signature?: string
  logs: AgentLog[]
  agent_public_key?: string
}

/**
 * Validate proof data structure
 */
export function validateProofData(data: ProofData): { valid: boolean; error?: string } {
  if (!data.logs || !Array.isArray(data.logs) || data.logs.length === 0) {
    return { valid: false, error: "Proof data must contain at least one log" }
  }

  // Optional: verify chain_root_hash and signature if present
  if (data.chain_root_hash && data.signature && data.agent_public_key) {
    // Basic validation - full verification should be done separately
    if (data.chain_root_hash.length !== 64) {
      return { valid: false, error: "Invalid chain_root_hash format" }
    }
  }

  return { valid: true }
}

/**
 * Parse structured log content to extract outcome
 * Priority:
 * 1. Structured JSON in details.outcome
 * 2. Structured JSON in message field
 * 3. Keyword matching fallback
 */
export function parseLogOutcome(logs: AgentLog[]): LogOutcome {
  if (!logs || logs.length === 0) {
    return { outcome: null, confidence: "low", reason: "No logs provided" }
  }

  // Priority 1: Check for structured format in details field
  for (const log of logs) {
    if (log.details && typeof log.details === "object") {
      const details = log.details as any
      if (details.outcome) {
        const outcome = normalizeOutcome(details.outcome)
        if (outcome) {
          return {
            outcome,
            confidence: "high",
            reason: details.reason || "Found in structured details field",
          }
        }
      }
    }

    // Try parsing details as JSON string
    if (log.details && typeof log.details === "string") {
      try {
        const parsed = JSON.parse(log.details)
        if (parsed.outcome) {
          const outcome = normalizeOutcome(parsed.outcome)
          if (outcome) {
            return {
              outcome,
              confidence: "high",
              reason: parsed.reason || "Found in parsed details JSON",
            }
          }
        }
      } catch {
        // Not JSON, continue
      }
    }
  }

  // Priority 2: Check for structured format in message field
  for (const log of logs) {
    if (log.message) {
      try {
        // Try parsing message as JSON
        const parsed = JSON.parse(log.message)
        if (parsed.outcome) {
          const outcome = normalizeOutcome(parsed.outcome)
          if (outcome) {
            return {
              outcome,
              confidence: "high",
              reason: parsed.reason || "Found in parsed message JSON",
            }
          }
        }
      } catch {
        // Not JSON, continue to keyword matching
      }
    }
  }

  // Priority 3: Keyword matching fallback
  const keywordResult = parseOutcomeFromKeywords(logs)
  if (keywordResult.outcome) {
    return keywordResult
  }

  return {
    outcome: null,
    confidence: "low",
    reason: "No outcome found in logs",
  }
}

/**
 * Normalize outcome string to "yes" | "no" | null
 */
function normalizeOutcome(outcome: string): "yes" | "no" | null {
  const normalized = outcome.toUpperCase().trim()
  if (normalized === "YES" || normalized === "Y" || normalized === "TRUE" || normalized === "1") {
    return "yes"
  }
  if (normalized === "NO" || normalized === "N" || normalized === "FALSE" || normalized === "0") {
    return "no"
  }
  return null
}

/**
 * Parse outcome from keywords in log messages
 * Looks for patterns like "BOUGHT", "SOLD", "YES", "NO", etc.
 */
function parseOutcomeFromKeywords(logs: AgentLog[]): LogOutcome {
  // Keywords that suggest YES outcome
  const yesKeywords = ["BOUGHT", "BUY", "YES", "MOON", "LONG", "BULLISH", "UP", "RISE", "GAIN"]
  // Keywords that suggest NO outcome
  const noKeywords = ["SOLD", "SELL", "NO", "RUG", "SHORT", "BEARISH", "DOWN", "FALL", "LOSS"]

  let yesCount = 0
  let noCount = 0
  let lastMatch: string | null = null

  for (const log of logs) {
    const message = (log.message || "").toUpperCase()
    const detailsStr = typeof log.details === "string" ? log.details.toUpperCase() : ""

    const combined = `${message} ${detailsStr}`

    // Check for YES keywords
    for (const keyword of yesKeywords) {
      if (combined.includes(keyword)) {
        yesCount++
        lastMatch = keyword
        break
      }
    }

    // Check for NO keywords
    for (const keyword of noKeywords) {
      if (combined.includes(keyword)) {
        noCount++
        lastMatch = keyword
        break
      }
    }
  }

  // Determine outcome based on keyword counts
  if (yesCount > noCount && yesCount > 0) {
    return {
      outcome: "yes",
      confidence: yesCount > 1 ? "medium" : "low",
      reason: `Found ${yesCount} YES-indicating keyword(s)${lastMatch ? ` (e.g., "${lastMatch}")` : ""}`,
    }
  }

  if (noCount > yesCount && noCount > 0) {
    return {
      outcome: "no",
      confidence: noCount > 1 ? "medium" : "low",
      reason: `Found ${noCount} NO-indicating keyword(s)${lastMatch ? ` (e.g., "${lastMatch}")` : ""}`,
    }
  }

  return {
    outcome: null,
    confidence: "low",
    reason: "No clear outcome indicators found",
  }
}
