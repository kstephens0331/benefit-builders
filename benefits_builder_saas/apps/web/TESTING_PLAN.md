# Comprehensive Testing Plan

## Overview
This document outlines the complete testing strategy for the Benefits Builder SaaS application, covering all accounting features, navigation, forms, CRUD operations, and responsive design.

## Testing Infrastructure

### Tools
- **Jest**: Unit and integration tests
- **Playwright**: End-to-end (E2E) browser testing
- **React Testing Library**: Component testing
- **MSW**: API mocking

### Test Commands
```bash
# Run Jest unit/integration tests
pnpm test

# Run Jest with coverage
pnpm test:coverage

# Run Jest in watch mode
pnpm test:watch

# Run Playwright E2E tests
pnpm test:e2e

# Run Playwright with UI
pnpm test:e2e:ui

# Run Playwright in debug mode
pnpm test:e2e:debug

# Run all tests
pnpm test:all
```

## E2E Test Suite Coverage

### ✅ Completed E2E Tests

#### 1. Accounting Dashboard (`e2e/accounting-dashboard.spec.ts`)
**Tests:**
- Page load and title verification
- Alert summary section visibility
- Financial summary section (A/R and A/P)
- Customer credits section
- Month-end status section
- QuickBooks sync section
- Recent alerts section
- Navigation to alerts page
- Responsive design (mobile, tablet, desktop)

**Viewports Tested:**
- Mobile: 375x667px (iPhone SE)
- Tablet: 768x1024px (iPad)
- Desktop: 1920x1080px

#### 2. Payment Alerts Manager (`e2e/payment-alerts.spec.ts`)
**Tests:**
- Page load and header verification
- Back to dashboard navigation
- Alert statistics display
- Status filter tabs (All, Active, Acknowledged, Resolved)
- Type filter tabs (All Types, Late, Underpaid, Overpaid)
- Filter interactions and tab highlighting
- Responsive design at all breakpoints

#### 3. Credits Management (`e2e/credits-management.spec.ts`)
**Tests:**
- Page load and header verification
- Back to dashboard navigation
- Create credit button visibility
- Credit statistics display
- Filter tabs (All, Available, Applied, Expired)
- Filter interactions
- Create credit modal open/close
- Responsive design at all breakpoints

#### 4. Month-End Closing (`e2e/month-end-closing.spec.ts`)
**Tests:**
- Page load and header verification
- Back to dashboard navigation
- Current month section display
- Closed months section display
- Run validation button visibility
- Responsive design at all breakpoints

#### 5. Recurring Invoices (`e2e/recurring-invoices.spec.ts`)
**Tests:**
- Page load and header verification
- Back to dashboard navigation
- Create template button visibility
- Template statistics display
- Filter tabs (All, Active, Paused)
- Filter interactions
- Create template modal open/close
- Responsive design at all breakpoints

#### 6. Bank Reconciliation (`e2e/bank-reconciliation.spec.ts`)
**Tests:**
- Page load and header verification
- Back to dashboard navigation
- New reconciliation button visibility
- Reconciliation statistics display
- Filter tabs (All, In Progress, Completed)
- Filter interactions
- Create reconciliation modal open/close
- Responsive design at all breakpoints

## Test Coverage by Category

### 🔗 Navigation & Routing
**Status:** ✅ Covered in E2E tests

**What's Tested:**
- ✅ Dashboard to Alerts navigation
- ✅ Alerts to Dashboard back navigation
- ✅ Credits to Dashboard back navigation
- ✅ Month-End to Dashboard back navigation
- ✅ Recurring Invoices to Dashboard back navigation
- ✅ Bank Reconciliation to Dashboard back navigation

**Still Need to Test:**
- ⏳ Direct URL access to all pages
- ⏳ Browser back/forward navigation
- ⏳ 404 page for invalid routes
- ⏳ Company detail page navigation
- ⏳ Employee detail page navigation
- ⏳ Invoice detail page navigation

### 📝 Forms & Data Submission
**Status:** ⏳ Partially Covered

**What's Tested:**
- ✅ Modal open/close interactions
- ✅ Cancel button functionality

**Still Need to Test:**
- ⏳ Create credit form submission
- ⏳ Create recurring invoice template submission
- ⏳ Create bank reconciliation submission
- ⏳ Send payment reminder form
- ⏳ Apply credit to invoice form
- ⏳ Month-end validation form
- ⏳ Month-end closing confirmation form
- ⏳ Form validation and error messages
- ⏳ Required field validation
- ⏳ Invalid input handling
- ⏳ Success messages after submission

### 🗄️ CRUD Operations
**Status:** ⏳ Not Started

**Entities to Test:**

#### Companies
- ⏳ Create new company
- ⏳ Read company details
- ⏳ Update company information
- ⏳ Delete company (if allowed)

#### Employees
- ⏳ Add employee to company
- ⏳ View employee details
- ⏳ Update employee information
- ⏳ Remove employee from company
- ⏳ Bulk upload employees (CSV/Excel)

#### Invoices
- ⏳ Create new invoice
- ⏳ View invoice details
- ⏳ Update invoice line items
- ⏳ Void invoice
- ⏳ Send invoice via email
- ⏳ Record payment on invoice
- ⏳ Download invoice PDF

#### Payment Alerts
- ⏳ View alert details
- ⏳ Acknowledge alert
- ⏳ Resolve alert
- ⏳ Delete alert
- ⏳ Send payment reminder

#### Credits
- ⏳ Create credit from overpayment
- ⏳ Create credit from refund
- ⏳ Create credit from adjustment
- ⏳ Create credit from goodwill
- ⏳ View credit details
- ⏳ Apply credit to invoice (manual)
- ⏳ Delete unused credit

#### Recurring Invoice Templates
- ⏳ Create template
- ⏳ View template details
- ⏳ Update template
- ⏳ Pause template
- ⏳ Resume template
- ⏳ Delete template
- ⏳ Manually generate invoice from template

#### Bank Reconciliations
- ⏳ Create reconciliation
- ⏳ View reconciliation details
- ⏳ Update reconciliation amounts
- ⏳ Mark as complete
- ⏳ Add notes/discrepancies

#### Month-End Closing
- ⏳ Run validation
- ⏳ View validation results
- ⏳ Close month with confirmation
- ⏳ View closed month history

### 🚨 Error Handling & Edge Cases
**Status:** ⏳ Not Started

**What Needs Testing:**

#### API Errors
- ⏳ Network timeout
- ⏳ 500 Internal Server Error
- ⏳ 401 Unauthorized
- ⏳ 403 Forbidden
- ⏳ 404 Not Found
- ⏳ 422 Validation Error

#### Business Logic Errors
- ⏳ Cannot close month with critical issues
- ⏳ Cannot apply credit to paid invoice
- ⏳ Cannot delete applied credit
- ⏳ Cannot modify closed month transactions
- ⏳ Duplicate invoice number prevention
- ⏳ Negative amount validation
- ⏳ Date validation (cannot be in future)

#### User Input Edge Cases
- ⏳ Very long company names (>255 chars)
- ⏳ Special characters in names
- ⏳ Empty required fields
- ⏳ Invalid email formats
- ⏳ Invalid phone numbers
- ⏳ Invalid dollar amounts
- ⏳ Invalid dates

#### Loading States
- ⏳ Skeleton loaders display correctly
- ⏳ Spinner displays during API calls
- ⏳ Disabled state on buttons during submission
- ⏳ Error boundaries catch component errors

### 📱 Mobile Responsiveness
**Status:** ✅ Covered in E2E tests

**What's Tested:**
- ✅ All accounting pages at 375px (mobile)
- ✅ All accounting pages at 768px (tablet)
- ✅ All accounting pages at 1920px (desktop)
- ✅ Header layouts responsive
- ✅ Button groups stack properly
- ✅ Filter tabs wrap correctly
- ✅ Grid layouts adapt to screen size
- ✅ Text sizes scale appropriately

**Viewports Tested:**
- ✅ iPhone SE (375x667)
- ✅ iPad (768x1024)
- ✅ Desktop (1920x1080)
- ⏳ Pixel 5 (via Playwright projects)
- ⏳ iPhone 12 (via Playwright projects)

### 🔒 Authentication & Authorization
**Status:** ⏳ Not Started

**What Needs Testing:**
- ⏳ Login flow
- ⏳ Logout flow
- ⏳ Session expiration
- ⏳ Protected routes redirect to login
- ⏳ Role-based access control (if implemented)
- ⏳ Supabase RLS policies

### 🔗 QuickBooks Integration
**Status:** ⏳ Not Started

**What Needs Testing:**
- ⏳ OAuth connection flow
- ⏳ Disconnection flow
- ⏳ Token refresh
- ⏳ Sync status display
- ⏳ Manual sync trigger
- ⏳ Error handling for QB API failures

### 📧 Email Functionality
**Status:** ⏳ Not Started

**What Needs Testing:**
- ⏳ Payment reminder emails sent (gentle, firm, final)
- ⏳ Invoice delivery emails
- ⏳ Receipt confirmation emails
- ⏳ Email tracking (ID stored in database)
- ⏳ Email delivery status

## Running the E2E Test Suite

### Prerequisites
1. Ensure the development server is running on port 3002
2. Ensure Supabase is configured and accessible
3. Playwright browsers installed (`pnpm exec playwright install`)

### Run All E2E Tests
```bash
# Start dev server (in one terminal)
cd benefits_builder_saas/apps/web
pnpm dev

# Run tests (in another terminal)
pnpm test:e2e
```

### Run Specific Test File
```bash
pnpm test:e2e e2e/accounting-dashboard.spec.ts
```

### Run with UI Mode (Interactive)
```bash
pnpm test:e2e:ui
```

### Debug Mode
```bash
pnpm test:e2e:debug
```

### Run on Specific Browser
```bash
# Chromium only
pnpm exec playwright test --project=chromium

# Mobile Chrome
pnpm exec playwright test --project="Mobile Chrome"

# Mobile Safari
pnpm exec playwright test --project="Mobile Safari"
```

## Test Results & Reporting

### Where to Find Results
- **Jest Coverage Report**: `coverage/lcov-report/index.html`
- **Playwright HTML Report**: `playwright-report/index.html`
- **Console Output**: Real-time test results

### Expected Coverage Thresholds
Based on `jest.config.cjs`:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Next Steps

### Priority 1: Complete Form Testing
1. Test all form submissions end-to-end
2. Test validation for required fields
3. Test error message display
4. Test success message display

### Priority 2: Complete CRUD Testing
1. Companies CRUD
2. Employees CRUD (including bulk upload)
3. Invoices CRUD
4. Payment Alerts CRUD
5. Credits CRUD
6. Recurring Templates CRUD
7. Bank Reconciliation CRUD
8. Month-End CRUD

### Priority 3: Error Handling
1. Test all API error responses
2. Test business logic validation
3. Test edge cases and boundary conditions

### Priority 4: Integration Testing
1. QuickBooks OAuth flow
2. Email sending and tracking
3. Payment processing (when implemented)
4. Automated credit application
5. Automated alert generation

### Priority 5: Performance Testing
1. Page load times
2. Large dataset handling (100+ companies, 1000+ invoices)
3. Concurrent user testing
4. API response times

## Manual Testing Checklist

While E2E tests cover most functionality, some areas benefit from manual verification:

### Visual Testing
- [ ] Check for visual regressions
- [ ] Verify color contrast for accessibility
- [ ] Test dark mode (if implemented)
- [ ] Verify print stylesheets (for PDFs)

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] Color is not the only indicator

### User Experience
- [ ] Loading states feel responsive
- [ ] Error messages are clear and helpful
- [ ] Success messages are encouraging
- [ ] Navigation is intuitive
- [ ] Forms are easy to complete

## Continuous Integration

### Recommended CI Pipeline
1. **On Pull Request:**
   - Run Jest unit tests
   - Run ESLint
   - Run TypeScript type checking
   - Check for security vulnerabilities

2. **On Merge to Main:**
   - Run Jest with coverage
   - Run Playwright E2E tests (Chromium only for speed)
   - Deploy to staging

3. **Nightly:**
   - Run full Playwright suite (all browsers + mobile)
   - Generate and archive coverage reports
   - Run performance benchmarks

## Test Maintenance

### When to Update Tests
- When adding new features
- When changing existing behavior
- When fixing bugs (add regression test)
- When refactoring components

### Best Practices
- Keep tests independent and isolated
- Use descriptive test names
- Avoid testing implementation details
- Focus on user behavior
- Mock external dependencies
- Clean up test data after each test

---

**Last Updated:** 2024-11-26
**Test Suite Version:** 1.0
**Total E2E Tests:** 90+ (across 6 spec files)
