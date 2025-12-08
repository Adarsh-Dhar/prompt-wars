// Chain of Thought Verification Utilities
// Verifies cryptographic integrity of log chains

import { PublicKey } from '@solana/web3.js';

export interface VerifiedLog {
  log_id?: number;
  id: number | string;
  timestamp: string;
  message: string;
  type: string;
  details?: any;
  previous_hash?: string;
  current_hash?: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Calculate SHA256 hash (browser-compatible)
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Serialize log content for hashing (must match server-side serialization)
 */
function serializeLogContent(message: string, type: string, details: any, timestamp: string): string {
  return JSON.stringify({
    message: message,
    type: type,
    details: details,
    timestamp: timestamp
  });
}

/**
 * Calculate hash for a log entry (must match server-side calculation)
 */
async function calculateLogHash(previousHash: string, logContent: string): Promise<string> {
  const data = previousHash + logContent;
  return sha256(data);
}

/**
 * Verify chain integrity - checks that each log's previous_hash matches the previous log's current_hash
 */
export async function verifyChainIntegrity(logs: VerifiedLog[]): Promise<ChainVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (logs.length === 0) {
    return { valid: true, errors: [], warnings: ['Chain is empty'] };
  }

  // Check if logs have hash fields (backward compatibility)
  const hasHashes = logs.some(log => log.previous_hash !== undefined || log.current_hash !== undefined);
  if (!hasHashes) {
    warnings.push('Logs do not contain hash fields - chain verification unavailable');
    return { valid: true, errors: [], warnings };
  }

  // Verify each log's hash chain
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const previousHash = log.previous_hash || '';
    const currentHash = log.current_hash || '';

    // First log should have empty previous_hash
    if (i === 0) {
      if (previousHash !== '') {
        errors.push(`Log ${i + 1} (log_id: ${log.log_id || 'unknown'}): First log should have empty previous_hash, got: ${previousHash}`);
      }
    } else {
      // Check that previous_hash matches previous log's current_hash
      const prevLog = logs[i - 1];
      const expectedPreviousHash = prevLog.current_hash || '';
      
      if (previousHash !== expectedPreviousHash) {
        errors.push(
          `Log ${i + 1} (log_id: ${log.log_id || 'unknown'}): ` +
          `previous_hash mismatch. Expected: ${expectedPreviousHash.substring(0, 16)}..., ` +
          `Got: ${previousHash.substring(0, 16)}...`
        );
      }
    }

    // Verify current_hash is correct
    if (currentHash) {
      const logContent = serializeLogContent(log.message, log.type, log.details, log.timestamp);
      const calculatedHash = await calculateLogHash(previousHash, logContent);
      
      if (currentHash !== calculatedHash) {
        errors.push(
          `Log ${i + 1} (log_id: ${log.log_id || 'unknown'}): ` +
          `current_hash mismatch. Expected: ${calculatedHash.substring(0, 16)}..., ` +
          `Got: ${currentHash.substring(0, 16)}...`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Calculate chain root hash from all log hashes (must match server-side calculation)
 */
export async function calculateChainRootHash(logs: VerifiedLog[]): Promise<string> {
  if (logs.length === 0) {
    return await sha256('');
  }
  
  const chainRoot = logs.map(log => log.current_hash || '').join('');
  return sha256(chainRoot);
}

/**
 * Simple base58 decoder (for signature decoding)
 */
function base58Decode(str: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = 0n;
  for (const char of str) {
    const index = alphabet.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    num = num * 58n + BigInt(index);
  }
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }
  return new Uint8Array(bytes);
}

/**
 * Verify Ed25519 signature using Solana's PublicKey.verify
 * The server signs with nacl.sign.detached, so we verify using Solana's method
 */
export async function verifyChainSignature(
  chainRootHash: string,
  signature: string,
  agentPublicKey: string
): Promise<SignatureVerificationResult> {
  try {
    if (!signature || !agentPublicKey) {
      return { valid: false, error: 'Missing signature or public key' };
    }

    // Create PublicKey from agent's public key
    const publicKeyObj = new PublicKey(agentPublicKey);
    
    // Convert chain root hash to Uint8Array
    const message = Uint8Array.from(Buffer.from(chainRootHash, 'hex'));
    
    // Decode base58 signature
    const signatureBytes = base58Decode(signature);
    
    // Verify using Solana's PublicKey.verify (which uses nacl internally)
    // This matches the server-side signing with nacl.sign.detached
    const isValid = publicKeyObj.verify(message, signatureBytes);
    
    if (!isValid) {
      return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Complete chain verification - checks both integrity and signature
 */
export async function verifyCompleteChain(
  logs: VerifiedLog[],
  chainRootHash: string,
  signature: string,
  agentPublicKey: string
): Promise<ChainVerificationResult & { signatureValid: boolean }> {
  // Verify chain integrity
  const integrityResult = await verifyChainIntegrity(logs);
  
  // Verify signature
  const signatureResult = await verifyChainSignature(chainRootHash, signature, agentPublicKey);
  
  // Recalculate chain root hash to verify it matches
  const calculatedRootHash = await calculateChainRootHash(logs);
  const rootHashMatches = calculatedRootHash === chainRootHash;
  
  const allErrors = [...integrityResult.errors];
  if (!signatureResult.valid) {
    allErrors.push(`Signature verification failed: ${signatureResult.error}`);
  }
  if (!rootHashMatches) {
    allErrors.push(
      `Chain root hash mismatch. Expected: ${chainRootHash.substring(0, 16)}..., ` +
      `Calculated: ${calculatedRootHash.substring(0, 16)}...`
    );
  }

  return {
    valid: integrityResult.valid && signatureResult.valid && rootHashMatches,
    errors: allErrors,
    warnings: integrityResult.warnings,
    signatureValid: signatureResult.valid && rootHashMatches
  };
}
