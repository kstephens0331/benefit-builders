# Testing Infrastructure

This document outlines the testing strategy and how to run tests for the Benefits Builder SaaS application.

## Testing Stack

- **Jest** - Unit and integration testing framework
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing
- **MSW** - API mocking for tests

## Test Commands

```bash
# Run all unit/integration tests
pnpm test

# Run tests in watch mode (during development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Debug E2E tests
pnpm test:e2e:debug

# Run all tests (unit + E2E)
pnpm test:all
```

## Test Structure

```
apps/web/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── */route.test.ts      # API route tests
│   ├── components/
│   │   └── *.test.tsx               # Component tests
│   └── lib/
│       └── *.test.ts                # Utility function tests
├── e2e/
│   ├── auth.spec.ts                 # Authentication E2E tests
│   ├── accounting.spec.ts           # Accounting workflow tests
│   ├── navigation.spec.ts           # Navigation and link tests
│   └── *.spec.ts                    # Other E2E tests
├── jest.config.js                   # Jest configuration
├── jest.setup.js                    # Jest setup and mocks
└── playwright.config.ts             # Playwright configuration
```

## Writing Tests

### API Route Tests

API route tests verify that your endpoints handle requests correctly:

```typescript
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /api/companies', () => {
  it('should return all companies', async () => {
    const request = new NextRequest('http://localhost:3002/api/companies');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});
```

### Component Tests

Component tests verify UI rendering and user interactions:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyCard from './CompanyCard';

describe('CompanyCard', () => {
  it('should render company name', () => {
    render(<CompanyCard name="Test Co" />);
    expect(screen.getByText('Test Co')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const onClick = jest.fn();
    render(<CompanyCard name="Test Co" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### E2E Tests

E2E tests verify complete user workflows across the application:

```typescript
import { test, expect } from '@playwright/test';

test('user can create invoice', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="text"]', 'testuser');
  await page.fill('input[type="password"]', 'testpass');
  await page.click('button[type="submit"]');

  // Navigate to accounting
  await page.goto('/accounting');

  // Create invoice
  await page.click('button:has-text("+ New Invoice")');
  await page.fill('input[name="invoice_number"]', 'INV-001');
  await page.click('button[type="submit"]');

  // Verify
  await expect(page.locator('text=INV-001')).toBeVisible();
});
```

## Test Coverage Goals

We aim for the following coverage thresholds:

- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%
- **Statements**: 100%

Run `pnpm test:coverage` to see current coverage.

## Critical Test Areas

### 1. API Routes (High Priority)
- ✅ `/api/accounting/ar` - A/R CRUD operations
- ✅ `/api/accounting/ap` - A/P CRUD operations
- ⏳ `/api/accounting/payments` - Payment recording
- ⏳ `/api/month-end/close` - Month-end process
- ⏳ `/api/bulk-upload` - Census file uploads
- ⏳ `/api/companies` - Company management

### 2. Components (Medium Priority)
- ⏳ `AccountingManager` - A/R & A/P interface
- ⏳ `CompanyDetailManager` - Company details
- ⏳ `MonthEndManager` - Month-end workflow
- ⏳ `BenefitsCalculator` - Tax calculations

### 3. E2E Workflows (High Priority)
- ✅ Authentication flow
- ✅ A/R invoice creation and payment
- ✅ Navigation and routing
- ⏳ Month-end closing process
- ⏳ Bulk upload workflow
- ⏳ QuickBooks sync

### 4. Utilities (Medium Priority)
- ⏳ `lib/fees.ts` - Fee calculations
- ⏳ `lib/section125.ts` - Benefit calculations
- ⏳ `lib/taxes.ts` - Tax calculations
- ⏳ `lib/pdf.ts` - PDF generation

## Mocking Strategy

### Supabase Database
All tests mock the Supabase client to avoid hitting the real database:

```typescript
jest.mock('@/lib/supabase', () => ({
  createServiceClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    // ... other methods
  })),
}));
```

### External APIs
Mock external services (QuickBooks, Gemini AI, email):

```typescript
jest.mock('node-quickbooks');
jest.mock('@google/generative-ai');
jest.mock('nodemailer');
```

### Next.js Router
Router is automatically mocked in `jest.setup.js`:

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

Configure in `.github/workflows/test.yml` (to be created).

## Troubleshooting

### Tests fail with "Cannot find module"
Make sure all dependencies are installed:
```bash
pnpm install
```

### E2E tests timeout
Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Database connection errors
Tests should never hit the real database. Check that mocks are properly configured in `jest.setup.js`.

### Flaky E2E tests
Add explicit waits:
```typescript
await page.waitForLoadState('networkidle');
await page.waitForSelector('text=Expected Text');
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what users see/do
2. **Keep tests isolated** - Each test should be independent
3. **Use descriptive test names** - "should create invoice when all fields are valid"
4. **Mock external dependencies** - Don't hit real APIs or databases
5. **Test error states** - Verify graceful error handling
6. **Maintain test data** - Use factories or fixtures for consistent test data

## Next Steps

- [ ] Add CI/CD pipeline for automated testing
- [ ] Increase test coverage to 80%+
- [ ] Add visual regression testing with Playwright
- [ ] Add performance testing for critical workflows
- [ ] Document test data setup process

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
