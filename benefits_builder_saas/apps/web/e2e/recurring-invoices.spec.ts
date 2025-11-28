import { test, expect } from '@playwright/test';

test.describe('Recurring Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/recurring-invoices');
  });

  test('should load the recurring invoices page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Recurring Invoices');
    await expect(page.locator('text=Manage recurring invoice templates')).toBeVisible();
  });

  test('should display back to dashboard button', async ({ page }) => {
    const backButton = page.locator('a:has-text("Back to Dashboard")');
    await expect(backButton).toBeVisible();
  });

  test('should display create template button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Template")');
    await expect(createButton).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.locator('a:has-text("Back to Dashboard")').click();
    await expect(page).toHaveURL('/accounting');
  });

  test('should display statistics', async ({ page }) => {
    await expect(page.locator('text=Total Templates')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();
  });

  test('should display filter tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Active")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Paused")').first()).toBeVisible();
  });

  test('should filter templates when clicking tabs', async ({ page }) => {
    const activeTab = page.locator('button:has-text("Active")').first();
    await activeTab.click();

    // Tab should be highlighted
    await expect(activeTab).toHaveClass(/bg-blue-600|bg-blue-500/);
  });

  test('should open create template modal', async ({ page }) => {
    await page.locator('button:has-text("Create Template")').click();

    // Modal should appear
    await expect(page.locator('h3:has-text("Create Recurring Invoice Template")')).toBeVisible();
  });

  test('should close create template modal when clicking cancel', async ({ page }) => {
    await page.locator('button:has-text("Create Template")').click();
    await expect(page.locator('h3:has-text("Create Recurring Invoice Template")')).toBeVisible();

    await page.locator('button:has-text("Cancel")').click();

    // Modal should disappear
    await expect(page.locator('h3:has-text("Create Recurring Invoice Template")')).not.toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Templates')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Templates')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Templates')).toBeVisible();
  });
});
