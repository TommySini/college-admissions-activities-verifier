import { prisma } from '@/lib/prisma';
import { User } from '@prisma/client';
import {
  getPrivacyConstraints,
  mergeWhereClause,
  getValidatedLimit,
  isSafeOrderByField,
  sanitizeFieldSelection,
  applyAlumniPrivacy,
} from './privacy';
import { describeModel } from './runtimeModels';

type WhereClause = Record<string, unknown>;
type OrderByClause = Record<string, 'asc' | 'desc'>;
type PrismaModelLike = {
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  count?: (args: { where?: WhereClause }) => Promise<number>;
};
type PrismaClientLike = Record<string, PrismaModelLike | undefined>;

export interface QueryParams {
  model: string;
  where?: WhereClause;
  select?: string[];
  limit?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

export interface QueryResult {
  success: boolean;
  data?: Record<string, unknown>[];
  count?: number;
  error?: string;
}

/**
 * Execute a generic, privacy-safe query against any Prisma model
 */
export async function executeGenericQuery(params: QueryParams, user: User): Promise<QueryResult> {
  try {
    const { model, where, select, limit, orderBy } = params;

    // Validate model exists
    const modelDescription = describeModel(model);
    if (!modelDescription) {
      return {
        success: false,
        error: `Model '${model}' not found`,
      };
    }

    // Get privacy constraints for this user and model
    const privacy = getPrivacyConstraints({ user, modelName: model });
    if (!privacy.allowed) {
      return {
        success: false,
        error: privacy.errorMessage || 'Access denied',
      };
    }

    // Merge user WHERE clause with privacy constraints
    const finalWhere = mergeWhereClause(where, privacy.whereClause);

    // Sanitize field selection
    const finalSelect = sanitizeFieldSelection(model, select, user.role);

    // Validate and cap limit
    const finalLimit = getValidatedLimit(limit);

    // Build orderBy clause
    let finalOrderBy: OrderByClause | undefined;
    if (orderBy && isSafeOrderByField(orderBy.field)) {
      finalOrderBy = { [orderBy.field]: orderBy.direction || 'desc' };
    } else {
      // Default ordering by createdAt or id
      finalOrderBy = modelDescription.fields.find((f) => f.name === 'createdAt')
        ? { createdAt: 'desc' }
        : { id: 'desc' };
    }

    // Execute the query
    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
    const prismaModel = (prisma as PrismaClientLike)[modelKey];

    if (!prismaModel) {
      return {
        success: false,
        error: `Prisma model '${model}' not accessible`,
      };
    }

    const queryOptions: Record<string, unknown> = {
      where: finalWhere,
      take: finalLimit,
      orderBy: finalOrderBy,
    };

    // Add select if specified
    if (finalSelect && finalSelect.length > 0) {
      queryOptions.select = finalSelect.reduce<Record<string, boolean>>((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
    }

    let results = await prismaModel.findMany(queryOptions);

    // Apply additional privacy filtering (e.g., alumni privacy)
    results = applyAlumniPrivacy(results, model) as Record<string, unknown>[];

    return {
      success: true,
      data: results,
      count: results.length,
    };
  } catch (error) {
    console.error('Error executing generic query:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Query execution failed',
    };
  }
}

/**
 * Build a WHERE clause from natural language filters
 * Supports: equals, contains, gt, lt, gte, lte
 */
export function buildWhereClause(filters: Record<string, unknown>): WhereClause {
  const where: WhereClause = {};

  for (const [field, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      continue;
    }

    // Handle different filter types
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Complex filter like { contains: "text" } or { gt: 100 }
      where[field] = value;
    } else if (Array.isArray(value)) {
      // Array means "in" query
      where[field] = { in: value };
    } else {
      // Simple equality
      where[field] = value;
    }
  }

  return where;
}

/**
 * Parse a simple search query into WHERE clause
 * Example: "name contains Finance" -> { name: { contains: "Finance" } }
 */
export function parseSearchQuery(searchText: string, model: string): WhereClause {
  const modelDesc = describeModel(model);
  if (!modelDesc) return {};

  // Get searchable text fields
  const textFields = modelDesc.fields
    .filter((f) => f.type === 'String' && !f.isRelation)
    .map((f) => f.name);

  if (textFields.length === 0) return {};

  // Simple OR search across all text fields
  const searchLower = searchText.toLowerCase();

  // For SQLite compatibility, we'll do case-insensitive search in the query
  // by using multiple OR conditions
  return {
    OR: textFields.map((field) => ({
      [field]: { contains: searchText },
    })),
  };
}

/**
 * Validate filter operators to prevent injection
 */
export function validateFilterOperator(operator: string): boolean {
  const allowedOperators = [
    'equals',
    'contains',
    'startsWith',
    'endsWith',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'notIn',
  ];

  return allowedOperators.includes(operator);
}

/**
 * Count records matching a query (for pagination)
 */
export async function countRecords(model: string, where: WhereClause, user: User): Promise<number> {
  try {
    // Get privacy constraints
    const privacy = getPrivacyConstraints({ user, modelName: model });
    if (!privacy.allowed) {
      return 0;
    }

    // Merge WHERE clauses
    const finalWhere = mergeWhereClause(where, privacy.whereClause);

    // Execute count
    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
    const prismaModel = (prisma as PrismaClientLike)[modelKey];
    if (!prismaModel) {
      return 0;
    }

    const count = await prismaModel.count?.({ where: finalWhere });
    if (typeof count !== 'number') {
      return 0;
    }

    return count;
  } catch (error) {
    console.error('Error counting records:', error);
    return 0;
  }
}
