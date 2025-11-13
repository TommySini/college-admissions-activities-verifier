import { z } from "zod";

// Filter schema for opportunities
export const OpportunitiesFilterSchema = z.object({
  // Type filters
  type: z.string().optional(),
  modality: z.string().optional(),
  structure: z.string().optional(),
  
  // Team size
  teamMin: z.coerce.number().int().min(1).optional(),
  teamMax: z.coerce.number().int().min(1).optional(),
  
  // Domain
  domain: z.string().optional(),
  
  // Eligibility
  gradeMin: z.coerce.number().int().min(6).max(12).optional(),
  gradeMax: z.coerce.number().int().min(6).max(12).optional(),
  
  // Dates
  appOpensStart: z.string().optional(),
  appOpensEnd: z.string().optional(),
  regBefore: z.string().optional(),
  eventStart: z.string().optional(),
  eventEnd: z.string().optional(),
  rolling: z.enum(["true", "false"]).optional(),
  
  // Status
  status: z.string().optional(),
  
  // Geography
  geo: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  travel: z.enum(["req", "opt", "no"]).optional(),
  tz: z.string().optional(),
  
  // Awards
  award: z.string().optional(),
  alumniNotable: z.enum(["true", "false"]).optional(),
  
  // Social proof
  doneAtMySchool: z.enum(["true", "false"]).optional(),
  popular: z.enum(["true", "false"]).optional(),
  trending: z.enum(["true", "false"]).optional(),
  
  // Duration
  durationMinDays: z.coerce.number().int().min(0).optional(),
  durationMaxDays: z.coerce.number().int().min(0).optional(),
  
  // Cost
  free: z.enum(["true", "false"]).optional(),
  
  // Sorting & pagination
  sort: z.enum([
    "relevance",
    "deadlineSoon",
    "newest",
    "awardHigh",
    "costLow",
    "difficultyAsc",
    "popularityDesc",
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  
  // Search
  q: z.string().optional(),
});

export type OpportunitiesFilter = z.infer<typeof OpportunitiesFilterSchema>;

/**
 * Parse filter params from URL search params
 */
export function parseFilters(searchParams: URLSearchParams): OpportunitiesFilter {
  const params = Object.fromEntries(searchParams.entries());
  return OpportunitiesFilterSchema.parse(params);
}

/**
 * Convert filters to URL search params
 */
export function filtersToSearchParams(filters: Partial<OpportunitiesFilter>): URLSearchParams {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  
  return params;
}

/**
 * Build Prisma where clause from filters
 */
export function buildWhereClause(filters: OpportunitiesFilter, userId?: string, schoolId?: string) {
  const where: any = {};
  const editionWhere: any = {};
  
  // Type filters (multi-select, comma-separated)
  if (filters.type) {
    editionWhere.opportunity = {
      type: { in: filters.type.split(",") },
    };
  }
  
  if (filters.modality) {
    editionWhere.opportunity = {
      ...editionWhere.opportunity,
      modality: { in: filters.modality.split(",") },
    };
  }
  
  if (filters.structure) {
    editionWhere.opportunity = {
      ...editionWhere.opportunity,
      structure: { in: filters.structure.split(",") },
    };
  }
  
  // Team size
  if (filters.teamMin !== undefined || filters.teamMax !== undefined) {
    editionWhere.opportunity = {
      ...editionWhere.opportunity,
      ...(filters.teamMin && { teamMin: { gte: filters.teamMin } }),
      ...(filters.teamMax && { teamMax: { lte: filters.teamMax } }),
    };
  }
  
  // Domain filter
  if (filters.domain) {
    const domains = filters.domain.split(",");
    editionWhere.opportunity = {
      ...editionWhere.opportunity,
      domains: {
        some: {
          domain: {
            slug: { in: domains },
          },
        },
      },
    };
  }
  
  // Grade eligibility
  if (filters.gradeMin !== undefined || filters.gradeMax !== undefined) {
    if (filters.gradeMin) {
      editionWhere.gradeMin = { lte: filters.gradeMin };
    }
    if (filters.gradeMax) {
      editionWhere.gradeMax = { gte: filters.gradeMax };
    }
  }
  
  // Date filters
  if (filters.appOpensStart || filters.appOpensEnd) {
    editionWhere.applicationOpens = {
      ...(filters.appOpensStart && { gte: new Date(filters.appOpensStart) }),
      ...(filters.appOpensEnd && { lte: new Date(filters.appOpensEnd) }),
    };
  }
  
  if (filters.regBefore) {
    editionWhere.registrationDeadline = { lte: new Date(filters.regBefore) };
  }
  
  if (filters.eventStart || filters.eventEnd) {
    editionWhere.eventStart = {
      ...(filters.eventStart && { gte: new Date(filters.eventStart) }),
      ...(filters.eventEnd && { lte: new Date(filters.eventEnd) }),
    };
  }
  
  if (filters.rolling === "true") {
    editionWhere.rollingDeadlines = true;
  }
  
  // Status filter
  if (filters.status) {
    editionWhere.status = { in: filters.status.split(",") };
  }
  
  // Geography
  if (filters.geo) {
    editionWhere.opportunity = {
      ...editionWhere.opportunity,
      geography: { in: filters.geo.split(",") },
    };
  }
  
  if (filters.country || filters.state || filters.city) {
    editionWhere.opportunity = {
      ...editionWhere.opportunity,
      location: {
        ...(filters.country && { country: filters.country }),
        ...(filters.state && { state: filters.state }),
        ...(filters.city && { city: filters.city }),
      },
    };
  }
  
  // Alumni notable
  if (filters.alumniNotable === "true") {
    editionWhere.alumniOutcomesNotable = true;
  }
  
  // Social proof
  if (filters.doneAtMySchool === "true" && schoolId) {
    editionWhere.participations = {
      some: {
        schoolId: schoolId,
      },
    };
  }
  
  if (filters.popular === "true") {
    editionWhere.popularityScore = { gte: 50 };
  }
  
  if (filters.trending === "true") {
    editionWhere.clicks30d = { gte: 100 };
  }
  
  // Duration filter (derive from event dates)
  if (filters.durationMinDays !== undefined || filters.durationMaxDays !== undefined) {
    // This is complex - would need to calculate duration in SQL
    // For now, we'll filter in memory after fetching
  }
  
  // Cost filter
  if (filters.free === "true") {
    editionWhere.OR = [
      { registrationFee: null },
      { registrationFee: 0 },
    ];
  }
  
  return { editionWhere };
}

/**
 * Build order by clause from sort parameter
 */
export function buildOrderBy(sort?: string) {
  switch (sort) {
    case "deadlineSoon":
      return { registrationDeadline: "asc" as const };
    case "newest":
      return { createdAt: "desc" as const };
    case "popularityDesc":
      return { popularityScore: "desc" as const };
    case "costLow":
      return { registrationFee: "asc" as const };
    default:
      return { popularityScore: "desc" as const };
  }
}

