import { User, AlumniPrivacy } from '@prisma/client';
import {
  getUserScopeField,
  isUserScopedModel,
  canStudentAccessModel,
  describeModel,
} from './runtimeModels';

export interface QueryContext {
  user: User;
  modelName: string;
}

export interface PrivacyConstraints {
  allowed: boolean;
  whereClause?: any;
  selectRestrictions?: string[];
  errorMessage?: string;
}

/**
 * Determine if a user can access a model and what constraints apply
 */
export function getPrivacyConstraints(context: QueryContext): PrivacyConstraints {
  const { user, modelName } = context;

  // Admins have full access to everything
  if (user.role === 'admin') {
    return { allowed: true };
  }

  // Students can only access certain models
  if (!canStudentAccessModel(modelName)) {
    return {
      allowed: false,
      errorMessage: `Students cannot access ${modelName} data`,
    };
  }

  // For user-scoped models, add WHERE clause to filter by user ID
  if (isUserScopedModel(modelName)) {
    const scopeField = getUserScopeField(modelName);
    if (scopeField) {
      return {
        allowed: true,
        whereClause: { [scopeField]: user.id },
      };
    }
  }

  // Special handling for specific models
  switch (modelName) {
    case 'Organization':
      // Students can only see approved organizations
      return {
        allowed: true,
        whereClause: { status: 'APPROVED' },
      };

    case 'VolunteeringOpportunity':
      // Students can only see approved opportunities
      return {
        allowed: true,
        whereClause: { status: 'approved' },
      };

    case 'AlumniProfile':
    case 'AlumniApplication':
    case 'ExtractedActivity':
    case 'ExtractedEssay':
    case 'ExtractedAward':
    case 'AdmissionResult':
      // Alumni data accessible with privacy filtering
      return getAlumniPrivacyConstraints(modelName);

    case 'User':
      // Students cannot access other users' data
      return {
        allowed: false,
        errorMessage: "Students cannot access other users' data",
      };

    default:
      // Allow access to other platform-wide data
      return { allowed: true };
  }
}

/**
 * Get privacy constraints for alumni-related models
 */
function getAlumniPrivacyConstraints(modelName: string): PrivacyConstraints {
  // For now, allow access to alumni data
  // In production, you'd filter based on AlumniPrivacy settings

  if (modelName === 'AlumniProfile') {
    // Exclude ANONYMOUS profiles from direct queries
    // Students can see FULL and PSEUDONYM profiles
    return {
      allowed: true,
      whereClause: {
        privacy: {
          in: ['FULL', 'PSEUDONYM'],
        },
      },
      selectRestrictions: [], // We'll handle field-level filtering in applyAlumniPrivacy
    };
  }

  // For related models (applications, activities, etc.), allow access
  // but we'll filter sensitive fields based on the parent profile's privacy
  return { allowed: true };
}

/**
 * Apply alumni privacy filtering to result rows
 */
export function applyAlumniPrivacy(rows: any[], modelName: string): any[] {
  if (modelName !== 'AlumniProfile') {
    return rows;
  }

  return rows
    .map((row) => {
      const privacy = row.privacy as AlumniPrivacy;

      if (privacy === 'ANONYMOUS') {
        // Should not happen due to WHERE clause, but handle it
        return null;
      }

      if (privacy === 'PSEUDONYM') {
        // Hide direct identifiers
        return {
          ...row,
          displayName: row.displayName || 'Anonymous Alumni',
          contactEmail: null,
          // Keep other fields like intendedMajor, careerInterestTags
        };
      }

      // FULL privacy - return all fields
      return row;
    })
    .filter(Boolean);
}

/**
 * Field aliases: common synonyms to actual field names
 */
const FIELD_ALIASES: Record<string, Record<string, string>> = {
  Activity: {
    start_date: 'startDate',
    end_date: 'endDate',
    hours_per_week: 'hoursPerWeek',
    total_hours: 'totalHours',
  },
  AlumniProfile: {
    name: 'displayName',
    major: 'intendedMajor',
    graduation_year: 'graduationYear', // Note: this field doesn't exist, will be filtered
    tags: 'careerInterestTags',
  },
  VolunteeringParticipation: {
    hours: 'totalHours',
    activity: 'activityName',
    organization: 'organizationName',
  },
  VolunteeringOpportunity: {
    hours: 'totalHours',
    hours_per_session: 'hoursPerSession',
  },
};

/**
 * Default safe fields per model (used when all requested fields are invalid)
 */
const DEFAULT_FIELDS: Record<string, string[]> = {
  Activity: ['id', 'name', 'description', 'category', 'startDate', 'endDate'],
  AlumniProfile: ['id', 'displayName', 'intendedMajor', 'privacy'],
  Organization: ['id', 'name', 'description', 'category'],
  VolunteeringOpportunity: ['id', 'title', 'description', 'organization'],
  VolunteeringParticipation: ['id', 'activityName', 'organizationName', 'totalHours'],
  ExtractedActivity: ['id', 'title', 'description', 'organization'],
  ExtractedEssay: ['id', 'topic', 'summary'],
  AdmissionResult: ['id', 'collegeName', 'decision'],
};

/**
 * Sanitize field selections to prevent access to sensitive data and validate against schema
 */
export function sanitizeFieldSelection(
  modelName: string,
  requestedFields: string[] | undefined,
  userRole: string
): string[] | undefined {
  // If no specific fields requested, let Prisma return defaults
  if (!requestedFields || requestedFields.length === 0) {
    return undefined;
  }

  // Apply field aliases
  const aliases = FIELD_ALIASES[modelName] || {};
  let fields = requestedFields.map((field) => aliases[field] || field);

  // Block sensitive fields
  const blockedFields = ['password', 'secret', 'token', 'hash', 'apiKey'];
  fields = fields.filter(
    (field) => !blockedFields.some((blocked) => field.toLowerCase().includes(blocked))
  );

  // For admins, return after blocking sensitive fields
  if (userRole === 'admin') {
    return fields.length > 0 ? fields : undefined;
  }

  const modelDesc = describeModel(modelName);

  if (modelDesc) {
    const validFieldNames = modelDesc.fields
      .filter((f: any) => !f.isRelation) // Exclude relations for now
      .map((f: any) => f.name);

    // Filter to only valid fields
    const validFields = fields.filter((field) => validFieldNames.includes(field));

    // Log dropped fields for debugging
    const droppedFields = fields.filter((field) => !validFieldNames.includes(field));
    if (droppedFields.length > 0) {
      console.log(
        `[sanitizeFieldSelection] Dropped invalid fields for ${modelName}:`,
        droppedFields
      );
    }

    // If all fields were invalid, use defaults
    if (validFields.length === 0) {
      const defaults = DEFAULT_FIELDS[modelName];
      if (defaults) {
        console.log(`[sanitizeFieldSelection] Using default fields for ${modelName}:`, defaults);
        return defaults;
      }
    }

    return validFields.length > 0 ? validFields : undefined;
  }

  // Fallback: return sanitized fields if model description unavailable
  return fields.length > 0 ? fields : undefined;
}

/**
 * Merge user-provided WHERE clause with privacy constraints
 */
export function mergeWhereClause(userWhere: any, privacyWhere: any): any {
  if (!privacyWhere) {
    return userWhere || {};
  }

  if (!userWhere) {
    return privacyWhere;
  }

  // Merge both clauses with AND logic
  return {
    AND: [userWhere, privacyWhere],
  };
}

/**
 * Validate and cap query limits
 */
export function getValidatedLimit(requestedLimit?: number): number {
  const MAX_LIMIT = 50;
  const DEFAULT_LIMIT = 20;

  if (!requestedLimit || requestedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(requestedLimit, MAX_LIMIT);
}

/**
 * Check if a field is safe to order by
 */
export function isSafeOrderByField(field: string): boolean {
  // Allow common safe fields
  const safeFields = [
    'id',
    'createdAt',
    'updatedAt',
    'name',
    'title',
    'startDate',
    'endDate',
    'status',
    'totalHours',
    'targetHours',
  ];

  return safeFields.includes(field);
}
