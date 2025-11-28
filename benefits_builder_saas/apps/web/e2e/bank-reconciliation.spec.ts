import { test, expect } from '@playwright/test';

test.describe('Bank Reconciliation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounting/bank-reconciliation');
  });

  test('should load the bank reconciliation page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Bank Reconciliation');
    await expect(page.locator('text=Manage monthly bank reconciliations')).toBeVisible();
  });

  test('should display back to dashboard button', async ({ page }) => {
    const backButton = page.locator('a:has-text("Back to Dashboard")');
    await expect(backButton).toBeVisible();
  });

  test('should display create reconciliation button', async ({ page }) => {
    const createButton = page.locator('button:has-text("New Reconciliation")');
    await expect(createButton).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.locator('a:has-text("Back to Dashboard")').click();
    await expect(page).toHaveURL('/accounting');
  });

  test('should display statistics', async ({ page }) => {
    await expect(page.locator('text=Total Reconciliations')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
  });

  test('should display filter tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("In Progress")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Completed")').first()).toBeVisible();
  });

  test('should filter reconciliations when clicking tabs', async ({ page }) => {
    const completedTab = page.locator('button:has-text("Completed")').first();
    await completedTab.click();

    // Tab should be highlighted
    await expect(completedTab).toHaveClass(/bg-blue-600|bg-blue-500/);
  });

  test('should open create reconciliation modal', async ({ page }) => {
    await page.locator('button:has-text("New Reconciliation")').click();

    // Modal should appear
    await expect(page.locator('h3:has-text("Create Bank Reconciliation")')).toBeVisible();
  });

  test('should close create reconciliation modal when clicking cancel', async ({ page }) => {
    await page.locator('button:has-text("New Reconciliation")').click();
    await expect(page.locator('h3:has-text("Create Bank Reconciliation")')).toBeVisible();

    await page.locator('button:has-text("Cancel")').click();

    // Modal should disappear
    await expect(page.locator('h3:has-text("Create Bank Reconciliation")')).not.toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Reconciliations')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Reconciliations')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Reconciliations')).toBeVisible();
  });
});
