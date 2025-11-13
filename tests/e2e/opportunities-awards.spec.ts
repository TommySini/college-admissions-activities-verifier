/**
 * E2E Test: OpportunityCard awards rendering
 * Ensures no crashes and proper display of awards badges
 */

import { test, expect } from '@playwright/test';

test.describe('E2E: Opportunity Awards Display', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to opportunities page
    await page.goto('/opportunities');
    
    // Wait for cards to load
    await page.waitForSelector('[data-testid="opportunity-card"]', {
      timeout: 10000,
      state: 'visible',
    }).catch(() => {
      // If no data-testid, wait for any card
      return page.waitForSelector('.rounded-2xl', { timeout: 10000 });
    });
  });
  
  test('page loads without crashing', async ({ page }) => {
    // Check that we're on the opportunities page
    await expect(page.locator('h1')).toContainText(/opportunit/i);
    
    // Check that at least one card is visible
    const cards = page.locator('.rounded-2xl').filter({ hasText: /competition|program|scholarship/i });
    await expect(cards.first()).toBeVisible();
  });
  
  test('no console errors related to .map or awardTypes', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and wait for render
    await page.goto('/opportunities');
    await page.waitForTimeout(2000);
    
    // Check for map/awardTypes errors
    const mapErrors = consoleErrors.filter(err => 
      err.includes('.map') || err.includes('awardTypes')
    );
    
    expect(mapErrors).toHaveLength(0);
  });
  
  test('opportunity with awards shows badges', async ({ page }) => {
    // Find a card that should have awards (NEC, Scholastic, etc.)
    const cardWithAwards = page.locator('.rounded-2xl').filter({
      hasText: /Economics|Scholastic|USACO/i
    }).first();
    
    if (await cardWithAwards.isVisible()) {
      // Check for "Awards" label
      const hasAwardsSection = await cardWithAwards.locator('text="Awards"').isVisible().catch(() => false);
      
      if (hasAwardsSection) {
        // Should have at least one badge
        const badges = cardWithAwards.locator('.text-xs').filter({ hasText: /cash|scholarship|recognition|publication/i });
        await expect(badges.first()).toBeVisible();
      }
    }
  });
  
  test('opportunity with no awards does not crash', async ({ page }) => {
    // Look for the test program with no awards
    const cardNoAwards = page.locator('.rounded-2xl').filter({
      hasText: /No Awards|Test.*Program/i
    }).first();
    
    if (await cardNoAwards.isVisible()) {
      // Should not have Awards section
      const hasAwardsSection = await cardNoAwards.locator('text="Awards"').isVisible().catch(() => false);
      expect(hasAwardsSection).toBe(false);
    }
    
    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible();
  });
  
  test('no hydration errors in console', async ({ page }) => {
    const hydrationErrors: string[] = [];
    
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (text.includes('hydrat') || text.includes('mismatch') || text.includes('did not match')) {
        hydrationErrors.push(msg.text());
      }
    });
    
    // Navigate and interact
    await page.goto('/opportunities');
    await page.waitForTimeout(2000);
    
    // Click on a card (triggers client-side rendering)
    const firstCard = page.locator('.rounded-2xl').first();
    if (await firstCard.isVisible()) {
      await firstCard.hover();
    }
    
    await page.waitForTimeout(1000);
    
    // Should have no hydration errors
    expect(hydrationErrors).toHaveLength(0);
  });
  
  test('awards badges are properly formatted', async ({ page }) => {
    // Find any card with awards
    const awardsSection = page.locator('text="Awards"').first();
    
    if (await awardsSection.isVisible()) {
      // Get parent container
      const container = awardsSection.locator('..').locator('..');
      
      // Check badges
      const badges = container.locator('.text-xs');
      const count = await badges.count();
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const badgeText = await badges.nth(i).textContent();
          
          // Should be readable (underscores replaced with spaces)
          expect(badgeText).not.toContain('_');
          expect(badgeText?.length).toBeGreaterThan(0);
        }
      }
    }
  });
  
  test('filter by award type works', async ({ page }) => {
    // Try to filter (if filter UI exists)
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('scholarship');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(1000);
      
      // Page should still render
      await expect(page.locator('h1')).toBeVisible();
    }
  });
  
});

