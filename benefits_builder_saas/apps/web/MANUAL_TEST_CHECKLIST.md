# Manual Testing Checklist

## Instructions
Use this checklist to manually verify all functionality in the application. Check off items as you complete them. Document any issues found in the "Issues Found" section at the bottom.

---

## 🏠 Accounting Dashboard (`/accounting`)

### Page Load
- [ ] Page loads without errors
- [ ] All sections visible (Alerts, Financial, Credits, Month-End, QuickBooks, Recent Alerts)
- [ ] No console errors in browser DevTools

### Payment Alerts Summary
- [ ] Late Payments count displays correctly
- [ ] Underpaid count displays correctly
- [ ] Overpaid count displays correctly
- [ ] Failed Charges count displays correctly
- [ ] Badge colors match severity (red for critical, yellow for warning, blue for info)

### Financial Summary
- [ ] A/R Total Outstanding displays
- [ ] A/R Overdue amount displays
- [ ] A/P Total displays
- [ ] A/P Overdue displays

### Customer Credits
- [ ] Total Credits Available displays
- [ ] Number of customers with credits shows
- [ ] Credits expiring soon count shows

### Month-End Status
- [ ] Current month displays correctly
- [ ] Status shows (Open/Closed/Ready to Close)
- [ ] Last closed month displays

### QuickBooks Sync
- [ ] Connection status shows (Connected/Not Connected)
- [ ] If connected: Company name displays
- [ ] If connected: Last sync time shows
- [ ] If connected: Realm ID displays

### Recent Alerts
- [ ] Shows 5 most recent alerts
- [ ] Alert type icons display correctly
- [ ] Company names display
- [ ] Invoice numbers display
- [ ] Severity badges show correct colors
- [ ] Alert messages are readable

### Navigation
- [ ] "View All Alerts" button navigates to `/accounting/alerts`
- [ ] "A/R & A/P Manager" button exists (destination TBD)

### Responsive Design
- [ ] Mobile (375px): All sections stack vertically
- [ ] Mobile: Buttons full width
- [ ] Tablet (768px): Grid adapts to 2 columns
- [ ] Desktop (1920px): Full grid layout with 4 columns

---

## 🚨 Payment Alerts (`/accounting/alerts`)

### Page Load
- [ ] Page loads without errors
- [ ] Header displays "Payment Alerts"
- [ ] Back to Dashboard button visible

### Statistics
- [ ] Total Alerts count correct
- [ ] Critical count correct
- [ ] Warning count correct
- [ ] Info count correct

### Status Filters
- [ ] "All" tab shows all alerts
- [ ] "Active" tab filters to active alerts only
- [ ] "Acknowledged" tab filters correctly
- [ ] "Resolved" tab filters correctly
- [ ] Active tab is highlighted

### Type Filters
- [ ] "All Types" shows all alerts
- [ ] "Late" filters to late payment alerts
- [ ] "Underpaid" filters correctly
- [ ] "Overpaid" filters correctly
- [ ] "Failed" filters to failed charge alerts
- [ ] Active tab is highlighted

### Alert List
- [ ] All alerts display with correct information
- [ ] Company names are correct
- [ ] Invoice numbers link to invoice detail (if implemented)
- [ ] Alert type icons match alert type
- [ ] Severity badges match severity level
- [ ] Alert messages are clear
- [ ] Invoice totals display correctly
- [ ] Amount paid displays correctly
- [ ] Amount due displays correctly
- [ ] Created date displays in readable format

### Alert Actions
- [ ] "Send Reminder" button opens reminder modal
- [ ] "Acknowledge" button marks alert as acknowledged
- [ ] "Resolve" button marks alert as resolved
- [ ] Actions update alert status immediately
- [ ] Filters update after status change

### Send Reminder Modal
- [ ] Modal opens when clicking "Send Reminder"
- [ ] Shows invoice details
- [ ] Shows recipient email
- [ ] Gentle/Firm/Final reminder type selector works
- [ ] Preview of email shows
- [ ] "Send" button sends reminder
- [ ] Success message displays after sending
- [ ] Modal closes after success
- [ ] "Cancel" button closes modal without sending

### Responsive Design
- [ ] Mobile: Filter tabs wrap properly
- [ ] Mobile: Alert cards stack vertically
- [ ] Mobile: Action buttons stack in column
- [ ] Tablet: Proper spacing maintained
- [ ] Desktop: Full layout with adequate whitespace

---

## 💰 Credits Management (`/accounting/credits`)

### Page Load
- [ ] Page loads without errors
- [ ] Header displays "Credits Management"
- [ ] Back to Dashboard button visible
- [ ] Create Credit button visible

### Statistics
- [ ] Total Credits count correct
- [ ] Total amount correct
- [ ] Available credits count correct
- [ ] Available amount correct
- [ ] Applied credits count correct
- [ ] Applied amount correct
- [ ] Expired credits count correct

### Status Filters
- [ ] "All" shows all credits
- [ ] "Available" filters to available credits only
- [ ] "Applied" filters to applied credits
- [ ] "Expired" filters to expired credits
- [ ] Active tab is highlighted

### Credits List
- [ ] All credits display with correct info
- [ ] Company names correct
- [ ] Credit amounts correct
- [ ] Source type displays (Overpayment/Refund/Adjustment/Goodwill)
- [ ] Status badge correct (Available/Applied/Expired)
- [ ] Created date displays
- [ ] Expiration date displays
- [ ] Applied date displays (if applied)
- [ ] Applied to invoice shows (if applied)
- [ ] Notes display if present

### Create Credit
- [ ] "Create Credit" button opens modal
- [ ] Modal shows "Create Credit" title
- [ ] Company selector works
- [ ] Amount input validates (positive number only)
- [ ] Source dropdown has all options
- [ ] Notes textarea allows input
- [ ] Expiration date defaults to 1 year from now
- [ ] Can change expiration date
- [ ] "Create" button validates form
- [ ] Success message after creation
- [ ] Modal closes after success
- [ ] Credits list refreshes with new credit
- [ ] "Cancel" button closes modal without saving

### Apply Credit
- [ ] "Apply" button only shows for available credits
- [ ] Opens apply credit modal
- [ ] Shows credit details
- [ ] Invoice selector shows unpaid invoices for company
- [ ] Amount to apply defaults to credit amount
- [ ] Can change amount to apply (up to credit amount)
- [ ] Validates amount doesn't exceed credit or invoice balance
- [ ] "Apply" button applies credit
- [ ] Success message displays
- [ ] Credit status updates to "Applied"
- [ ] Invoice payment updates
- [ ] Modal closes after success

### Delete Credit
- [ ] "Delete" button only shows for unused credits
- [ ] Confirmation prompt shows
- [ ] Confirming deletes the credit
- [ ] Credit removed from list
- [ ] Cannot delete applied credits

### Responsive Design
- [ ] Mobile: Stats cards stack vertically
- [ ] Mobile: Filter tabs wrap
- [ ] Mobile: Credit cards full width
- [ ] Mobile: Action buttons stack
- [ ] Tablet: 2-column grid for stats
- [ ] Desktop: 4-column grid for stats

---

## 📅 Month-End Closing (`/accounting/month-end`)

### Page Load
- [ ] Page loads without errors
- [ ] Header displays "Month-End Closing"
- [ ] Back to Dashboard button visible

### Current Month Section
- [ ] Current month displays (e.g., "November 2024")
- [ ] Status shows (Open/Ready to Close/Critical Issues)
- [ ] Status badge color matches status
- [ ] Summary stats display (invoices, payments, alerts)

### Validation
- [ ] "Run Validation" button visible for open months
- [ ] Clicking runs 12-check validation
- [ ] Loading state shows during validation
- [ ] Validation results display after completion
- [ ] Shows all 12 checks:
  1. No missing invoices
  2. All invoices have valid amounts
  3. No unreconciled payments
  4. All credits properly applied
  5. No duplicate invoice numbers
  6. All customer balances correct
  7. QuickBooks sync up to date
  8. No active critical alerts
  9. All recurring invoices generated
  10. Bank reconciliation complete
  11. All refunds processed
  12. Audit trail complete
- [ ] Each check shows status (Pass/Fail/Warning)
- [ ] Critical issues highlighted in red
- [ ] Important issues in yellow
- [ ] Recommendations in blue
- [ ] Issue details expand on click

### Close Month
- [ ] "Close Month" button only enabled if no critical issues
- [ ] Opens confirmation modal
- [ ] Modal shows month/year to close
- [ ] Requires typing confirmation text (e.g., "CLOSE NOVEMBER 2024")
- [ ] Case-sensitive validation
- [ ] Cannot close until text matches exactly
- [ ] "Close" button closes the month
- [ ] Success message displays
- [ ] Month moves to Closed Months section
- [ ] Confirmation text input clears on success

### Closed Months Section
- [ ] All closed months display in reverse chronological order
- [ ] Shows month/year
- [ ] Shows closed date
- [ ] Shows closed by user (if available)
- [ ] Shows validation summary (X/12 checks passed)
- [ ] Can expand to see full validation details

### Reopen Month (if implemented)
- [ ] "Reopen" button shows for closed months
- [ ] Requires confirmation
- [ ] Requires reason/approval
- [ ] Reopens month after confirmation
- [ ] Audit log records reopening

### Responsive Design
- [ ] Mobile: Sections stack vertically
- [ ] Mobile: Validation checks full width
- [ ] Mobile: Buttons full width
- [ ] Tablet: Proper spacing
- [ ] Desktop: Comfortable reading layout

---

## 🔄 Recurring Invoices (`/recurring-invoices`)

### Page Load
- [ ] Page loads without errors
- [ ] Header displays "Recurring Invoices"
- [ ] Back to Dashboard button visible
- [ ] Create Template button visible

### Statistics
- [ ] Total Templates count correct
- [ ] Active templates count correct
- [ ] Paused templates count correct
- [ ] Total monthly revenue projection shows

### Status Filters
- [ ] "All" shows all templates
- [ ] "Active" filters to active only
- [ ] "Paused" filters to paused only
- [ ] Active tab is highlighted

### Templates List
- [ ] All templates display
- [ ] Company names correct
- [ ] Description shows
- [ ] Amount displays correctly
- [ ] Frequency shows (Monthly/Quarterly/Annually)
- [ ] Next generation date displays
- [ ] Last generated date shows (if applicable)
- [ ] Status badge correct (Active/Paused)
- [ ] Auto-send indicator shows
- [ ] Auto-charge indicator shows

### Create Template
- [ ] "Create Template" button opens modal
- [ ] Modal shows "Create Recurring Invoice Template"
- [ ] Company selector works
- [ ] Description input works
- [ ] Amount validates (positive number)
- [ ] Frequency dropdown works (Monthly/Quarterly/Annually)
- [ ] Start date picker works
- [ ] Day of month selector works (1-28)
- [ ] Auto-send toggle works
- [ ] Auto-charge toggle works
- [ ] Line items can be added
- [ ] Line items can be removed
- [ ] Notes textarea works
- [ ] "Create" button validates form
- [ ] Success message after creation
- [ ] Templates list refreshes
- [ ] Modal closes after success
- [ ] "Cancel" closes without saving

### Edit Template
- [ ] Clicking template opens edit modal
- [ ] All fields populate with existing data
- [ ] Can modify all fields
- [ ] "Save" button updates template
- [ ] Success message displays
- [ ] List refreshes with updated data
- [ ] Modal closes after success

### Pause/Resume Template
- [ ] "Pause" button shows for active templates
- [ ] Confirmation prompt shows
- [ ] Pausing stops future generation
- [ ] Status updates to "Paused"
- [ ] "Resume" button shows for paused templates
- [ ] Resuming reactivates template
- [ ] Status updates to "Active"

### Delete Template
- [ ] "Delete" button shows for all templates
- [ ] Confirmation prompt shows
- [ ] Warns about stopping recurring billing
- [ ] Confirming deletes template
- [ ] Template removed from list

### Manual Generation
- [ ] "Generate Now" button shows for active templates
- [ ] Confirmation prompt shows
- [ ] Generates invoice immediately
- [ ] Success message shows with invoice number
- [ ] Link to view generated invoice
- [ ] Last generated date updates

### Responsive Design
- [ ] Mobile: Stats stack vertically
- [ ] Mobile: Filter tabs wrap
- [ ] Mobile: Template cards full width
- [ ] Mobile: Action buttons stack
- [ ] Tablet: 2-column stats
- [ ] Desktop: Full layout

---

## 🏦 Bank Reconciliation (`/accounting/bank-reconciliation`)

### Page Load
- [ ] Page loads without errors
- [ ] Header displays "Bank Reconciliation"
- [ ] Back to Dashboard button visible
- [ ] New Reconciliation button visible

### Statistics
- [ ] Total Reconciliations count correct
- [ ] In Progress count correct
- [ ] Completed count correct
- [ ] Total discrepancies amount shows

### Status Filters
- [ ] "All" shows all reconciliations
- [ ] "In Progress" filters correctly
- [ ] "Completed" filters correctly
- [ ] Active tab is highlighted

### Reconciliations List
- [ ] All reconciliations display
- [ ] Month/Year shows correctly
- [ ] Bank account name displays
- [ ] Statement balance displays
- [ ] Book balance displays
- [ ] Difference shows (should be $0 when complete)
- [ ] Status badge correct (In Progress/Completed)
- [ ] Reconciled date shows (if complete)
- [ ] Reconciled by user shows (if available)

### Create Reconciliation
- [ ] "New Reconciliation" button opens modal
- [ ] Modal shows "Create Bank Reconciliation"
- [ ] Month/Year picker works
- [ ] Bank account selector works
- [ ] Statement beginning balance input validates
- [ ] Statement ending balance input validates
- [ ] Statement date picker works
- [ ] "Create" button validates form
- [ ] Success message after creation
- [ ] List refreshes with new reconciliation
- [ ] Modal closes after success
- [ ] "Cancel" closes without saving

### View/Edit Reconciliation
- [ ] Clicking reconciliation opens detail modal
- [ ] Shows all reconciliation details
- [ ] Shows beginning balance
- [ ] Shows ending balance
- [ ] Shows calculated difference
- [ ] Lists all transactions for the period
- [ ] Can mark transactions as cleared
- [ ] Cleared transactions update balance
- [ ] Difference calculation updates in real-time
- [ ] Notes textarea works
- [ ] Can add reconciliation notes

### Complete Reconciliation
- [ ] "Complete" button enabled when difference is $0
- [ ] "Complete" button disabled if difference != $0
- [ ] Confirmation prompt shows
- [ ] Completing locks the reconciliation
- [ ] Status updates to "Completed"
- [ ] Reconciled date records
- [ ] Cannot edit after completion

### Discrepancy Handling
- [ ] If difference != $0, shows warning
- [ ] Shows how much off by
- [ ] Suggests possible causes
- [ ] Can add adjustment entry
- [ ] Adjustment entry explanation required
- [ ] Adjustment brings difference to $0

### Responsive Design
- [ ] Mobile: Stats stack vertically
- [ ] Mobile: Filter tabs wrap
- [ ] Mobile: Reconciliation cards full width
- [ ] Mobile: Transaction list scrollable
- [ ] Tablet: Proper spacing
- [ ] Desktop: Full layout with comfortable reading

---

## 👥 Companies & Employees

### Companies List
- [ ] All companies display
- [ ] Company names correct
- [ ] Employee counts correct
- [ ] Active status shows
- [ ] "Add Company" button works

### Company Detail
- [ ] Company info displays correctly
- [ ] Can edit company details
- [ ] Employee roster shows
- [ ] Can add employee
- [ ] Can edit employee inline
- [ ] Can remove employee
- [ ] Bulk upload button shows

### Employee Inline Editing
- [ ] Click on field to edit
- [ ] Changes save on blur or Enter
- [ ] Validation works (SSN format, etc.)
- [ ] Error messages clear
- [ ] Success indicator shows

### Bulk Upload
- [ ] Upload button opens modal
- [ ] Can drag/drop CSV or Excel
- [ ] Can click to select file
- [ ] Shows file name after selection
- [ ] "Upload" button processes file
- [ ] Shows progress bar
- [ ] Shows success/error summary
- [ ] Shows which rows succeeded
- [ ] Shows which rows failed with reasons
- [ ] Can download error report
- [ ] Modal closes after review

---

## 📄 Invoices

### Invoice List (if exists)
- [ ] All invoices display
- [ ] Invoice numbers correct
- [ ] Company names correct
- [ ] Amounts display correctly
- [ ] Status badges correct (Draft/Sent/Paid/Overdue/Void)
- [ ] Due dates display
- [ ] Can filter by status
- [ ] Can search by invoice number or company

### Invoice Detail
- [ ] Invoice displays in readable format
- [ ] Company info correct
- [ ] Line items display
- [ ] Subtotal, tax, total correct
- [ ] Payment history shows
- [ ] Applied credits show
- [ ] Balance due correct
- [ ] Due date displays
- [ ] Status displays

### Invoice Actions
- [ ] "Send Invoice" button works
- [ ] Email modal shows recipient
- [ ] Can customize email message
- [ ] Sends email successfully
- [ ] "Record Payment" button works
- [ ] Payment modal allows entering amount, date, method
- [ ] Recording payment updates balance
- [ ] "Download PDF" generates PDF
- [ ] "Void Invoice" requires confirmation
- [ ] Voiding marks invoice as void

---

## 🔗 QuickBooks Integration

### Connection
- [ ] "Connect to QuickBooks" button visible if not connected
- [ ] Clicking opens QB OAuth flow
- [ ] OAuth flow completes successfully
- [ ] Returns to app after authorization
- [ ] Connection status updates to "Connected"
- [ ] Company name displays
- [ ] Realm ID displays

### Sync Status
- [ ] Last sync time displays
- [ ] "Sync Now" button triggers sync
- [ ] Loading indicator during sync
- [ ] Success message after sync
- [ ] Error message if sync fails
- [ ] Sync history displays (if implemented)

### Disconnect
- [ ] "Disconnect" button shows when connected
- [ ] Confirmation prompt shows
- [ ] Warns about stopping sync
- [ ] Confirming disconnects
- [ ] Connection status updates

---

## 📧 Email Notifications

### Payment Reminders
- [ ] Can send gentle reminder (1-30 days late)
- [ ] Can send firm reminder (31-60 days late)
- [ ] Can send final notice (60+ days late)
- [ ] Email preview shows before sending
- [ ] Recipient email shows
- [ ] Can customize message
- [ ] Sending shows success message
- [ ] Email ID recorded in database

### Invoice Delivery
- [ ] New invoice email sent when creating invoice
- [ ] Payment receipt email sent when recording payment
- [ ] Credit applied email sent when credit applied (if implemented)

---

## 📱 Mobile Responsiveness Testing

### Viewports to Test
- [ ] **iPhone SE** (375x667) - Smallest modern phone
- [ ] **iPhone 12/13/14** (390x844) - Standard iPhone
- [ ] **iPhone 14 Pro Max** (430x932) - Large iPhone
- [ ] **Samsung Galaxy S20** (360x800) - Standard Android
- [ ] **iPad Mini** (768x1024) - Small tablet
- [ ] **iPad Pro** (1024x1366) - Large tablet

### What to Check at Each Size
- [ ] All text readable (not too small)
- [ ] Buttons tappable (not too small, not overlapping)
- [ ] Forms usable (inputs not cut off)
- [ ] Tables/lists scrollable if needed
- [ ] Modals fit on screen
- [ ] Navigation accessible
- [ ] No horizontal scrolling (unless intended)
- [ ] Images scale appropriately

---

## ♿ Accessibility Testing

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] Can activate buttons with Enter/Space
- [ ] Can close modals with Escape
- [ ] Can navigate dropdowns with arrow keys

### Screen Reader (NVDA/JAWS/VoiceOver)
- [ ] All images have alt text
- [ ] Form labels associated with inputs
- [ ] Error messages announced
- [ ] Success messages announced
- [ ] Modal titles announced
- [ ] Buttons have descriptive labels
- [ ] Links have descriptive text

### Visual
- [ ] Sufficient color contrast (WCAG AA minimum)
- [ ] Color not sole indicator of meaning
- [ ] Text scalable to 200% without breaking layout
- [ ] Content reflows on small screens

---

## 🌐 Browser Compatibility

### Desktop Browsers
- [ ] **Chrome** (latest) - All features work
- [ ] **Firefox** (latest) - All features work
- [ ] **Safari** (latest) - All features work
- [ ] **Edge** (latest) - All features work

### Mobile Browsers
- [ ] **Safari on iOS** - All features work
- [ ] **Chrome on Android** - All features work
- [ ] **Firefox on Android** - All features work

### What to Check
- [ ] All pages load
- [ ] All forms submit
- [ ] All modals open/close
- [ ] All navigation works
- [ ] Date pickers work
- [ ] File uploads work
- [ ] PDFs download
- [ ] Emails send

---

## 🐛 Issues Found

### Critical Issues
*(Issues that prevent core functionality)*

1.

### High Priority Issues
*(Issues that impact user experience significantly)*

1.

### Medium Priority Issues
*(Issues that are noticeable but have workarounds)*

1.

### Low Priority Issues
*(Minor visual or UX improvements)*

1.

### Nice to Have
*(Enhancement ideas, not bugs)*

1.

---

## ✅ Testing Summary

**Date Tested:** ___________
**Tested By:** ___________
**Total Items Checked:** ___ / ___
**Pass Rate:** ____%

**Critical Issues Found:** ___
**High Priority Issues Found:** ___
**Medium Priority Issues Found:** ___
**Low Priority Issues Found:** ___

**Overall Status:** ⬜ Pass | ⬜ Pass with Issues | ⬜ Fail

**Notes:**
