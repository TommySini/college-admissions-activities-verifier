/**
 * Format and compact query results for AI prompts
 */

const MAX_TEXT_LENGTH = 200;
const MAX_ARRAY_ITEMS = 10;

/**
 * Compact a single result row for prompt inclusion
 */
export function compactRow(row: any): any {
  if (!row || typeof row !== "object") {
    return row;
  }

  const compacted: any = {};

  for (const [key, value] of Object.entries(row)) {
    // Skip null/undefined
    if (value === null || value === undefined) {
      continue;
    }

    // Truncate long strings
    if (typeof value === "string") {
      compacted[key] = value.length > MAX_TEXT_LENGTH
        ? value.substring(0, MAX_TEXT_LENGTH) + "..."
        : value;
      continue;
    }

    // Round numbers
    if (typeof value === "number") {
      compacted[key] = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
      continue;
    }

    // Format dates
    if (value instanceof Date) {
      compacted[key] = value.toISOString().split("T")[0];
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      compacted[key] = value.slice(0, MAX_ARRAY_ITEMS);
      continue;
    }

    // Handle nested objects (shallow only)
    if (typeof value === "object") {
      compacted[key] = compactRow(value);
      continue;
    }

    compacted[key] = value;
  }

  return compacted;
}

/**
 * Compact an array of results
 */
export function compactResults(results: any[]): any[] {
  return results.map(compactRow);
}

/**
 * Format results as a compact text summary for prompts
 */
export function formatResultsForPrompt(
  results: any[],
  modelName: string,
  maxRows: number = 10
): string {
  if (!results || results.length === 0) {
    return `No ${modelName} records found.`;
  }

  const compacted = compactResults(results.slice(0, maxRows));
  const hasMore = results.length > maxRows;

  let output = `**${modelName} (${results.length} total${hasMore ? `, showing ${maxRows}` : ""}):**\n`;

  compacted.forEach((row, index) => {
    output += `${index + 1}. `;
    
    // Format based on model type
    output += formatRowSummary(row, modelName);
    output += "\n";
  });

  return output;
}

/**
 * Format a single row as a one-line summary
 */
function formatRowSummary(row: any, modelName: string): string {
  // Model-specific formatting
  switch (modelName) {
    case "Activity":
      return `${row.name || "Activity"}${row.organization ? ` at ${row.organization}` : ""}${row.totalHours ? ` (${row.totalHours}h)` : ""}${row.verified ? " ✓" : ""}`;

    case "Organization":
      return `${row.name}${row.presidentName ? ` - President: ${row.presidentName}` : ""}${row.category ? ` (${row.category})` : ""}`;

    case "VolunteeringParticipation":
      return `${row.organizationName || row.activityName || "Volunteering"} - ${row.totalHours}h${row.verified ? " ✓" : ""}`;

    case "VolunteeringOpportunity":
      return `${row.title} at ${row.organization}${row.totalHours ? ` (${row.totalHours}h)` : ""}`;

    case "VolunteeringGoal":
      return `Target: ${row.targetHours}h${row.description ? ` - ${row.description}` : ""}`;

    case "AlumniProfile":
      return `${row.displayName || "Alumni"}${row.intendedMajor ? ` (${row.intendedMajor})` : ""}`;

    case "ExtractedActivity":
      return `${row.title}${row.organization ? ` at ${row.organization}` : ""}${row.hours ? ` (${row.hours}h)` : ""}`;

    case "AdmissionResult":
      return `${row.collegeName}: ${row.decision}${row.decisionRound ? ` (${row.decisionRound})` : ""}`;

    default:
      // Generic formatting: show name/title field + id
      const nameField = row.name || row.title || row.displayName || `ID: ${row.id}`;
      return nameField;
  }
}

/**
 * Redact PII from results
 */
export function redactPII(row: any): any {
  const piiFields = ["email", "phone", "address", "ssn", "password"];
  const redacted = { ...row };

  for (const field of piiFields) {
    if (redacted[field]) {
      redacted[field] = "[REDACTED]";
    }
  }

  return redacted;
}

/**
 * Format a model description for the AI
 */
export function formatModelDescription(modelName: string, fields: string[]): string {
  return `${modelName}: Available fields include ${fields.slice(0, 8).join(", ")}${fields.length > 8 ? `, and ${fields.length - 8} more` : ""}.`;
}

/**
 * Format available models list for the AI
 */
export function formatModelsList(models: string[]): string {
  const grouped: Record<string, string[]> = {
    "User Data": [],
    "Activities": [],
    "Volunteering": [],
    "Organizations": [],
    "Alumni": [],
    "Other": [],
  };

  models.forEach((model) => {
    if (["Activity", "Verification"].includes(model)) {
      grouped["Activities"].push(model);
    } else if (model.startsWith("Volunteering")) {
      grouped["Volunteering"].push(model);
    } else if (["Organization"].includes(model)) {
      grouped["Organizations"].push(model);
    } else if (model.startsWith("Alumni") || model.startsWith("Extracted") || model === "AdmissionResult") {
      grouped["Alumni"].push(model);
    } else if (["User"].includes(model)) {
      grouped["User Data"].push(model);
    } else {
      grouped["Other"].push(model);
    }
  });

  let output = "**Available Data Models:**\n";
  for (const [category, categoryModels] of Object.entries(grouped)) {
    if (categoryModels.length > 0) {
      output += `- ${category}: ${categoryModels.join(", ")}\n`;
    }
  }

  return output;
}

/**
 * Estimate token count for a string (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const targetLength = maxTokens * 4;
  return text.substring(0, targetLength) + "... [truncated]";
}

