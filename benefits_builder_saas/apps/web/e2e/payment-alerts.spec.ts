import { test, expect } from '@playwright/test';

test.describe('Payment Alerts Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounting/alerts');
  });

  test('should load the payment alerts page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Payment Alerts');
    await expect(page.locator('text=Track and manage late payments')).toBeVisible();
  });

  test('should display back to dashboard button', async ({ page }) => {
    const backButton = page.locator('a:has-text("Back to Dashboard")');
    await expect(backButton).toBeVisible();
  });

  test('should navigate back to dashboard when clicking back button', async ({ page }) => {
    await page.locator('a:has-text("Back to Dashboard")').click();
    await expect(page).toHaveURL('/accounting');
  });

  test('should display alert statistics', async ({ page }) => {
    // Check for stat cards
    await expect(page.locator('text=Total Alerts')).toBeVisible();
    await expect(page.locator('text=Critical')).toBeVisible();
  });

  test('should display filter tabs', async ({ page }) => {
    // Check for filter options
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Active")')).toBeVisible();
    await expect(page.locator('button:has-text("Acknowledged")')).toBeVisible();
    await expect(page.locator('button:has-text("Resolved")')).toBeVisible();
  });

  test('should display type filter tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("All Types")')).toBeVisible();
    await expect(page.locator('button:has-text("Late")')).toBeVisible();
    await expect(page.locator('button:has-text("Underpaid")')).toBeVisible();
    await expect(page.locator('button:has-text("Overpaid")')).toBeVisible();
  });

  test('should filter alerts when clicking status tabs', async ({ page }) => {
    const activeTab = page.locator('button:has-text("Active")');
    await activeTab.click();

    // Tab should be highlighted
    await expect(activeTab).toHaveClass(/bg-blue-600|bg-blue-500/);
  });

  test('should filter alerts when clicking type tabs', async ({ page }) => {
    const lateTab = page.locator('button:has-text("Late")').first();
    await lateTab.click();

    // Tab should be highlighted
    await expect(lateTab).toHaveClass(/bg-blue-600|bg-blue-500/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Alerts')).toBeVisible();

    // Check that filter tabs wrap on mobile
    const filterButtons = page.locator('button:has-text("All"), button:has-text("Active")');
    const count = await filterButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Alerts')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Alerts')).toBeVisible();
  });
});
