/**
 * Normalization utilities for API responses
 * Ensures consistent data shapes regardless of DB storage format
 */

import { Prisma } from "@prisma/client";

/**
 * Normalize awardTypes from Prisma Json field to string array
 * Handles: null, undefined, string (legacy CSV), Json array, or malformed data
 */
export function normalizeAwardTypes(input: unknown): string[] {
  // Already an array
  if (Array.isArray(input)) {
    return input.map(String).filter(Boolean);
  }
  
  // Null or undefined
  if (input == null) {
    return [];
  }
  
  // String (legacy comma/space-separated)
  if (typeof input === "string") {
    // Empty string check
    if (!input.trim()) return [];
    
    // Try to parse as JSON first (might be stringified array)
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // Not JSON, treat as CSV
    }
    
    // Fall back to CSV split
    return input
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  
  // Prisma Json or object - try to coerce
  try {
    const arr = Array.from((input as any) ?? []);
    return arr.map(String).filter(Boolean);
  } catch {
    console.warn("[normalizeAwardTypes] Unexpected input type:", typeof input, input);
    return [];
  }
}

/**
 * Normalize a full edition object for API response
 */
export function normalizeEdition(edition: any) {
  return {
    ...edition,
    awardTypes: normalizeAwardTypes(edition.awardTypes),
  };
}

