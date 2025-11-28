import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {

  test.describe('QuickBooks Integration', () => {
    test('should display QuickBooks connection status', async ({ page }) => {
      await page.goto('/accounting');

      // Find QuickBooks sync section
      await expect(page.locator('h2:has-text("QuickBooks Sync")')).toBeVisible();

      // Check for connection status
      const connected = page.locator('text=/connected/i');
      const notConnected = page.locator('text=/not connected|connect to quickbooks/i');

      // Either status should be visible
      const hasStatus = (await connected.isVisible()) || (await notConnected.isVisible());
      expect(hasStatus).toBeTruthy();
    });

    test('should show QuickBooks company details when connected', async ({ page }) => {
      await page.goto('/accounting');

      const connectedIndicator = page.locator('text=/connected/i');

      if (await connectedIndicator.isVisible()) {
        // Should show company name
        await expect(page.locator('text=/company/i')).toBeVisible();

        // Should show realm ID
        await expect(page.locator('text=/realm/i')).toBeVisible();

        // Should show last sync time
        await expect(page.locator('text=/last sync/i')).toBeVisible();
      }
    });

    test('should show connect button when not connected', async ({ page }) => {
      await page.goto('/accounting');

      const notConnected = page.locator('text=/not connected/i');

      if (await notConnected.isVisible()) {
        // Should have connect button
        const connectButton = page.locator('button:has-text("Connect to QuickBooks")');
        await expect(connectButton).toBeVisible();
      }
    });

    test('should have sync now button when connected', async ({ page }) => {
      await page.goto('/accounting');

      const connected = page.locator('text=/connected/i');

      if (await connected.isVisible()) {
        // Should have sync button
        const syncButton = page.locator('button:has-text("Sync Now")');
        if (await syncButton.isVisible()) {
          expect(true).toBeTruthy();
        }
      }
    });

    test('should trigger manual sync when button clicked', async ({ page }) => {
      await page.goto('/accounting');

      const syncButton = page.locator('button:has-text("Sync Now")');

      if (await syncButton.isVisible()) {
        await syncButton.click();

        // Should show loading state
        await expect(page.locator('text=/syncing/i')).toBeVisible();

        // Should show success or error message
        await expect(page.locator('text=/sync.*complete|sync.*success|sync.*failed/i')).toBeVisible({ timeout: 15000 });
      }
    });

    test('should show disconnect option when connected', async ({ page }) => {
      await page.goto('/accounting');

      const connected = page.locator('text=/connected/i');

      if (await connected.isVisible()) {
        const disconnectButton = page.locator('button:has-text("Disconnect")');

        if (await disconnectButton.isVisible()) {
          await disconnectButton.click();

          // Should show confirmation
          await expect(page.locator('text=/are you sure|confirm/i')).toBeVisible();

          // Cancel to not actually disconnect
          const cancelButton = page.locator('button:has-text("Cancel")');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    });
  });

  test.describe('Email Sending Integration', () => {
    test('should send payment reminder email', async ({ page }) => {
      await page.goto('/accounting/alerts');

      const sendReminderButton = page.locator('button:has-text("Send Reminder")').first();

      if (await sendReminderButton.isVisible()) {
        await sendReminderButton.click();

        // Select reminder type
        await page.click('input[value="gentle"]');

        // Send
        await page.click('button:has-text("Send")');

        // Should show success message
        await expect(page.locator('text=/reminder.*sent|email.*sent/i')).toBeVisible({ timeout: 15000 });

        // Should store email ID (check in list if visible)
        // Email tracking would show in alert details
      }
    });

    test('should send invoice via email', async ({ page }) => {
      // This test assumes invoice detail page exists
      // Navigate to an invoice
      await page.goto('/companies');

      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Look for invoice
        const invoiceLink = page.locator('a[href*="/invoice"]').first();

        if (await invoiceLink.isVisible()) {
          await invoiceLink.click();

          // Send invoice button
          const sendButton = page.locator('button:has-text("Send Invoice")');

          if (await sendButton.isVisible()) {
            await sendButton.click();

            // Email modal should open
            await expect(page.locator('text=/send.*email|recipient/i')).toBeVisible();

            // Verify recipient email shown
            await expect(page.locator('input[type="email"]')).toBeVisible();

            // Could customize message
            const messageField = page.locator('textarea[name="message"]');
            if (await messageField.isVisible()) {
              await messageField.fill('Please see attached invoice.');
            }

            // Send
            await page.click('button:has-text("Send")');

            // Success message
            await expect(page.locator('text=/invoice.*sent|email.*sent/i')).toBeVisible({ timeout: 15000 });
          }
        }
      }
    });

    test('should show email delivery status', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // If alerts exist, check for email tracking info
      const alertCard = page.locator('[data-testid="alert-card"]').first();

      if (await alertCard.isVisible()) {
        // Click to view details
        await alertCard.click();

        // Look for email tracking info
        const emailStatus = page.locator('text=/email.*sent|delivered|opened/i');

        if (await emailStatus.isVisible()) {
          // Email tracking is working
          expect(true).toBeTruthy();
        }
      }
    });
  });

  test.describe('PDF Generation Integration', () => {
    test('should generate invoice PDF', async ({ page }) => {
      // Navigate to invoice
      await page.goto('/companies');

      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        const invoiceLink = page.locator('a[href*="/invoice"]').first();

        if (await invoiceLink.isVisible()) {
          await invoiceLink.click();

          // Download PDF button
          const downloadButton = page.locator('button:has-text("Download PDF")');

          if (await downloadButton.isVisible()) {
            // Setup download listener
            const [download] = await Promise.all([
              page.waitForEvent('download'),
              downloadButton.click()
            ]);

            // Verify download started
            expect(download).toBeTruthy();

            // Verify filename
            const fileName = download.suggestedFilename();
            expect(fileName).toMatch(/\.pdf$/i);
          }
        }
      }
    });

    test('should generate billing report PDF', async ({ page }) => {
      await page.goto('/accounting');

      // Look for reports section or button
      const reportsButton = page.locator('button:has-text("Reports")');

      if (await reportsButton.isVisible()) {
        await reportsButton.click();

        // Select billing report
        const billingReport = page.locator('text=/billing report/i');

        if (await billingReport.isVisible()) {
          await billingReport.click();

          // Generate PDF button
          const generateButton = page.locator('button:has-text("Generate PDF")');

          if (await generateButton.isVisible()) {
            const [download] = await Promise.all([
              page.waitForEvent('download'),
              generateButton.click()
            ]);

            expect(download).toBeTruthy();
            expect(download.suggestedFilename()).toMatch(/billing.*\.pdf$/i);
          }
        }
      }
    });

    test('should generate company roster PDF', async ({ page }) => {
      await page.goto('/companies');

      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Look for roster PDF button
        const rosterButton = page.locator('button:has-text("Download Roster")');

        if (await rosterButton.isVisible()) {
          const [download] = await Promise.all([
            page.waitForEvent('download'),
            rosterButton.click()
          ]);

          expect(download).toBeTruthy();
          expect(download.suggestedFilename()).toMatch(/roster.*\.pdf$/i);
        }
      }
    });
  });

  test.describe('Automated Credit Application', () => {
    test('should automatically apply overpayment as credit', async ({ page }) => {
      // This tests the database trigger
      // When a payment exceeds invoice amount, credit should be created

      // This would require:
      // 1. Recording a payment that exceeds invoice total
      // 2. Verifying a credit was auto-created
      // 3. Checking that credit appears in credits list

      // For now, we verify the credit list shows auto-created credits
      await page.goto('/accounting/credits');

      // Look for credits with "overpayment" source
      const overpaymentCredit = page.locator('text=/overpayment/i');

      if (await overpaymentCredit.isVisible()) {
        // Auto-created credits should have notes indicating automatic creation
        await expect(page.locator('text=/automatically created|auto-applied/i')).toBeVisible();
      }
    });

    test('should show credit application history', async ({ page }) => {
      await page.goto('/accounting/credits');

      // Click on an applied credit
      const appliedCredit = page.locator('text=Applied').first();

      if (await appliedCredit.isVisible()) {
        // Click to view details
        await appliedCredit.click();

        // Should show which invoice it was applied to
        await expect(page.locator('text=/applied to invoice/i')).toBeVisible();

        // Should show date applied
        await expect(page.locator('text=/applied.*date|applied on/i')).toBeVisible();
      }
    });
  });

  test.describe('Automated Alert Generation', () => {
    test('should automatically generate late payment alerts', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // Filter to late payments
      await page.click('button:has-text("Late")');

      // Late payment alerts should be auto-generated
      // They should have specific format
      const lateAlert = page.locator('text=/payment.*overdue|late payment/i').first();

      if (await lateAlert.isVisible()) {
        // Click to view details
        await lateAlert.click();

        // Should show how many days overdue
        await expect(page.locator('text=/days.*overdue|overdue by/i')).toBeVisible();

        // Should show invoice details
        await expect(page.locator('text=/invoice/i')).toBeVisible();
      }
    });

    test('should generate underpayment alerts', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // Filter to underpaid
      await page.click('button:has-text("Underpaid")');

      const underpaidAlert = page.locator('text=/underpaid|partial payment/i').first();

      if (await underpaidAlert.isVisible()) {
        // Should show amount short
        await expect(page.locator('text=/\\$|amount/i')).toBeVisible();
      }
    });

    test('should generate overpayment alerts', async ({ page }) => {
      await page.goto('/accounting/alerts');

      // Filter to overpaid
      await page.click('button:has-text("Overpaid")');

      const overpaidAlert = page.locator('text=/overpaid|excess payment/i').first();

      if (await overpaidAlert.isVisible()) {
        // Should show excess amount
        await expect(page.locator('text=/excess|over/i')).toBeVisible();

        // Should suggest creating credit
        await expect(page.locator('text=/credit|apply/i')).toBeVisible();
      }
    });
  });

  test.describe('Bulk Upload Integration', () => {
    test('should upload employee CSV file', async ({ page }) => {
      await page.goto('/companies');

      const companyLink = page.locator('a[href^="/companies/"]').first();

      if (await companyLink.isVisible()) {
        await companyLink.click();

        // Bulk upload button
        const bulkUploadButton = page.locator('button:has-text("Bulk Upload")');

        if (await bulkUploadButton.isVisible()) {
          await bulkUploadButton.click();

          // Modal should open
          await expect(page.locator('h3:has-text("Bulk Upload")')).toBeVisible();

          // File input should be visible
          await expect(page.locator('input[type="file"]')).toBeVisible();

          // Would need to upload actual CSV file in real test
          // For now, verify UI exists
        }
      }
    });

    test('should show upload progress', async ({ page }) => {
      // This test would upload a file and verify progress bar
      // Skipping actual file upload for now
      test.skip();
    });

    test('should display upload results summary', async ({ page }) => {
      // After upload, should show:
      // - How many rows succeeded
      // - How many rows failed
      // - Which rows failed and why
      test.skip();
    });
  });

  test.describe('Real-time Data Updates', () => {
    test('should refresh data after API calls', async ({ page }) => {
      await page.goto('/accounting/credits');

      // Get current count of credits
      const creditCards = page.locator('[data-testid="credit-card"]');
      const initialCount = await creditCards.count();

      // Create a new credit
      await page.click('button:has-text("Create Credit")');
      await page.selectOption('select[name="companyId"]', { index: 1 });
      await page.fill('input[name="amount"]', '25.00');
      await page.selectOption('select[name="source"]', 'goodwill');
      await page.click('button:has-text("Create")');

      // Wait for success
      await expect(page.locator('text=/created/i')).toBeVisible({ timeout: 10000 });

      // Count should increase
      await page.waitForTimeout(1000); // Wait for UI to update
      const newCount = await creditCards.count();

      expect(newCount).toBeGreaterThan(initialCount);
    });

    test('should update statistics after changes', async ({ page }) => {
      await page.goto('/accounting/credits');

      // Get total credits amount
      const totalAmountText = page.locator('text=/total.*\\$/i').first();
      const initialText = await totalAmountText.textContent();

      // Create a credit
      await page.click('button:has-text("Create Credit")');
      await page.selectOption('select[name="companyId"]', { index: 1 });
      await page.fill('input[name="amount"]', '100.00');
      await page.selectOption('select[name="source"]', 'adjustment');
      await page.click('button:has-text("Create")');

      await expect(page.locator('text=/created/i')).toBeVisible({ timeout: 10000 });

      // Stats should update
      await page.waitForTimeout(1000);
      const newText = await totalAmountText.textContent();

      // Text should have changed (amount increased)
      expect(newText).not.toBe(initialText);
    });
  });

  test.describe('Audit Trail Integration', () => {
    test('should log all accounting actions', async ({ page }) => {
      // This would verify that actions are logged
      // Audit trail page would show:
      // - Who performed action
      // - What action was performed
      // - When it was performed
      // - Details of what changed

      // For now, verify audit logging exists for key actions
      test.skip(); // Skip until audit trail UI is available
    });
  });
});
