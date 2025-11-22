const ADVISORY_REQUEST_PREFIX = "advisory_request_";
const ADVISORY_STUDENTS_PREFIX = "advisory_students_";
const ADVISORY_GROUPS_PREFIX = "advisory_groups_";
export const DEFAULT_ADVISORY_NAME = "My Advisory";

export function buildAdvisoryRequestKey(advisorId: string, email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  return `${ADVISORY_REQUEST_PREFIX}${advisorId}_${normalizedEmail}`;
}

export function parseAdvisoryRequestKey(key: string) {
  if (!key.startsWith(ADVISORY_REQUEST_PREFIX)) {
    return null;
  }

  const remainder = key.replace(ADVISORY_REQUEST_PREFIX, "");
  const [advisorId, ...emailParts] = remainder.split("_");
  if (!advisorId || emailParts.length === 0) {
    return null;
  }

  return {
    advisorId,
    studentEmail: emailParts.join("_"),
  };
}

export function advisoryStudentsKey(advisorId: string) {
  return `${ADVISORY_STUDENTS_PREFIX}${advisorId}`;
}

export function advisoryGroupsKey(advisorId: string) {
  return `${ADVISORY_GROUPS_PREFIX}${advisorId}`;
}

export { ADVISORY_REQUEST_PREFIX, ADVISORY_STUDENTS_PREFIX, ADVISORY_GROUPS_PREFIX };

