import { test, expect } from '@playwright/test';

test.describe('Form Submissions', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the accounting dashboard
    await page.goto('/accounting');
  });

  test.describe('Create Credit Form', () => {
    test('should successfully create a credit from overpayment', async ({ page }) => {
      await page.goto('/accounting/credits');

      // Click create credit button
      await page.click('button:has-text("Create Credit")');

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Create Credit")')).toBeVisible();

      // Fill in form fields
      // Note: These selectors may need to be adjusted based on actual form structure
      await page.selectOption('select[name="companyId"]', { index: 1 });
      await page.fill('input[name="amount"]', '50.00');
      await page.selectOption('select[name="source"]', 'overpayment');
      await page.fill('textarea[name="notes"]', 'Test credit for overpayment');

      // Submit form
      await page.click('button:has-text("Create")');

      // Verify success message appears
      await expect(page.locator('text=/credit.*created/i')).toBeVisible({ timeout: 10000 });

      // Verify modal closes
      await expect(page.locator('h3:has-text("Create Credit")')).not.toBeVisible();

      // Verify new credit appears in list
      await expect(page.locator('text=Test credit for overpayment')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/accounting/credits');

      await page.click('button:has-text("Create Credit")');
      await expect(page.locator('h3:has-text("Create Credit")')).toBeVisible();

      // Try to submit without filling fields
      await page.click('button:has-text("Create")');

      // Verify validation errors appear
      await expect(page.locator('text=/required/i')).toBeVisible();
    });

    test('should validate amount is positive number', async ({ page }) => {
      await page.goto('/accounting/credits');

      await page.click('button:has-text("Create Credit")');

      // Try negative amount
      await page.fill('input[name="amount"]', '-50.00');
      await page.click('button:has-text("Create")');

      await expect(page.locator('text=/positive|greater than/i')).toBeVisible();
    });

    test('should cancel creation and close modal', async ({ page }) => {
      await page.goto('/accounting/credits');

      await page.click('button:has-text("Create Credit")');
      await expect(page.locator('h3:has-text("Create Credit")')).toBeVisible();

      // Fill some data
      await page.fill('input[name="amount"]', '50.00');

      // Cancel
      await page.click('button:has-text("Cancel")');

      // Verify modal closed
      await expect(page.locator('h3:has-text("Create Credit")')).not.toBeVisible();

      // Verify no credit was created
      await expect(page.locator('text=Test credit')).not.toBeVisible();
    });
  });

  test.describe('Create Recurring Invoice Template Form', () => {
    test('should successfully create a recurring invoice template', async ({ page }) => {
      await page.goto('/recurring-invoices');

      await page.click('button:has-text("Create Template")');
      await expect(page.locator('h3:has-text("Create Recurring Invoice Template")')).toBeVisible();

      // Fill in form
      await page.selectOption('select[name="companyId"]', { index: 1 });
      await page.fill('input[name="description"]', 'Monthly Benefits Invoice');
      await page.fill('input[name="amount"]', '1000.00');
      await page.selectOption('select[name="frequency"]', 'monthly');
      await page.fill('input[name="startDate"]', '2024-12-01');
      await page.selectOption('select[name="dayOfMonth"]', '1');

      // Submit
      await page.click('button:has-text("Create")');

      // Verify success
      await expect(page.locator('text=/template.*created/i')).toBeVisible({ timeout: 10000 });

      // Verify template appears in list
      await expect(page.locator('text=Monthly Benefits Invoice')).toBeVisible();
    });

    test('should validate required fields for template', async ({ page }) => {
      await page.goto('/recurring-invoices');

      await page.click('button:has-text("Create Template")');

      // Try to submit empty form
      await page.click('button:has-text("Create")');

      // Should show validation errors
      await expect(page.locator('text=/required/i')).toBeVisible();
    });

    test('should toggle auto-send and auto-charge options', async ({ page }) => {
      await page.goto('/recurring-invoices');

      await page.click('button:has-text("Create Template")');

      // Check toggles exist and are clickable
      const autoSendToggle = page.locator('input[name="autoSend"]');
      const autoChargeToggle = page.locator('input[name="autoCharge"]');

      await expect(autoSendToggle).toBeVisible();
      await expect(autoChargeToggle).toBeVisible();

      // Toggle them
      await autoSendToggle.check();
      await autoChargeToggle.check();

      await expect(autoSendToggle).toBeChecked();
      await expect(autoChargeToggle).toBeChecked();
    });
  });

  test.describe('Create Bank Reconciliation Form', () => {
    test('should successfully create a bank reconciliation', async ({ page }) => {
      await page.goto('/accounting/bank-reconciliation');

      await page.click('button:has-text("New Reconciliation")');
      await expect(page.locator('h3:has-text("Create Bank Reconciliation")')).toBeVisible();

      // Fill in form
      await page.selectOption('select[name="month"]', '11'); // November
      await page.selectOption('select[name="year"]', '2024');
      await page.selectOption('select[name="bankAccount"]', { index: 1 });
      await page.fill('input[name="statementBeginningBalance"]', '5000.00');
      await page.fill('input[name="statementEndingBalance"]', '7500.00');
      await page.fill('input[name="statementDate"]', '2024-11-30');

      // Submit
      await page.click('button:has-text("Create")');

      // Verify success
      await expect(page.locator('text=/reconciliation.*created/i')).toBeVisible({ timeout: 10000 });

      // Verify reconciliation appears in list
      await expect(page.locator('text=November 2024')).toBeVisible();
    });

    test('should validate balance amounts are numbers', async ({ page }) => {
      await page.goto('/accounting/bank-reconciliation');

      await page.click('button:has-text("New Reconciliation")');

      // Try invalid amounts
      await page.fill('input[name="statementBeginningBalance"]', 'invalid');
      await page.fill('input[name="statementEndingBalance"]', 'invalid');

      await page.click('button:has-text("Create")');

      // Should show validation errors
      await expect(page.locator('text=/invalid|number/i')).toBeVisible();
    });
  });

  test.describe('Send Payment Reminder Form', () => {
    test('should open payment reminder modal from alerts page', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // Click send reminder on first alert (if exists)
      const reminderButton = page.locator('button:has-text("Send Reminder")').first();

      if (await reminderButton.isVisible()) {
        await reminderButton.click();

        // Verify modal opens
        await expect(page.locator('h3:has-text("Send Payment Reminder")')).toBeVisible();

        // Check reminder type options are available
        await expect(page.locator('text=Gentle')).toBeVisible();
        await expect(page.locator('text=Firm')).toBeVisible();
        await expect(page.locator('text=Final')).toBeVisible();
      }
    });

    test('should select reminder type and send', async ({ page }) => {
      await page.goto('/accounting/alerts');

      const reminderButton = page.locator('button:has-text("Send Reminder")').first();

      if (await reminderButton.isVisible()) {
        await reminderButton.click();

        // Select gentle reminder
        await page.click('input[value="gentle"]');

        // Send reminder
        await page.click('button:has-text("Send")');

        // Verify success message
        await expect(page.locator('text=/reminder.*sent/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Month-End Validation Form', () => {
    test('should run month-end validation', async ({ page }) => {
      await page.goto('/accounting/month-end');

      // Click run validation button
      const validateButton = page.locator('button:has-text("Run Validation")');

      if (await validateButton.isVisible()) {
        await validateButton.click();

        // Wait for validation to complete
        await expect(page.locator('text=/validation.*complete/i')).toBeVisible({ timeout: 15000 });

        // Verify validation results display
        await expect(page.locator('text=/check/i')).toBeVisible();
      }
    });

    test('should show validation results with pass/fail status', async ({ page }) => {
      await page.goto('/accounting/month-end');

      const validateButton = page.locator('button:has-text("Run Validation")');

      if (await validateButton.isVisible()) {
        await validateButton.click();

        await page.waitForTimeout(2000); // Wait for validation

        // Check for status indicators
        const passIndicator = page.locator('text=/pass|✓|✅/i');
        const failIndicator = page.locator('text=/fail|✗|❌/i');

        // At least one should be visible
        const hasResults = (await passIndicator.count()) > 0 || (await failIndicator.count()) > 0;
        expect(hasResults).toBeTruthy();
      }
    });
  });

  test.describe('Month-End Close Form', () => {
    test('should require confirmation text to close month', async ({ page }) => {
      await page.goto('/accounting/month-end');

      const closeButton = page.locator('button:has-text("Close Month")');

      if (await closeButton.isVisible() && await closeButton.isEnabled()) {
        await closeButton.click();

        // Modal should open
        await expect(page.locator('h3:has-text("Close Month")')).toBeVisible();

        // Try to close without confirmation text
        await page.click('button:has-text("Close")');

        // Should show validation error
        await expect(page.locator('text=/confirmation.*required|type.*close/i')).toBeVisible();
      }
    });

    test('should validate exact confirmation text match', async ({ page }) => {
      await page.goto('/accounting/month-end');

      const closeButton = page.locator('button:has-text("Close Month")');

      if (await closeButton.isVisible() && await closeButton.isEnabled()) {
        await closeButton.click();

        // Enter wrong confirmation text
        await page.fill('input[name="confirmation"]', 'wrong text');
        await page.click('button:has-text("Close")');

        // Should show error about text not matching
        await expect(page.locator('text=/match|incorrect/i')).toBeVisible();
      }
    });
  });

  test.describe('Apply Credit to Invoice Form', () => {
    test('should open apply credit modal', async ({ page }) => {
      await page.goto('/accounting/credits');

      // Click apply button on first available credit (if exists)
      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();

        // Modal should open
        await expect(page.locator('h3:has-text("Apply Credit")')).toBeVisible();

        // Invoice selector should be visible
        await expect(page.locator('select[name="invoiceId"]')).toBeVisible();
      }
    });

    test('should validate amount does not exceed credit or invoice balance', async ({ page }) => {
      await page.goto('/accounting/credits');

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();

        // Try to apply excessive amount
        await page.fill('input[name="amountToApply"]', '999999.99');
        await page.click('button:has-text("Apply")');

        // Should show validation error
        await expect(page.locator('text=/exceed|too much|maximum/i')).toBeVisible();
      }
    });
  });
});
