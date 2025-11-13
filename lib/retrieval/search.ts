import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";
import { createTextEmbedding, normalize, parseVector, cosine } from "./embeddings";
import { getSupportedModels } from "./buildContent";
import {
  getPrivacyConstraints,
} from "@/lib/assistant/privacy";
import {
  isUserScopedModel,
  getUserScopeField,
  canStudentAccessModel,
  describeModel,
} from "@/lib/assistant/runtimeModels";

export interface SearchMatch {
  modelName: string;
  recordId: string;
  score: number;
  snippet: string;
  ownerId?: string;
}

export interface SearchOptions {
  query: string;
  models?: string[]; // If not specified, search all supported models
  user: User;
  topK?: number;
}

export interface SearchResult {
  matches: SearchMatch[];
  totalCandidates: number;
}

/**
 * Perform semantic search across platform data with privacy filtering
 */
export async function semanticSearch(
  options: SearchOptions
): Promise<SearchResult> {
  const { query, models, user, topK = 10 } = options;

  try {
    // Create query embedding
    const queryVector = normalize(await createTextEmbedding(query));

    // Determine which models to search
    let modelsToSearch = models || getSupportedModels();

    // OPEN MODE: No model filtering
    // TODO: Re-enable model filtering later
    // modelsToSearch = modelsToSearch.filter((modelName) => {
    //   if (user.role === "admin") {
    //     return true;
    //   }
    //   return canStudentAccessModel(modelName);
    // });

    if (modelsToSearch.length === 0) {
      return { matches: [], totalCandidates: 0 };
    }

    // Build WHERE clause for embeddings (open mode: no privacy filters)
    const whereConditions: any[] = [];

    for (const modelName of modelsToSearch) {
      const modelCondition: any = { modelName };

      // OPEN MODE: No user scoping or privacy constraints
      // TODO: Re-enable privacy constraints later
      // const privacy = getPrivacyConstraints({ user, modelName });
      // if (!privacy.allowed) {
      //   continue;
      // }
      // if (user.role !== "admin" && isUserScopedModel(modelName)) {
      //   const scopeField = getUserScopeField(modelName);
      //   if (scopeField) {
      //     modelCondition.ownerId = user.id;
      //   }
      // }
      
      whereConditions.push(modelCondition);
    }

    if (whereConditions.length === 0) {
      return { matches: [], totalCandidates: 0 };
    }

    // Fetch candidate embeddings
    const embeddings = await prisma.embedding.findMany({
      where: {
        OR: whereConditions,
      },
      select: {
        id: true,
        modelName: true,
        recordId: true,
        content: true,
        vector: true,
        ownerId: true,
      },
    });

    console.log(`[semanticSearch] Found ${embeddings.length} candidate embeddings`);

    // Compute similarities
    const scoredMatches: SearchMatch[] = embeddings
      .map((embedding) => {
        const embeddingVector = parseVector(embedding.vector);
        const score = cosine(queryVector, embeddingVector);

        // Create snippet (first 200 chars)
        const snippet = embedding.content.slice(0, 200) + 
          (embedding.content.length > 200 ? "..." : "");

        return {
          modelName: embedding.modelName,
          recordId: embedding.recordId,
          score,
          snippet,
          ownerId: embedding.ownerId || undefined,
        };
      })
      .filter((match) => match.score > 0.3) // Threshold for relevance
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, topK); // Take top K

    // OPEN MODE: No record-level privacy filtering
    // TODO: Re-enable privacy filtering later
    // const filteredMatches = await applyRecordLevelPrivacy(scoredMatches, user);

    // FALLBACK: If no embeddings found, do direct DB text search
    if (scoredMatches.length === 0) {
      console.log(`[semanticSearch] No embeddings found, falling back to DB text search`);
      const fallbackMatches = await databaseTextSearch(query, modelsToSearch, topK);
      return {
        matches: fallbackMatches,
        totalCandidates: fallbackMatches.length,
      };
    }

    return {
      matches: scoredMatches,
      totalCandidates: embeddings.length,
    };
  } catch (error) {
    console.error("[semanticSearch] Error:", error);
    // On error, try fallback
    try {
      console.log(`[semanticSearch] Error occurred, attempting DB text search fallback`);
      const modelsToSearch = models || getSupportedModels();
      const fallbackMatches = await databaseTextSearch(query, modelsToSearch, topK);
      return {
        matches: fallbackMatches,
        totalCandidates: fallbackMatches.length,
      };
    } catch (fallbackError) {
      console.error("[semanticSearch] Fallback also failed:", fallbackError);
      return { matches: [], totalCandidates: 0 };
    }
  }
}

/**
 * Apply record-level privacy filtering (e.g., for alumni profiles)
 */
async function applyRecordLevelPrivacy(
  matches: SearchMatch[],
  user: User
): Promise<SearchMatch[]> {
  // OPEN MODE: No record-level privacy filtering
  // TODO: Re-enable privacy filtering later by removing this line
  return matches;

  // For now, we'll filter out ANONYMOUS alumni profiles
  // In the future, this could be more sophisticated

  const filtered: SearchMatch[] = [];

  for (const match of matches) {
    let allowed = true;

    // Check alumni-related models
    if (
      match.modelName === "ExtractedEssay" ||
      match.modelName === "ExtractedActivity" ||
      match.modelName === "ExtractedAward" ||
      match.modelName === "AlumniApplication"
    ) {
      // These are linked to applications, which are linked to profiles
      // We need to check the profile's privacy setting
      
      if (match.modelName === "AlumniApplication") {
        const app = await prisma.alumniApplication.findUnique({
          where: { id: match.recordId },
          include: { alumniProfile: true },
        });

        if (app?.alumniProfile?.privacy === "ANONYMOUS") {
          allowed = false;
        }
      } else {
        // For extracted data, get the application first
        const prismaModel = (prisma as any)[
          match.modelName.charAt(0).toLowerCase() + match.modelName.slice(1)
        ];

        const record = await prismaModel.findUnique({
          where: { id: match.recordId },
          include: {
            application: {
              include: { alumniProfile: true },
            },
          },
        });

        if (record?.application?.alumniProfile?.privacy === "ANONYMOUS") {
          allowed = false;
        }
      }
    }

    if (allowed) {
      filtered.push(match);
    }
  }

  return filtered;
}

/**
 * Database text search fallback when embeddings are not available
 */
async function databaseTextSearch(
  query: string,
  modelsToSearch: string[],
  topK: number
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  const searchLower = query.toLowerCase();

  for (const modelName of modelsToSearch) {
    try {
      const modelDesc = describeModel(modelName);
      if (!modelDesc) continue;

      // Get text fields to search
      const textFields = modelDesc.fields
        .filter((f) => f.type === "String" && !f.isRelation && !f.name.includes("password") && !f.name.includes("token"))
        .map((f) => f.name);

      if (textFields.length === 0) continue;

      // Get Prisma model
      const prismaModel = (prisma as any)[
        modelName.charAt(0).toLowerCase() + modelName.slice(1)
      ];

      if (!prismaModel) continue;

      // Build OR conditions for text search (SQLite is case-insensitive by default for LIKE)
      const orConditions = textFields.map((field) => ({
        [field]: { contains: query },
      }));

      // Search records
      const records = await prismaModel.findMany({
        where: { OR: orConditions },
        take: topK,
      });

      // Convert to SearchMatch format
      for (const record of records) {
        // Build snippet from text fields
        let snippetParts: string[] = [];
        for (const field of textFields) {
          if (record[field] && typeof record[field] === "string") {
            const fieldValue = record[field] as string;
            if (fieldValue.toLowerCase().includes(searchLower)) {
              snippetParts.push(`${field}: ${fieldValue.slice(0, 100)}`);
            }
          }
        }

        const snippet = snippetParts.join(" | ").slice(0, 200) + "...";

        matches.push({
          modelName,
          recordId: record.id,
          score: 0.5, // Fixed score for text matches
          snippet: snippet || "Match found",
          ownerId: record.studentId || record.userId || undefined,
        });
      }
    } catch (error) {
      console.error(`[databaseTextSearch] Error searching ${modelName}:`, error);
      // Continue with other models
    }
  }

  // Sort by model name and take top K
  return matches.slice(0, topK);
}

/**
 * Format search results for display in assistant
 */
export function formatSearchResults(matches: SearchMatch[]): string {
  if (matches.length === 0) {
    return "No relevant results found.";
  }

  // Group by model
  const grouped = new Map<string, SearchMatch[]>();
  for (const match of matches) {
    if (!grouped.has(match.modelName)) {
      grouped.set(match.modelName, []);
    }
    grouped.get(match.modelName)!.push(match);
  }

  let output = `Found ${matches.length} relevant results:\n\n`;

  for (const [modelName, modelMatches] of grouped.entries()) {
    output += `**${modelName}** (${modelMatches.length}):\n`;
    
    for (const match of modelMatches) {
      const scorePercent = Math.round(match.score * 100);
      output += `- [${scorePercent}%] ${match.snippet}\n`;
      output += `  (ID: ${match.recordId})\n`;
    }
    
    output += "\n";
  }

  return output;
}

