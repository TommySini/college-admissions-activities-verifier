/**
 * Slugify utility - consistent slug generation for opportunities
 * Used in both seeding and routing to ensure slugs match
 */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

