import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Create a text embedding using OpenAI's text-embedding-3-small model
 */
export async function createTextEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot create embedding for empty text");
  }

  // Truncate to ~8000 tokens (roughly 32k characters) to stay within model limits
  const truncated = text.slice(0, 32000);

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncated,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("[createTextEmbedding] Error:", error);
    throw error;
  }
}

/**
 * Normalize a vector to unit length (for cosine similarity)
 */
export function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    return vector;
  }

  return vector.map((val) => val / magnitude);
}

/**
 * Compute cosine similarity between two normalized vectors
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Strip PII (emails, phone numbers) from text
 */
export function stripPII(text: string): string {
  let cleaned = text;

  // Remove email addresses
  cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]");

  // Remove phone numbers (various formats)
  cleaned = cleaned.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
  cleaned = cleaned.replace(/\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g, "[PHONE]");

  // Remove SSN-like patterns
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]");

  return cleaned;
}

/**
 * Parse a JSON-encoded vector string back to number array
 */
export function parseVector(vectorJson: string): number[] {
  try {
    return JSON.parse(vectorJson);
  } catch (error) {
    console.error("[parseVector] Error parsing vector:", error);
    return [];
  }
}

/**
 * Encode a vector array as JSON string for SQLite storage
 */
export function encodeVector(vector: number[]): string {
  return JSON.stringify(vector);
}

