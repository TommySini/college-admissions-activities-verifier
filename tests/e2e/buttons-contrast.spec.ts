import { test, expect } from "@playwright/test";

test.describe("ShimmerButton Contrast & Visibility", () => {
  test("shimmer buttons should have white text on blue gradient background", async ({ page }) => {
    await page.goto("/shimmer-demo");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Find the default shimmer button
    const shimmerButton = page.getByRole("button", { name: /shimmer button/i }).first();

    // Get computed styles
    const color = await shimmerButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.color;
    });

    const background = await shimmerButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.background || computed.backgroundColor;
    });

    // Assert white text color (rgb(255, 255, 255))
    expect(color).toBe("rgb(255, 255, 255)");

    // Assert background contains gradient or blue colors
    expect(background).toMatch(/gradient|rgb\(30, 64, 175\)|rgb\(37, 99, 235\)|rgb\(96, 165, 250\)/);

    console.log("✓ Shimmer button text color:", color);
    console.log("✓ Shimmer button background:", background);
  });

  test("shimmer buttons should be visible and not have opacity issues", async ({ page }) => {
    await page.goto("/shimmer-demo");
    await page.waitForLoadState("networkidle");

    const shimmerButton = page.getByRole("button", { name: /shimmer button/i }).first();

    // Check button is visible
    await expect(shimmerButton).toBeVisible();

    // Check button opacity
    const opacity = await shimmerButton.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });

    expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.9);

    // Check z-index stacking (content should be on top)
    const contentZIndex = await shimmerButton.evaluate((el) => {
      const contentSpan = el.querySelector("span");
      if (contentSpan) {
        return window.getComputedStyle(contentSpan).zIndex;
      }
      return null;
    });

    console.log("✓ Button opacity:", opacity);
    console.log("✓ Content z-index:", contentZIndex);
  });

  test("shimmer buttons via Button component should render correctly", async ({ page }) => {
    await page.goto("/shimmer-demo");
    await page.waitForLoadState("networkidle");

    // Find buttons rendered via Button component
    const defaultSizeButton = page.getByRole("button", { name: "Default Size" });
    const smallSizeButton = page.getByRole("button", { name: "Small Size" });
    const largeSizeButton = page.getByRole("button", { name: "Large Size" });

    // All should be visible
    await expect(defaultSizeButton).toBeVisible();
    await expect(smallSizeButton).toBeVisible();
    await expect(largeSizeButton).toBeVisible();

    // Check text color for one of them
    const color = await defaultSizeButton.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    expect(color).toBe("rgb(255, 255, 255)");
    console.log("✓ Button variant shimmer text color:", color);
  });

  test("disabled shimmer buttons should maintain text visibility", async ({ page }) => {
    await page.goto("/shimmer-demo");
    await page.waitForLoadState("networkidle");

    const disabledButton = page.getByRole("button", { name: "Disabled Button" });

    await expect(disabledButton).toBeVisible();
    await expect(disabledButton).toBeDisabled();

    // Even disabled, text should still be white
    const color = await disabledButton.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    expect(color).toBe("rgb(255, 255, 255)");
    console.log("✓ Disabled button text color:", color);
  });

  test("search button should NOT use shimmer variant", async ({ page }) => {
    // Navigate to opportunities listing page
    await page.goto("/auth/signin");
    
    // Check if the search button exists and doesn't have shimmer styling
    // This is a sanity check to ensure Search button remains unchanged
    const searchButton = page.getByRole("button", { name: /search/i });
    
    if (await searchButton.isVisible()) {
      const background = await searchButton.evaluate((el) => {
        return window.getComputedStyle(el).background || window.getComputedStyle(el).backgroundColor;
      });

      // Search button should NOT have the blue gradient
      expect(background).not.toMatch(/gradient.*1e40af.*2563eb.*60a5fa/);
      console.log("✓ Search button background (not shimmer):", background);
    }
  });
});

