// Curated list of top colleges for rank bucketing
export const TOP_5_COLLEGES = [
  'Harvard University',
  'Stanford University',
  'Massachusetts Institute of Technology',
  'MIT',
  'Yale University',
  'Princeton University',
];

export const TOP_10_COLLEGES = [
  ...TOP_5_COLLEGES,
  'University of Pennsylvania',
  'California Institute of Technology',
  'Caltech',
  'Columbia University',
  'University of Chicago',
  'Duke University',
  'Northwestern University',
];

/**
 * Determine rank bucket for a college
 */
export function getRankBucket(collegeName: string): 'top5' | 'top10' | 'other' {
  const normalized = collegeName.trim();

  // Check Top 5
  if (
    TOP_5_COLLEGES.some(
      (college) =>
        normalized.toLowerCase().includes(college.toLowerCase()) ||
        college.toLowerCase().includes(normalized.toLowerCase())
    )
  ) {
    return 'top5';
  }

  // Check Top 10
  if (
    TOP_10_COLLEGES.some(
      (college) =>
        normalized.toLowerCase().includes(college.toLowerCase()) ||
        college.toLowerCase().includes(normalized.toLowerCase())
    )
  ) {
    return 'top10';
  }

  return 'other';
}
