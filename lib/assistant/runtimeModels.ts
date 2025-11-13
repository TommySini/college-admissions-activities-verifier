import { Prisma } from "@prisma/client";

// Cache for model descriptions
const modelDescriptionCache = new Map<string, ModelDescription>();

export interface FieldDescription {
  name: string;
  type: string;
  isList: boolean;
  isRequired: boolean;
  isRelation: boolean;
  relationTo?: string;
  isId: boolean;
  isUnique: boolean;
}

export interface ModelDescription {
  name: string;
  tableName: string;
  fields: FieldDescription[];
  relations: string[];
  description: string;
}

/**
 * Get all available Prisma models using DMMF (Data Model Meta Format)
 */
export function listModels(): string[] {
  const dmmf = Prisma.dmmf;
  return dmmf.datamodel.models.map((model) => model.name);
}

/**
 * Get detailed description of a model's schema
 */
export function describeModel(modelName: string): ModelDescription | null {
  // Check cache first
  if (modelDescriptionCache.has(modelName)) {
    return modelDescriptionCache.get(modelName)!;
  }

  const dmmf = Prisma.dmmf;
  const model = dmmf.datamodel.models.find((m) => m.name === modelName);

  if (!model) {
    return null;
  }

  const fields: FieldDescription[] = model.fields.map((field) => ({
    name: field.name,
    type: field.type,
    isList: field.isList,
    isRequired: field.isRequired,
    isRelation: field.kind === "object",
    relationTo: field.kind === "object" ? field.type : undefined,
    isId: field.isId,
    isUnique: field.isUnique,
  }));

  const relations = fields
    .filter((f) => f.isRelation)
    .map((f) => f.relationTo!)
    .filter(Boolean);

  const description: ModelDescription = {
    name: model.name,
    tableName: model.dbName || model.name.toLowerCase(),
    fields,
    relations,
    description: generateModelDescription(model.name, fields),
  };

  // Cache the description
  modelDescriptionCache.set(modelName, description);

  return description;
}

/**
 * Generate a human-readable description of a model
 */
function generateModelDescription(modelName: string, fields: FieldDescription[]): string {
  const nonRelationFields = fields.filter((f) => !f.isRelation);
  const fieldNames = nonRelationFields.slice(0, 5).map((f) => f.name);

  const descriptions: Record<string, string> = {
    User: "Platform users (students and admins)",
    Activity: "Student extracurricular activities",
    Verification: "Activity verification requests and status",
    Organization: "School clubs and organizations",
    VolunteeringOpportunity: "Available volunteering opportunities",
    VolunteeringParticipation: "Student volunteering participation records",
    VolunteeringGoal: "Student volunteering hour goals",
    AlumniProfile: "Alumni user profiles",
    AlumniApplication: "Alumni college application data",
    ExtractedActivity: "Activities from alumni applications",
    ExtractedEssay: "Essays from alumni applications",
    ExtractedAward: "Awards from alumni applications",
    AdmissionResult: "College admission outcomes",
    Settings: "Platform configuration settings",
  };

  const baseDesc = descriptions[modelName] || `${modelName} records`;
  return `${baseDesc}. Key fields: ${fieldNames.join(", ")}`;
}

/**
 * Get models that are safe for students to query
 * (excludes other users' personal data)
 */
export function getStudentAccessibleModels(): string[] {
  return [
    "Organization",
    "VolunteeringOpportunity",
    "AlumniProfile",
    "AlumniApplication",
    "ExtractedActivity",
    "ExtractedEssay",
    "ExtractedAward",
    "AdmissionResult",
  ];
}

/**
 * Get models that contain user-scoped data
 * (students can only see their own records)
 */
export function getUserScopedModels(): string[] {
  return [
    "Activity",
    "Verification",
    "VolunteeringParticipation",
    "VolunteeringGoal",
  ];
}

/**
 * Check if a model requires user scoping for students
 */
export function isUserScopedModel(modelName: string): boolean {
  return getUserScopedModels().includes(modelName);
}

/**
 * Check if a student can access this model
 */
export function canStudentAccessModel(modelName: string): boolean {
  return (
    getStudentAccessibleModels().includes(modelName) ||
    getUserScopedModels().includes(modelName)
  );
}

/**
 * Get the field name used for user scoping (typically studentId or userId)
 */
export function getUserScopeField(modelName: string): string | null {
  const scopeFields: Record<string, string> = {
    Activity: "studentId",
    Verification: "studentId",
    VolunteeringParticipation: "studentId",
    VolunteeringGoal: "studentId",
    AlumniProfile: "userId",
  };

  return scopeFields[modelName] || null;
}

/**
 * Get searchable text fields for a model
 */
export function getSearchableFields(modelName: string): string[] {
  const model = describeModel(modelName);
  if (!model) return [];

  return model.fields
    .filter(
      (f) =>
        !f.isRelation &&
        (f.type === "String") &&
        !f.isId &&
        !["password", "secret", "token", "hash"].some((sensitive) =>
          f.name.toLowerCase().includes(sensitive)
        )
    )
    .map((f) => f.name);
}

/**
 * Clear the model description cache (useful for testing)
 */
export function clearModelCache(): void {
  modelDescriptionCache.clear();
}

