import { test, expect } from '@playwright/test';

test.describe('Credits Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounting/credits');
  });

  test('should load the credits management page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Credits Management');
    await expect(page.locator('text=Manage customer credits')).toBeVisible();
  });

  test('should display back to dashboard button', async ({ page }) => {
    const backButton = page.locator('a:has-text("Back to Dashboard")');
    await expect(backButton).toBeVisible();
  });

  test('should display create credit button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Credit")');
    await expect(createButton).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.locator('a:has-text("Back to Dashboard")').click();
    await expect(page).toHaveURL('/accounting');
  });

  test('should display credit statistics', async ({ page }) => {
    await expect(page.locator('text=Total Credits')).toBeVisible();
    await expect(page.locator('text=Available')).toBeVisible();
    await expect(page.locator('text=Applied')).toBeVisible();
  });

  test('should display filter tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Available")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Applied")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Expired")').first()).toBeVisible();
  });

  test('should filter credits when clicking tabs', async ({ page }) => {
    const availableTab = page.locator('button:has-text("Available")').first();
    await availableTab.click();

    // Tab should be highlighted
    await expect(availableTab).toHaveClass(/bg-blue-600|bg-blue-500/);
  });

  test('should open create credit modal when clicking create button', async ({ page }) => {
    await page.locator('button:has-text("Create Credit")').click();

    // Modal should appear
    await expect(page.locator('h3:has-text("Create Credit")')).toBeVisible();
  });

  test('should close create credit modal when clicking cancel', async ({ page }) => {
    await page.locator('button:has-text("Create Credit")').click();
    await expect(page.locator('h3:has-text("Create Credit")')).toBeVisible();

    await page.locator('button:has-text("Cancel")').click();

    // Modal should disappear
    await expect(page.locator('h3:has-text("Create Credit")')).not.toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Credits')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Credits')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Credits')).toBeVisible();
  });
});
