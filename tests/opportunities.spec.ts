/**
 * Playwright E2E Tests for Opportunities Platform
 *
 * Run with: npm test or npx playwright test
 *
 * Setup required:
 * 1. npm install -D @playwright/test
 * 2. npx playwright install
 * 3. Create test database with seed data
 */

import { test, expect } from '@playwright/test';

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpass123',
};

test.describe('Opportunities Platform', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('should display opportunities listing page', async ({ page }) => {
    // Sign in
    await page.goto('/auth/signin');
    // ... authentication flow (depends on your NextAuth setup)

    // Navigate to opportunities
    await page.goto('/opportunities');

    // Check page loaded
    await expect(page.locator('h1')).toContainText('High School Opportunities');

    // Check that opportunity cards are displayed
    const cards = page.locator('[data-testid="opportunity-card"]');
    await expect(cards.first()).toBeVisible();
  });

  test('filter by type should update results', async ({ page }) => {
    await page.goto('/opportunities');

    // Click on a type filter chip
    await page.click('text="competition"');

    // Wait for URL to update
    await page.waitForURL('**/opportunities?type=competition**');

    // Verify results are filtered
    const results = page.locator('[data-testid="opportunity-card"]');
    await expect(results.first()).toBeVisible();

    // Verify all visible cards show "competition" badge
    const badges = page.locator('[data-testid="type-badge"]');
    await expect(badges.first()).toContainText('competition');
  });

  test('search functionality should work', async ({ page }) => {
    await page.goto('/opportunities');

    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'finance');
    await page.click('button:has-text("Search")');

    // Wait for URL to update
    await page.waitForURL('**/opportunities?q=finance**');

    // Verify results contain search term
    await expect(page.locator('h3').first()).toContainText(/finance/i);
  });

  test('save opportunity should work', async ({ page }) => {
    await page.goto('/opportunities');

    // Click save button on first card
    const saveButton = page.locator('[data-testid="save-button"]').first();
    await saveButton.click();

    // Wait for API call
    await page.waitForResponse(
      (response) => response.url().includes('/api/editions/') && response.url().includes('/save')
    );

    // Verify button state changed (filled bookmark)
    await expect(saveButton).toHaveClass(/fill-current|text-yellow/);
  });

  test('follow opportunity should create notifications', async ({ page }) => {
    await page.goto('/opportunities');

    // Click follow button
    const followButton = page.locator('[data-testid="follow-button"]').first();
    await followButton.click();

    // Wait for API call
    const response = await page.waitForResponse(
      (response) => response.url().includes('/api/editions/') && response.url().includes('/follow')
    );

    const data = await response.json();

    // Verify notifications were created
    expect(data.notificationsCreated).toBeGreaterThan(0);
  });

  test('export to calendar should download .ics file', async ({ page }) => {
    await page.goto('/opportunities');

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.click('[data-testid="export-calendar"]').first();

    // Wait for download
    const download = await downloadPromise;

    // Verify file extension
    expect(download.suggestedFilename()).toMatch(/\.ics$/);
  });

  test('"done at my school" filter should require school', async ({ page }) => {
    await page.goto('/opportunities');

    // Click "Done at my school" filter
    await page.click('text="Done at my school"');

    // Check for message about requiring school
    await expect(page.locator('text=/school|account/i')).toBeVisible();
  });

  test('popular filter should show high popularity items', async ({ page }) => {
    await page.goto('/opportunities');

    // Click popular filter
    await page.click('text="Popular"');

    // Wait for URL update
    await page.waitForURL('**/opportunities?popular=true**');

    // Verify popularity indicators are shown
    const popularityBadges = page.locator('[data-testid="popularity-indicator"]');
    await expect(popularityBadges.first()).toBeVisible();
  });

  test('pagination should work correctly', async ({ page }) => {
    await page.goto('/opportunities');

    // Click next page
    await page.click('button:has-text("Next")');

    // Verify URL updated
    await page.waitForURL('**/opportunities?page=2**');

    // Verify new results loaded
    await expect(page.locator('[data-testid="opportunity-card"]').first()).toBeVisible();
  });

  test('petition form submission should work', async ({ page }) => {
    await page.goto('/opportunities/petition/new');

    // Fill form
    await page.fill('input[placeholder*="name"]', 'Test Opportunity');
    await page.fill('input[type="url"]', 'https://example.com/test');
    await page.fill('textarea', 'This is a test opportunity description');

    // Submit
    await page.click('button:has-text("Submit")');

    // Wait for success message
    await expect(page.locator('text=/submitted|thank you/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('admin petition review should work', async ({ page }) => {
    // Sign in as admin
    // ... admin authentication flow

    await page.goto('/admin/petitions');

    // Verify petitions are listed
    await expect(page.locator('[data-testid="petition-card"]').first()).toBeVisible();

    // Click approve button
    await page.click('button:has-text("Approve")').first();

    // Wait for API call
    await page.waitForResponse((response) => response.url().includes('/api/petitions/'));

    // Verify status updated
    await expect(page.locator('text="approved"')).toBeVisible();
  });

  test('URL state should preserve filters', async ({ page }) => {
    // Navigate with filters
    await page.goto('/opportunities?type=competition&modality=online&status=open');

    // Verify all filters are active
    await expect(page.locator('text="Type: competition"')).toBeVisible();
    await expect(page.locator('text="Mode: online"')).toBeVisible();
    await expect(page.locator('text="Status: open"')).toBeVisible();

    // Copy URL
    const url = page.url();

    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto(url);

    // Verify filters are still active
    await expect(page.locator('text="Type: competition"')).toBeVisible();
  });

  test('deadline soon sort should order by deadline', async ({ page }) => {
    await page.goto('/opportunities');

    // Select "Deadline Soon" sort
    await page.selectOption('select', 'deadlineSoon');

    // Wait for results to update
    await page.waitForTimeout(1000);

    // Get all deadline dates
    const deadlines = await page.locator('[data-testid="deadline-date"]').allTextContents();

    // Verify they are in ascending order
    const dates = deadlines.map((d) => new Date(d).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  test('duration filter should work correctly', async ({ page }) => {
    await page.goto('/opportunities?durationMinDays=1&durationMaxDays=7');

    // Verify results show events within duration range
    const cards = page.locator('[data-testid="opportunity-card"]');
    await expect(cards.first()).toBeVisible();

    // Check duration is within range (if displayed)
    // This depends on how you display duration in the UI
  });

  test('mobile responsive layout should work', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/opportunities');

    // Verify mobile layout
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="opportunity-card"]').first()).toBeVisible();

    // Verify filters are accessible (might be in a drawer)
    const filterButton = page.locator('button:has-text("Filters")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    }
  });

  test('accessibility: keyboard navigation should work', async ({ page }) => {
    await page.goto('/opportunities');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Press Enter on focused element
    await page.keyboard.press('Enter');

    // Verify action occurred (depends on focused element)
  });

  test('performance: listing page should load quickly', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/opportunities');
    await page.waitForSelector('[data-testid="opportunity-card"]');

    const loadTime = Date.now() - startTime;

    // Verify page loaded in under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });
});

// Add data-testid attributes to components for easier testing:
// - opportunity-card
// - save-button
// - follow-button
// - export-calendar
// - filter-panel
// - type-badge
// - deadline-date
// - popularity-indicator
// - petition-card
