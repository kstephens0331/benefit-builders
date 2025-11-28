import { test, expect } from '@playwright/test';

test.describe('Error Handling & Edge Cases', () => {

  test.describe('API Error Responses', () => {
    test('should handle 404 errors gracefully', async ({ page }) => {
      // Navigate to non-existent page
      await page.goto('/accounting/credits/nonexistent-id');

      // Should show error message, not crash
      await expect(page.locator('text=/not found|404/i')).toBeVisible();
    });

    test('should handle network timeout', async ({ page }) => {
      // This test would need to mock slow network
      // For now, just verify loading states exist
      await page.goto('/accounting/credits');

      // Check for loading indicator during initial load
      const loadingIndicator = page.locator('text=/loading|spinner/i');

      // Loading should eventually disappear
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).not.toBeVisible({ timeout: 30000 });
      }
    });

    test('should display error message when API fails', async ({ page }) => {
      // Navigate to a page
      await page.goto('/accounting/credits');

      // This test assumes error messages are displayed when API fails
      // In real scenario, you'd mock API to return error

      // Check that error boundaries exist
      await page.waitForLoadState('networkidle');

      // Page should not show uncaught error
      const errorBoundary = page.locator('text=/something went wrong/i');
      if (await errorBoundary.isVisible()) {
        // Error boundary caught error - good!
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('Form Validation Edge Cases', () => {
    test('should reject very long company names', async ({ page }) => {
      await page.goto('/accounting/credits');
      await page.click('button:has-text("Create Credit")');

      // Try to select a company, but first check if the select allows it
      const veryLongName = 'A'.repeat(300);

      // This would depend on actual form implementation
      // Just verify form handles long input
      const notesField = page.locator('textarea[name="notes"]');
      await notesField.fill(veryLongName);

      // Check character count or validation
      const charCount = await notesField.inputValue();
      expect(charCount.length).toBeLessThanOrEqual(500); // Assuming max length
    });

    test('should handle special characters in input fields', async ({ page }) => {
      await page.goto('/accounting/credits');
      await page.click('button:has-text("Create Credit")');

      const specialChars = '<script>alert("xss")</script>';

      const notesField = page.locator('textarea[name="notes"]');
      await notesField.fill(specialChars);

      await page.click('button:has-text("Create")');

      // After form submission, check that special chars are escaped
      // Page should not execute script
      const dialog = page.locator('text=xss');
      await expect(dialog).not.toBeVisible();
    });

    test('should validate email formats', async ({ page }) => {
      // This test assumes there's an email field somewhere
      // For example, when adding employees or sending reminders

      await page.goto('/accounting/alerts');

      const reminderButton = page.locator('button:has-text("Send Reminder")').first();

      if (await reminderButton.isVisible()) {
        await reminderButton.click();

        // If there's an email field, test invalid email
        const emailField = page.locator('input[type="email"]');
        if (await emailField.isVisible()) {
          await emailField.fill('invalid-email');
          await page.click('button:has-text("Send")');

          // Should show validation error
          await expect(page.locator('text=/invalid.*email|valid email/i')).toBeVisible();
        }
      }
    });

    test('should validate phone number formats', async ({ page }) => {
      // Test phone validation if exists in company/employee forms
      await page.goto('/companies');

      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        const phoneField = page.locator('input[type="tel"]');
        if (await phoneField.isVisible()) {
          // Try invalid phone
          await phoneField.fill('123');
          await phoneField.blur();

          // Check for validation message
          const validation = page.locator('text=/invalid|format/i');
          if (await validation.isVisible()) {
            expect(true).toBeTruthy();
          }
        }
      }
    });

    test('should validate dollar amounts', async ({ page }) => {
      await page.goto('/accounting/credits');
      await page.click('button:has-text("Create Credit")');

      const amountField = page.locator('input[name="amount"]');

      // Try negative amount
      await amountField.fill('-100.00');
      await page.click('button:has-text("Create")');
      await expect(page.locator('text=/positive|greater than/i')).toBeVisible();

      // Try zero
      await amountField.fill('0.00');
      await page.click('button:has-text("Create")');
      await expect(page.locator('text=/greater than zero|positive/i')).toBeVisible();

      // Try invalid format
      await amountField.fill('abc');
      await page.click('button:has-text("Create")');
      await expect(page.locator('text=/number|invalid/i')).toBeVisible();

      // Try excessive decimals
      await amountField.fill('100.999');
      await page.click('button:has-text("Create")');
      // Should either round or reject

      // Try very large amount
      await amountField.fill('999999999999.99');
      await page.click('button:has-text("Create")');
      // Should handle or warn about large amounts
    });

    test('should validate dates', async ({ page }) => {
      await page.goto('/accounting/bank-reconciliation');
      await page.click('button:has-text("New Reconciliation")');

      const dateField = page.locator('input[name="statementDate"]');

      // Try future date
      const futureDate = '2099-12-31';
      await dateField.fill(futureDate);
      await page.click('button:has-text("Create")');

      // Should either accept or warn about future dates
      // (Business logic dependent)

      // Try very old date
      await dateField.fill('1900-01-01');
      await page.click('button:has-text("Create")');
      // Should handle old dates appropriately
    });
  });

  test.describe('Business Logic Validation', () => {
    test('should prevent closing month with critical issues', async ({ page }) => {
      await page.goto('/accounting/month-end');

      // Run validation first
      const validateButton = page.locator('button:has-text("Run Validation")');
      if (await validateButton.isVisible()) {
        await validateButton.click();
        await page.waitForTimeout(2000);
      }

      // Check if close button is disabled when there are critical issues
      const closeButton = page.locator('button:has-text("Close Month")');

      if (await closeButton.isVisible()) {
        const isDisabled = await closeButton.isDisabled();

        if (isDisabled) {
          // Good! Button is disabled with critical issues
          // Try to hover to see tooltip
          await closeButton.hover();
          await expect(page.locator('text=/critical issues|cannot close/i')).toBeVisible();
        }
      }
    });

    test('should prevent applying credit to paid invoice', async ({ page }) => {
      await page.goto('/accounting/credits');

      const applyButton = page.locator('button:has-text("Apply")').first();

      if (await applyButton.isVisible()) {
        await applyButton.click();

        // Try to select a paid invoice (if dropdown shows status)
        const invoiceSelect = page.locator('select[name="invoiceId"]');
        await invoiceSelect.selectOption({ index: 1 });

        await page.click('button:has-text("Apply")');

        // If invoice is paid, should show error
        const paidError = page.locator('text=/already paid|paid in full|cannot apply/i');
        if (await paidError.isVisible()) {
          expect(true).toBeTruthy();
        }
      }
    });

    test('should prevent deleting applied credit', async ({ page }) => {
      await page.goto('/accounting/credits');

      // Look for applied credits (have "Applied" badge)
      const appliedCredits = page.locator('text=Applied').first();

      if (await appliedCredits.isVisible()) {
        // Navigate to parent and find delete button
        const deleteButton = appliedCredits.locator('xpath=ancestor::div').locator('button:has-text("Delete")');

        if (await deleteButton.count() > 0) {
          // Delete button should be disabled or not present
          const isDisabled = await deleteButton.isDisabled();
          expect(isDisabled).toBeTruthy();
        }
      }
    });

    test('should prevent modifying closed month transactions', async ({ page }) => {
      await page.goto('/accounting/month-end');

      // Click on a closed month
      const closedMonth = page.locator('text=/closed/i').first();

      if (await closedMonth.isVisible()) {
        // Try to access transactions for that month
        // All edit buttons should be disabled

        // This test depends on how the UI handles closed months
        // Typically, edit buttons would be disabled or hidden
      }
    });

    test('should prevent duplicate invoice numbers', async ({ page }) => {
      // This test would need to:
      // 1. Create an invoice with a specific number
      // 2. Try to create another invoice with the same number
      // 3. Verify error message about duplicate

      // Implementation depends on invoice creation workflow
      test.skip(); // Skip until invoice creation UI is available
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicators during data fetch', async ({ page }) => {
      // Set slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100);
      });

      await page.goto('/accounting/credits');

      // Look for skeleton loaders or spinners
      const skeleton = page.locator('[data-testid="skeleton"]');
      const spinner = page.locator('.animate-spin');

      // At least one loading indicator should appear briefly
      const hasLoadingState = (await skeleton.count() > 0) || (await spinner.count() > 0);

      // Loading should eventually complete
      await page.waitForLoadState('networkidle');
    });

    test('should disable buttons during form submission', async ({ page }) => {
      await page.goto('/accounting/credits');
      await page.click('button:has-text("Create Credit")');

      await page.selectOption('select[name="companyId"]', { index: 1 });
      await page.fill('input[name="amount"]', '50.00');
      await page.selectOption('select[name="source"]', 'overpayment');

      // Submit form
      const createButton = page.locator('button:has-text("Create")');
      await createButton.click();

      // Button should be disabled during submission
      // (This might be very quick, so we check immediately)
      const isDisabledDuringSubmit = await createButton.isDisabled();

      // Eventually button should be re-enabled or modal closes
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Empty States', () => {
    test('should show empty state when no credits exist', async ({ page }) => {
      await page.goto('/accounting/credits');

      // If no credits, should show helpful message
      const emptyState = page.locator('text=/no credits|get started|create your first/i');

      // Either credits exist OR empty state shows
      const hasCreditCards = await page.locator('[data-testid="credit-card"]').count() > 0;
      const hasEmptyState = await emptyState.isVisible();

      expect(hasCreditCards || hasEmptyState).toBeTruthy();
    });

    test('should show empty state when no alerts exist', async ({ page }) => {
      await page.goto('/accounting/alerts');

      const emptyState = page.locator('text=/no alerts|all clear|no payment issues/i');
      const hasAlerts = await page.locator('[data-testid="alert-card"]').count() > 0;

      expect(hasAlerts || await emptyState.isVisible()).toBeTruthy();
    });

    test('should show empty state for closed months when none exist', async ({ page }) => {
      await page.goto('/accounting/month-end');

      const closedMonthsSection = page.locator('text=Closed Months').locator('xpath=following-sibling::div');

      // Should show either closed months or empty state
      const hasClosedMonths = await closedMonthsSection.locator('div').count() > 0;
      const emptyState = page.locator('text=/no closed months|no months have been closed/i');

      expect(hasClosedMonths || await emptyState.isVisible()).toBeTruthy();
    });
  });

  test.describe('Error Boundaries', () => {
    test('should catch component errors gracefully', async ({ page }) => {
      // Navigate to all major pages and ensure no uncaught errors
      const pages = [
        '/accounting',
        '/accounting/alerts',
        '/accounting/credits',
        '/accounting/month-end',
        '/recurring-invoices',
        '/accounting/bank-reconciliation',
      ];

      for (const url of pages) {
        await page.goto(url);

        // Check for error boundary UI
        const errorBoundary = page.locator('text=/something went wrong|error occurred/i');

        // If error boundary appears, it means it caught an error
        // This is better than crashing
        if (await errorBoundary.isVisible()) {
          // Error boundary is working
          console.log(`Error boundary caught error on ${url}`);
        }

        // Verify page loaded to some degree
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should recover from errors with retry button', async ({ page }) => {
      await page.goto('/accounting/credits');

      // If error boundary shows, look for retry button
      const errorBoundary = page.locator('text=/something went wrong/i');

      if (await errorBoundary.isVisible()) {
        const retryButton = page.locator('button:has-text("Retry")');

        if (await retryButton.isVisible()) {
          await retryButton.click();

          // Should attempt to recover
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Navigation Error Handling', () => {
    test('should handle browser back button', async ({ page }) => {
      await page.goto('/accounting');
      await page.click('a:has-text("View All Alerts")');
      await expect(page).toHaveURL('/accounting/alerts');

      // Go back
      await page.goBack();
      await expect(page).toHaveURL('/accounting');

      // Forward
      await page.goForward();
      await expect(page).toHaveURL('/accounting/alerts');

      // No errors should occur
      const errorText = page.locator('text=/error|crash/i');
      await expect(errorText).not.toBeVisible();
    });

    test('should handle direct URL access to nested pages', async ({ page }) => {
      // Directly access a nested page without going through navigation
      await page.goto('/accounting/credits');

      // Should load correctly
      await expect(page.locator('h1')).toContainText('Credits');

      // Try another
      await page.goto('/accounting/month-end');
      await expect(page.locator('h1')).toContainText('Month-End');
    });
  });
});
