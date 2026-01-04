/**
 * Test: awardTypes normalization in API
 * Ensures all editions return awardTypes as string[] regardless of DB storage
 */

import { test, expect } from '@playwright/test';

test.describe('API: awardTypes normalization', () => {
  test('GET /api/opportunities returns awardTypes as string[]', async ({ request }) => {
    const response = await request.get('/api/opportunities');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.editions).toBeDefined();
    expect(Array.isArray(data.editions)).toBeTruthy();

    // Check every edition
    for (const edition of data.editions) {
      // awardTypes must be an array
      expect(Array.isArray(edition.awardTypes)).toBeTruthy();

      // Every item must be a string
      edition.awardTypes.forEach((award: any) => {
        expect(typeof award).toBe('string');
      });
    }
  });

  test('editions with empty awards have awardTypes: []', async ({ request }) => {
    const response = await request.get('/api/opportunities');
    const data = await response.json();

    // Find the test opportunity with no awards
    const emptyAwardEdition = data.editions.find((ed: any) =>
      ed.opportunity?.name?.includes('No Awards')
    );

    if (emptyAwardEdition) {
      expect(emptyAwardEdition.awardTypes).toEqual([]);
    }
  });

  test('editions with awards have non-empty string arrays', async ({ request }) => {
    const response = await request.get('/api/opportunities');
    const data = await response.json();

    // Find editions with awards
    const editionsWithAwards = data.editions.filter(
      (ed: any) => ed.awardTypes && ed.awardTypes.length > 0
    );

    expect(editionsWithAwards.length).toBeGreaterThan(0);

    editionsWithAwards.forEach((edition: any) => {
      expect(Array.isArray(edition.awardTypes)).toBeTruthy();
      expect(edition.awardTypes.length).toBeGreaterThan(0);

      edition.awardTypes.forEach((award: string) => {
        expect(typeof award).toBe('string');
        expect(award.length).toBeGreaterThan(0);
      });
    });
  });

  test('GET /api/editions/[id] normalizes awardTypes', async ({ request }) => {
    // First, get an edition ID
    const listResponse = await request.get('/api/opportunities');
    const listData = await listResponse.json();

    if (listData.editions && listData.editions.length > 0) {
      const editionId = listData.editions[0].id;

      // Fetch single edition
      const response = await request.get(`/api/editions/${editionId}`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.edition).toBeDefined();
      expect(Array.isArray(data.edition.awardTypes)).toBeTruthy();
    }
  });

  test('GET /api/opportunities/[slug] normalizes currentEdition', async ({ request }) => {
    // Get a slug first
    const listResponse = await request.get('/api/opportunities');
    const listData = await listResponse.json();

    if (listData.editions && listData.editions.length > 0) {
      const slug = listData.editions[0].opportunity.slug;

      // Fetch by slug
      const response = await request.get(`/api/opportunities/${slug}`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();

      if (data.currentEdition) {
        expect(Array.isArray(data.currentEdition.awardTypes)).toBeTruthy();
      }
    }
  });
});
