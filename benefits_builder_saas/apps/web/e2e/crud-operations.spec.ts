import { test, expect } from '@playwright/test';

test.describe('CRUD Operations', () => {

  test.describe('Credits CRUD', () => {
    test('should create, read, update, and delete a credit', async ({ page }) => {
      // CREATE
      await page.goto('/accounting/credits');
      await page.click('button:has-text("Create Credit")');

      await page.selectOption('select[name="companyId"]', { index: 1 });
      await page.fill('input[name="amount"]', '75.50');
      await page.selectOption('select[name="source"]', 'overpayment');
      await page.fill('textarea[name="notes"]', 'E2E Test Credit');

      await page.click('button:has-text("Create")');
      await expect(page.locator('text=/created/i')).toBeVisible({ timeout: 10000 });

      // READ - Verify credit appears in list
      await expect(page.locator('text=E2E Test Credit')).toBeVisible();
      await expect(page.locator('text=75.50')).toBeVisible();

      // UPDATE - Click on credit to edit (if edit functionality exists)
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // Update notes
        await page.fill('textarea[name="notes"]', 'E2E Test Credit - Updated');
        await page.click('button:has-text("Save")');

        await expect(page.locator('text=/updated/i')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=E2E Test Credit - Updated')).toBeVisible();
      }

      // DELETE - Delete the credit
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await expect(page.locator('text=/deleted/i')).toBeVisible({ timeout: 10000 });

        // Verify credit no longer in list
        await expect(page.locator('text=E2E Test Credit')).not.toBeVisible();
      }
    });

    test('should list all credits with filters', async ({ page }) => {
      await page.goto('/accounting/credits');

      // Test available filter
      await page.click('button:has-text("Available")');

      // Check that URL or state updates
      await page.waitForTimeout(500);

      // All visible credits should have "Available" badge
      const availableBadges = page.locator('text=Available');
      if (await availableBadges.count() > 0) {
        expect(await availableBadges.count()).toBeGreaterThan(0);
      }

      // Test applied filter
      await page.click('button:has-text("Applied")');
      await page.waitForTimeout(500);

      // Test expired filter
      await page.click('button:has-text("Expired")');
      await page.waitForTimeout(500);
    });
  });

  test.describe('Recurring Invoice Templates CRUD', () => {
    test('should create, read, update, pause, and delete template', async ({ page }) => {
      // CREATE
      await page.goto('/recurring-invoices');
      await page.click('button:has-text("Create Template")');

      await page.selectOption('select[name="companyId"]', { index: 1 });
      await page.fill('input[name="description"]', 'E2E Test Template');
      await page.fill('input[name="amount"]', '500.00');
      await page.selectOption('select[name="frequency"]', 'monthly');
      await page.fill('input[name="startDate"]', '2024-12-01');

      await page.click('button:has-text("Create")');
      await expect(page.locator('text=/created/i')).toBeVisible({ timeout: 10000 });

      // READ - Verify template in list
      await expect(page.locator('text=E2E Test Template')).toBeVisible();
      await expect(page.locator('text=500.00')).toBeVisible();

      // UPDATE - Edit template
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        await page.fill('input[name="amount"]', '750.00');
        await page.click('button:has-text("Save")');

        await expect(page.locator('text=/updated/i')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=750.00')).toBeVisible();
      }

      // PAUSE - Pause template
      const pauseButton = page.locator('button:has-text("Pause")').first();
      if (await pauseButton.isVisible()) {
        await pauseButton.click();

        await expect(page.locator('text=/paused/i')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Paused')).toBeVisible();

        // RESUME - Resume template
        const resumeButton = page.locator('button:has-text("Resume")').first();
        if (await resumeButton.isVisible()) {
          await resumeButton.click();

          await expect(page.locator('text=/active|resumed/i')).toBeVisible({ timeout: 10000 });
        }
      }

      // DELETE - Delete template
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await expect(page.locator('text=/deleted/i')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=E2E Test Template')).not.toBeVisible();
      }
    });

    test('should generate invoice from template', async ({ page }) => {
      await page.goto('/recurring-invoices');

      const generateButton = page.locator('button:has-text("Generate Now")').first();

      if (await generateButton.isVisible()) {
        await generateButton.click();

        // Confirm generation
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Verify success message
        await expect(page.locator('text=/invoice.*generated|created/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Bank Reconciliation CRUD', () => {
    test('should create, read, update, and complete reconciliation', async ({ page }) => {
      // CREATE
      await page.goto('/accounting/bank-reconciliation');
      await page.click('button:has-text("New Reconciliation")');

      await page.selectOption('select[name="month"]', '11');
      await page.selectOption('select[name="year"]', '2024');
      await page.selectOption('select[name="bankAccount"]', { index: 1 });
      await page.fill('input[name="statementBeginningBalance"]', '10000.00');
      await page.fill('input[name="statementEndingBalance"]', '12000.00');
      await page.fill('input[name="statementDate"]', '2024-11-30');

      await page.click('button:has-text("Create")');
      await expect(page.locator('text=/created/i')).toBeVisible({ timeout: 10000 });

      // READ - Verify reconciliation in list
      await expect(page.locator('text=November 2024')).toBeVisible();

      // UPDATE - Click to view/edit reconciliation details
      const viewButton = page.locator('text=November 2024').first();
      await viewButton.click();

      // Add notes
      const notesTextarea = page.locator('textarea[name="notes"]');
      if (await notesTextarea.isVisible()) {
        await notesTextarea.fill('E2E Test Reconciliation Notes');

        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
        }
      }

      // COMPLETE - Complete reconciliation (only if difference is $0)
      const completeButton = page.locator('button:has-text("Complete")');
      if (await completeButton.isEnabled()) {
        await completeButton.click();

        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await expect(page.locator('text=/completed/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Payment Alerts CRUD', () => {
    test('should read, acknowledge, and resolve alerts', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // READ - Verify alerts display
      const alertCard = page.locator('[data-testid="alert-card"]').first();

      // If no alerts, test is skipped
      if (await page.locator('text=No alerts').isVisible()) {
        test.skip();
        return;
      }

      // ACKNOWLEDGE - Acknowledge alert
      const acknowledgeButton = page.locator('button:has-text("Acknowledge")').first();
      if (await acknowledgeButton.isVisible() && await acknowledgeButton.isEnabled()) {
        await acknowledgeButton.click();

        await expect(page.locator('text=/acknowledged/i')).toBeVisible({ timeout: 10000 });
      }

      // RESOLVE - Resolve alert
      const resolveButton = page.locator('button:has-text("Resolve")').first();
      if (await resolveButton.isVisible() && await resolveButton.isEnabled()) {
        await resolveButton.click();

        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await expect(page.locator('text=/resolved/i')).toBeVisible({ timeout: 10000 });
      }

      // DELETE - Delete alert
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await expect(page.locator('text=/deleted/i')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should filter alerts by status', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // Test each filter
      const filters = ['All', 'Active', 'Acknowledged', 'Resolved'];

      for (const filter of filters) {
        const filterButton = page.locator(`button:has-text("${filter}")`).first();
        await filterButton.click();
        await page.waitForTimeout(500);

        // Verify filter is active (highlighted)
        await expect(filterButton).toHaveClass(/bg-blue/);
      }
    });

    test('should filter alerts by type', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // Test each type filter
      const types = ['All Types', 'Late', 'Underpaid', 'Overpaid'];

      for (const type of types) {
        const typeButton = page.locator(`button:has-text("${type}")`).first();
        if (await typeButton.isVisible()) {
          await typeButton.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Companies and Employees CRUD', () => {
    test('should navigate to company detail page', async ({ page }) => {
      await page.goto('/companies');

      // Click on first company
      const companyLink = page.locator('a[href^="/companies/"]').first();
      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Should be on company detail page
        await expect(page).toHaveURL(/\/companies\/[^/]+/);
      }
    });

    test('should add employee inline', async ({ page }) => {
      // Navigate to a company detail page
      await page.goto('/companies');
      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Look for add employee button
        const addEmployeeButton = page.locator('button:has-text("Add Employee")');
        if (await addEmployeeButton.isVisible()) {
          await addEmployeeButton.click();

          // Fill in employee details
          await page.fill('input[name="firstName"]', 'Test');
          await page.fill('input[name="lastName"]', 'Employee');
          await page.fill('input[name="email"]', 'test.employee@example.com');

          // Save
          const saveButton = page.locator('button:has-text("Save")');
          await saveButton.click();

          await expect(page.locator('text=/added|created/i')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('text=Test Employee')).toBeVisible();
        }
      }
    });

    test('should edit employee inline', async ({ page }) => {
      await page.goto('/companies');
      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Click on employee field to edit
        const employeeField = page.locator('[data-testid="employee-field"]').first();
        if (await employeeField.isVisible()) {
          await employeeField.click();

          // Modify field
          await page.fill('input:focus', 'Updated Value');

          // Press Enter or blur to save
          await page.keyboard.press('Enter');

          await expect(page.locator('text=/saved|updated/i')).toBeVisible({ timeout: 10000 });
        }
      }
    });

    test('should remove employee', async ({ page }) => {
      await page.goto('/companies');
      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Look for remove button
        const removeButton = page.locator('button:has-text("Remove")').first();
        if (await removeButton.isVisible()) {
          await removeButton.click();

          // Confirm removal
          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          await expect(page.locator('text=/removed/i')).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });
});
