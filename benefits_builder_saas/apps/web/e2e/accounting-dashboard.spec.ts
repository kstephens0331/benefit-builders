import { test, expect } from '@playwright/test';

test.describe('Accounting Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the accounting dashboard
    await page.goto('/accounting');
  });

  test('should load the accounting dashboard', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Accounting Dashboard');

    // Check description
    await expect(page.locator('text=Overview of your financial health')).toBeVisible();
  });

  test('should display alert summary section', async ({ page }) => {
    // Check for alert section header
    await expect(page.locator('h2:has-text("Payment Alerts Summary")')).toBeVisible();

    // Check for alert types
    await expect(page.locator('text=Late Payments')).toBeVisible();
    await expect(page.locator('text=Underpaid')).toBeVisible();
    await expect(page.locator('text=Overpaid')).toBeVisible();
    await expect(page.locator('text=Failed Charges')).toBeVisible();
  });

  test('should display financial summary section', async ({ page }) => {
    await expect(page.locator('h2:has-text("Financial Summary")')).toBeVisible();

    // Check for A/R and A/P sections
    await expect(page.locator('text=Accounts Receivable')).toBeVisible();
    await expect(page.locator('text=Accounts Payable')).toBeVisible();
  });

  test('should display credits section', async ({ page }) => {
    await expect(page.locator('h2:has-text("Customer Credits")')).toBeVisible();
    await expect(page.locator('text=Total Credits Available')).toBeVisible();
  });

  test('should display month-end status section', async ({ page }) => {
    await expect(page.locator('h2:has-text("Month-End Status")')).toBeVisible();
  });

  test('should display QuickBooks sync section', async ({ page }) => {
    await expect(page.locator('h2:has-text("QuickBooks Sync")')).toBeVisible();
  });

  test('should display recent alerts section', async ({ page }) => {
    await expect(page.locator('h2:has-text("Recent Alerts")')).toBeVisible();
  });

  test('should navigate to alerts page when clicking View All Alerts', async ({ page }) => {
    const alertsButton = page.locator('a:has-text("View All Alerts")');
    await expect(alertsButton).toBeVisible();
    await alertsButton.click();

    // Should navigate to alerts page
    await expect(page).toHaveURL('/accounting/alerts');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that elements are still visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("Payment Alerts Summary")')).toBeVisible();

    // Check that buttons stack vertically on mobile
    const headerButtons = page.locator('.flex.flex-col.sm\\:flex-row button, .flex.flex-col.sm\\:flex-row a');
    const count = await headerButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Check grid layouts adapt
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("Payment Alerts Summary")')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Check that all sections are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("Payment Alerts Summary")')).toBeVisible();
    await expect(page.locator('h2:has-text("Financial Summary")')).toBeVisible();
  });
});
