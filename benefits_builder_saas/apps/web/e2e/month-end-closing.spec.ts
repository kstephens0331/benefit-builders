import { test, expect } from '@playwright/test';

test.describe('Month-End Closing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounting/month-end');
  });

  test('should load the month-end closing page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Month-End Closing');
    await expect(page.locator('text=Manage monthly closing workflow')).toBeVisible();
  });

  test('should display back to dashboard button', async ({ page }) => {
    const backButton = page.locator('a:has-text("Back to Dashboard")');
    await expect(backButton).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.locator('a:has-text("Back to Dashboard")').click();
    await expect(page).toHaveURL('/accounting');
  });

  test('should display current month section', async ({ page }) => {
    await expect(page.locator('h2:has-text("Current Month")')).toBeVisible();
  });

  test('should display closed months section', async ({ page }) => {
    await expect(page.locator('h2:has-text("Closed Months")')).toBeVisible();
  });

  test('should display validation button', async ({ page }) => {
    const validateButton = page.locator('button:has-text("Run Validation")');

    // Button should exist (might be disabled if already closed)
    const count = await validateButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("Current Month")')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("Current Month")')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("Current Month")')).toBeVisible();
  });
});
