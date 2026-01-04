import { stripPII } from './embeddings';

export interface EmbeddableContent {
  content: string;
  ownerId?: string;
}

/**
 * Build embeddable content from a record based on its model type
 * Selects relevant fields, flattens JSON, and strips PII
 */
export function buildEmbeddableContent(modelName: string, row: any): EmbeddableContent | null {
  if (!row) return null;

  let content = '';
  let ownerId: string | undefined = undefined;

  switch (modelName) {
    case 'AlumniApplication': {
      // Use the full raw text from the application
      if (row.rawText) {
        content = row.rawText;
      }
      break;
    }

    case 'ExtractedEssay': {
      // Combine topic, prompt, summary, and tags
      const parts: string[] = [];
      if (row.topic) parts.push(`Topic: ${row.topic}`);
      if (row.prompt) parts.push(`Prompt: ${row.prompt}`);
      if (row.summary) parts.push(`Summary: ${row.summary}`);
      if (row.tags) {
        try {
          const tags = JSON.parse(row.tags);
          if (Array.isArray(tags) && tags.length > 0) {
            parts.push(`Tags: ${tags.join(', ')}`);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      content = parts.join('\n');
      break;
    }

    case 'ExtractedActivity': {
      // Combine title, description, organization, role
      const activityParts: string[] = [];
      if (row.title) activityParts.push(`Activity: ${row.title}`);
      if (row.organization) activityParts.push(`Organization: ${row.organization}`);
      if (row.role) activityParts.push(`Role: ${row.role}`);
      if (row.description) activityParts.push(`Description: ${row.description}`);
      if (row.hours) activityParts.push(`Hours: ${row.hours}`);
      if (row.years) activityParts.push(`Years: ${row.years}`);
      content = activityParts.join('\n');
      break;
    }

    case 'ExtractedAward': {
      // Combine title, level, year, description
      const awardParts: string[] = [];
      if (row.title) awardParts.push(`Award: ${row.title}`);
      if (row.level) awardParts.push(`Level: ${row.level}`);
      if (row.year) awardParts.push(`Year: ${row.year}`);
      if (row.description) awardParts.push(`Description: ${row.description}`);
      content = awardParts.join('\n');
      break;
    }

    case 'AdmissionResult': {
      // Combine college name, decision, round
      const resultParts: string[] = [];
      if (row.collegeName) resultParts.push(`College: ${row.collegeName}`);
      if (row.decision) resultParts.push(`Decision: ${row.decision}`);
      if (row.decisionRound) resultParts.push(`Round: ${row.decisionRound}`);
      if (row.rankBucket) resultParts.push(`Rank: ${row.rankBucket}`);
      content = resultParts.join('\n');
      break;
    }

    case 'Organization': {
      // Combine name, description, leadership, president
      const orgParts: string[] = [];
      if (row.name) orgParts.push(`Organization: ${row.name}`);
      if (row.description) orgParts.push(`Description: ${row.description}`);
      if (row.category) orgParts.push(`Category: ${row.category}`);
      if (row.leadership) orgParts.push(`Leadership: ${row.leadership}`);
      if (row.presidentName) orgParts.push(`President: ${row.presidentName}`);
      content = orgParts.join('\n');
      break;
    }

    case 'VolunteeringOpportunity': {
      // Combine title, description, organization, category
      const oppParts: string[] = [];
      if (row.title) oppParts.push(`Opportunity: ${row.title}`);
      if (row.organization) oppParts.push(`Organization: ${row.organization}`);
      if (row.description) oppParts.push(`Description: ${row.description}`);
      if (row.category) oppParts.push(`Category: ${row.category}`);
      if (row.location) oppParts.push(`Location: ${row.location}`);
      content = oppParts.join('\n');
      break;
    }

    case 'Activity': {
      // User-scoped: student's own activities
      const studentActivityParts: string[] = [];
      if (row.name) studentActivityParts.push(`Activity: ${row.name}`);
      if (row.organization) studentActivityParts.push(`Organization: ${row.organization}`);
      if (row.role) studentActivityParts.push(`Role: ${row.role}`);
      if (row.description) studentActivityParts.push(`Description: ${row.description}`);
      if (row.category) studentActivityParts.push(`Category: ${row.category}`);
      content = studentActivityParts.join('\n');
      ownerId = row.studentId;
      break;
    }

    case 'VolunteeringParticipation': {
      // User-scoped: student's volunteering records
      const partParts: string[] = [];
      if (row.activityName) partParts.push(`Activity: ${row.activityName}`);
      if (row.organizationName) partParts.push(`Organization: ${row.organizationName}`);
      if (row.totalHours) partParts.push(`Hours: ${row.totalHours}`);
      content = partParts.join('\n');
      ownerId = row.studentId;
      break;
    }

    default:
      console.warn(`[buildEmbeddableContent] Unsupported model: ${modelName}`);
      return null;
  }

  // Skip if no content
  if (!content || content.trim().length === 0) {
    return null;
  }

  // Strip PII
  const sanitized = stripPII(content);

  return {
    content: sanitized,
    ownerId,
  };
}

/**
 * Get list of models that support embedding
 */
export function getSupportedModels(): string[] {
  return [
    'AlumniApplication',
    'ExtractedEssay',
    'ExtractedActivity',
    'ExtractedAward',
    'AdmissionResult',
    'Organization',
    'VolunteeringOpportunity',
    'Activity',
    'VolunteeringParticipation',
  ];
}

/**
 * Check if a model is supported for embedding
 */
export function isModelSupported(modelName: string): boolean {
  return getSupportedModels().includes(modelName);
}
