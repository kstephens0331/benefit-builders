/**
 * Tests for QuickBooks Integration Library
 * OAuth, API calls, and data synchronization
 */

// Set environment variables BEFORE importing the module
process.env.QB_CLIENT_ID = 'test-client-id';
process.env.QB_CLIENT_SECRET = 'test-client-secret';
process.env.QB_REDIRECT_URI = 'http://localhost:3000/api/accounting/quickbooks/callback';
process.env.QB_ENVIRONMENT = 'sandbox';

import {
  refreshQBToken,
  ensureValidToken,
  syncCustomerToQB,
  createInvoiceInQB,
  getInvoiceFromQB,
  recordPaymentInQB,
  getQBCompanyInfo,
  getAllCustomersFromQB,
  getAllInvoicesFromQB,
  getAllPaymentsFromQB,
  searchCustomersInQB,
  getQBAuthUrl,
  getQBTokensFromCode,
} from './quickbooks';

// Create mock functions for QBO instance methods at the top level
const mockGetCustomer = jest.fn();
const mockUpdateCustomer = jest.fn();
const mockCreateCustomer = jest.fn();
const mockCreateInvoice = jest.fn();
const mockGetInvoice = jest.fn();
const mockCreatePayment = jest.fn();
const mockGetCompanyInfo = jest.fn();
const mockFindCustomers = jest.fn();
const mockReportBalanceSheet = jest.fn();
const mockQuery = jest.fn();

// Mock static methods at the top level
const mockAuthorizeUrl = jest.fn();
const mockCreateToken = jest.fn();
const mockRefreshAccessToken = jest.fn();

// Mock the node-quickbooks module
jest.mock('node-quickbooks', () => {
  // Constructor mock that returns the same mock functions
  const QuickBooksMock = jest.fn().mockImplementation(() => {
    // Return a plain object (will be populated by test setup)
    return {
      getCustomer: (...args: any[]) => mockGetCustomer(...args),
      updateCustomer: (...args: any[]) => mockUpdateCustomer(...args),
      createCustomer: (...args: any[]) => mockCreateCustomer(...args),
      createInvoice: (...args: any[]) => mockCreateInvoice(...args),
      getInvoice: (...args: any[]) => mockGetInvoice(...args),
      createPayment: (...args: any[]) => mockCreatePayment(...args),
      getCompanyInfo: (...args: any[]) => mockGetCompanyInfo(...args),
      findCustomers: (...args: any[]) => mockFindCustomers(...args),
      reportBalanceSheet: (...args: any[]) => mockReportBalanceSheet(...args),
      query: (...args: any[]) => mockQuery(...args),
    };
  });

  // Attach static methods using inline mock implementations
  QuickBooksMock.authorizeUrl = (...args: any[]) => mockAuthorizeUrl(...args);
  QuickBooksMock.createToken = (...args: any[]) => mockCreateToken(...args);
  QuickBooksMock.refreshAccessToken = (...args: any[]) => mockRefreshAccessToken(...args);

  return QuickBooksMock;
});

describe('QuickBooks Integration Library', () => {
  const mockTokens = {
    realmId: 'test-realm-123',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    accessTokenExpiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    refreshTokenExpiry: new Date(Date.now() + 8726400000).toISOString(), // 100 days from now
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQBAuthUrl', () => {
    it('should generate OAuth URL using QuickBooks.authorizeUrl', () => {
      mockAuthorizeUrl.mockReturnValue('https://appcenter.intuit.com/connect/oauth2?client_id=test');

      const url = getQBAuthUrl();

      // The function calls QuickBooks.authorizeUrl with environment variables
      // In test environment, these may be empty strings or the test values
      expect(mockAuthorizeUrl).toHaveBeenCalledWith(
        expect.any(String), // QB_CLIENT_ID
        expect.any(String), // QB_REDIRECT_URI
        'offline_access openid profile email phone address'
      );
      expect(url).toContain('https://appcenter.intuit.com/connect/oauth2');
    });
  });

  describe('getQBTokensFromCode', () => {
    const mockTokenResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
      x_refresh_token_expires_in: 8726400,
    };

    it('should exchange auth code for tokens', async () => {
      mockCreateToken.mockImplementation((clientId, clientSecret, authCode, redirectUri, callback) => {
        callback(null, mockTokenResponse);
      });

      const result = await getQBTokensFromCode('auth-code-123', 'realm-456');

      expect(result).not.toBeNull();
      expect(result?.realmId).toBe('realm-456');
      expect(result?.accessToken).toBe('new-access-token');
      expect(result?.refreshToken).toBe('new-refresh-token');
      // The function calls QuickBooks.createToken with environment variables
      // In test environment, these may be empty strings or the test values
      expect(mockCreateToken).toHaveBeenCalledWith(
        expect.any(String), // QB_CLIENT_ID
        expect.any(String), // QB_CLIENT_SECRET
        'auth-code-123',
        expect.any(String), // QB_REDIRECT_URI
        expect.any(Function)
      );
    });

    it('should handle errors during token exchange', async () => {
      mockCreateToken.mockImplementation((clientId, clientSecret, authCode, redirectUri, callback) => {
        callback(new Error('Invalid authorization code'), null);
      });

      await expect(getQBTokensFromCode('invalid-code', 'realm-123')).rejects.toThrow('Invalid authorization code');
    });

    it('should calculate token expiry times correctly', async () => {
      const now = Date.now();
      mockCreateToken.mockImplementation((clientId, clientSecret, authCode, redirectUri, callback) => {
        callback(null, mockTokenResponse);
      });

      const result = await getQBTokensFromCode('code', 'realm');

      expect(result).not.toBeNull();
      const accessExpiry = new Date(result!.accessTokenExpiry).getTime();
      const refreshExpiry = new Date(result!.refreshTokenExpiry).getTime();

      // Access token should expire in ~1 hour
      expect(accessExpiry).toBeGreaterThan(now + 3500000);
      expect(accessExpiry).toBeLessThan(now + 3700000);

      // Refresh token should expire in ~100 days
      expect(refreshExpiry).toBeGreaterThan(now + 8700000000);
    });
  });

  describe('refreshQBToken', () => {
    const mockRefreshResponse = {
      access_token: 'refreshed-access-token',
      refresh_token: 'refreshed-refresh-token',
      expires_in: 3600,
      x_refresh_token_expires_in: 8726400,
    };

    it('should refresh access token', async () => {
      mockRefreshAccessToken.mockImplementation((refreshToken, clientId, clientSecret, callback) => {
        callback(null, mockRefreshResponse);
      });

      const result = await refreshQBToken(mockTokens);

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe('refreshed-access-token');
      expect(result?.refreshToken).toBe('refreshed-refresh-token');
      expect(result?.realmId).toBe('test-realm-123'); // Should preserve realmId
    });

    it('should handle refresh errors', async () => {
      mockRefreshAccessToken.mockImplementation((refreshToken, clientId, clientSecret, callback) => {
        callback(new Error('Token refresh failed'), null);
      });

      await expect(refreshQBToken(mockTokens)).rejects.toThrow('Token refresh failed');
    });
  });

  describe('ensureValidToken', () => {
    it('should return existing tokens if not expired', async () => {
      const validTokens = {
        ...mockTokens,
        accessTokenExpiry: new Date(Date.now() + 600000).toISOString(), // 10 minutes from now
      };

      const result = await ensureValidToken(validTokens);

      expect(result).toEqual(validTokens);
      expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    });

    it('should refresh tokens if expiring in less than 5 minutes', async () => {
      const expiringTokens = {
        ...mockTokens,
        accessTokenExpiry: new Date(Date.now() + 240000).toISOString(), // 4 minutes from now
      };

      const mockRefreshResponse = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
      };

      mockRefreshAccessToken.mockImplementation((refreshToken, clientId, clientSecret, callback) => {
        callback(null, mockRefreshResponse);
      });

      const result = await ensureValidToken(expiringTokens);

      expect(result.accessToken).toBe('new-token');
      expect(mockRefreshAccessToken).toHaveBeenCalled();
    });

    it('should throw error if refresh fails', async () => {
      const expiringTokens = {
        ...mockTokens,
        accessTokenExpiry: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      };

      mockRefreshAccessToken.mockImplementation((refreshToken, clientId, clientSecret, callback) => {
        callback(new Error('Refresh failed'), null);
      });

      await expect(ensureValidToken(expiringTokens)).rejects.toThrow();
    });
  });

  describe('syncCustomerToQB', () => {
    const mockCustomer = {
      id: 'comp-123',
      name: 'Acme Corp',
      email: 'john@acme.com',
      phone: '555-1234',
    };

    it('should create new customer in QuickBooks', async () => {
      mockCreateCustomer.mockImplementation((customer, callback) => {
        callback(null, { Id: 'qb-cust-456', DisplayName: 'Acme Corp' });
      });

      const result = await syncCustomerToQB(mockTokens, mockCustomer);

      expect(result.success).toBe(true);
      expect(result.qb_customer_id).toBe('qb-cust-456');
    });

    it('should update existing customer if qb_customer_id provided', async () => {
      const existingCustomer = {
        ...mockCustomer,
        qb_customer_id: 'qb-existing-123',
      };

      mockGetCustomer.mockImplementation((id, callback) => {
        callback(null, { Id: 'qb-existing-123', DisplayName: 'Old Name', SyncToken: '5' });
      });
      mockUpdateCustomer.mockImplementation((customer, callback) => {
        callback(null, { Id: 'qb-existing-123', DisplayName: 'Acme Corp' });
      });

      const result = await syncCustomerToQB(mockTokens, existingCustomer);

      expect(result.success).toBe(true);
      expect(result.qb_customer_id).toBe('qb-existing-123');
    });

    it('should handle customer creation errors', async () => {
      mockCreateCustomer.mockImplementation((customer, callback) => {
        callback({ message: 'Duplicate customer name' }, null);
      });

      const result = await syncCustomerToQB(mockTokens, mockCustomer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Duplicate customer name');
    });

    it('should handle errors when updating customer', async () => {
      const existingCustomer = {
        ...mockCustomer,
        qb_customer_id: 'qb-existing-123',
      };

      mockGetCustomer.mockImplementation((id, callback) => {
        callback({ message: 'Customer not found' }, null);
      });

      const result = await syncCustomerToQB(mockTokens, existingCustomer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });
  });

  describe('createInvoiceInQB', () => {
    const mockInvoice = {
      customer_qb_id: 'qb-cust-789',
      invoice_number: 'INV-2024-001',
      invoice_date: '2024-11-15',
      due_date: '2024-12-15',
      line_items: [
        { description: 'Service A', quantity: 1, rate: 10000, amount: 10000 },
        { description: 'Service B', quantity: 2, rate: 5000, amount: 10000 },
      ],
      subtotal: 20000,
      tax_amount: 1500,
      total: 21500,
    };

    it('should create invoice in QuickBooks', async () => {
      mockCreateInvoice.mockImplementation((invoice, callback) => {
        callback(null, { Id: 'qb-inv-999', DocNumber: 'INV-2024-001' });
      });

      const result = await createInvoiceInQB(mockTokens, mockInvoice);

      expect(result.success).toBe(true);
      expect(result.qb_invoice_id).toBe('qb-inv-999');
    });

    it('should convert amounts from cents to dollars', async () => {
      mockCreateInvoice.mockImplementation((invoice, callback) => {
        // Verify amounts are in dollars
        expect(invoice.Line[0].Amount).toBe(100); // 10000 cents = $100
        expect(invoice.Line[0].SalesItemLineDetail.UnitPrice).toBe(100);
        expect(invoice.TxnTaxDetail.TotalTax).toBe(15); // 1500 cents = $15
        callback(null, { Id: 'qb-inv-999' });
      });

      await createInvoiceInQB(mockTokens, mockInvoice);
    });

    it('should handle invoice creation errors', async () => {
      mockCreateInvoice.mockImplementation((invoice, callback) => {
        callback({ message: 'Invalid customer reference' }, null);
      });

      const result = await createInvoiceInQB(mockTokens, mockInvoice);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid customer reference');
    });
  });

  describe('getInvoiceFromQB', () => {
    it('should retrieve invoice from QuickBooks', async () => {
      mockGetInvoice.mockImplementation((id, callback) => {
        callback(null, { Id: 'qb-inv-123', DocNumber: 'INV-001', TotalAmt: 1250.0 });
      });

      const result = await getInvoiceFromQB(mockTokens, 'qb-inv-123');

      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();
      expect(result.invoice.Id).toBe('qb-inv-123');
    });

    it('should handle errors when invoice not found', async () => {
      mockGetInvoice.mockImplementation((id, callback) => {
        callback({ message: 'Invoice not found' }, null);
      });

      const result = await getInvoiceFromQB(mockTokens, 'invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invoice not found');
    });
  });

  describe('recordPaymentInQB', () => {
    const mockPayment = {
      customer_qb_id: 'qb-cust-456',
      invoice_qb_id: 'qb-inv-789',
      amount: 125000, // $1,250.00 in cents
      payment_date: '2024-12-01',
      payment_method: 'Check',
      reference_number: 'CHK-001',
    };

    it('should record payment in QuickBooks', async () => {
      mockCreatePayment.mockImplementation((payment, callback) => {
        callback(null, { Id: 'qb-pay-999', TotalAmt: 1250.0 });
      });

      const result = await recordPaymentInQB(mockTokens, mockPayment);

      expect(result.success).toBe(true);
      expect(result.qb_payment_id).toBe('qb-pay-999');
    });

    it('should convert amount from cents to dollars', async () => {
      mockCreatePayment.mockImplementation((payment, callback) => {
        expect(payment.TotalAmt).toBe(1250.0); // 125000 cents = $1250.00
        expect(payment.Line[0].Amount).toBe(1250.0);
        callback(null, { Id: 'qb-pay-999' });
      });

      await recordPaymentInQB(mockTokens, mockPayment);
    });

    it('should link payment to invoice', async () => {
      mockCreatePayment.mockImplementation((payment, callback) => {
        expect(payment.Line[0].LinkedTxn[0].TxnId).toBe('qb-inv-789');
        expect(payment.Line[0].LinkedTxn[0].TxnType).toBe('Invoice');
        callback(null, { Id: 'qb-pay-999' });
      });

      await recordPaymentInQB(mockTokens, mockPayment);
    });

    it('should handle payment creation errors', async () => {
      mockCreatePayment.mockImplementation((payment, callback) => {
        callback({ message: 'Invalid payment amount' }, null);
      });

      const result = await recordPaymentInQB(mockTokens, mockPayment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid payment amount');
    });
  });

  describe('getQBCompanyInfo', () => {
    it('should fetch company info from QuickBooks', async () => {
      mockGetCompanyInfo.mockImplementation((realmId, callback) => {
        callback(null, {
          CompanyName: 'Test Company',
          LegalName: 'Test Company LLC',
          Email: { Address: 'test@company.com' },
        });
      });

      const result = await getQBCompanyInfo(mockTokens);

      expect(result.success).toBe(true);
      expect(result.company).toBeDefined();
      expect(result.company.CompanyName).toBe('Test Company');
    });

    it('should handle errors when fetching company info', async () => {
      mockGetCompanyInfo.mockImplementation((realmId, callback) => {
        callback({ message: 'Unauthorized' }, null);
      });

      const result = await getQBCompanyInfo(mockTokens);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('getAllCustomersFromQB', () => {
    it('should retrieve all customers from QuickBooks', async () => {
      mockFindCustomers.mockImplementation((options, callback) => {
        callback(null, {
          QueryResponse: {
            Customer: [
              { Id: '1', DisplayName: 'Customer A' },
              { Id: '2', DisplayName: 'Customer B' },
            ],
          },
        });
      });

      const result = await getAllCustomersFromQB(mockTokens);

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(2);
      expect(result.customers?.[0].DisplayName).toBe('Customer A');
    });

    it('should return empty array if no customers found', async () => {
      mockFindCustomers.mockImplementation((options, callback) => {
        callback(null, { QueryResponse: {} });
      });

      const result = await getAllCustomersFromQB(mockTokens);

      expect(result.success).toBe(true);
      expect(result.customers).toEqual([]);
    });

    it('should handle errors when fetching customers', async () => {
      mockFindCustomers.mockImplementation((options, callback) => {
        callback({ message: 'Query failed' }, null);
      });

      const result = await getAllCustomersFromQB(mockTokens);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });
  });

  describe('getAllInvoicesFromQB', () => {
    it('should retrieve all invoices from QuickBooks', async () => {
      mockReportBalanceSheet.mockImplementation((options, callback) => {
        // First call fails, triggers fallback to query
        callback({ message: 'Not available' }, null);
      });
      mockQuery.mockImplementation((query, callback) => {
        callback(null, {
          QueryResponse: {
            Invoice: [
              { Id: '1', DocNumber: 'INV-001' },
              { Id: '2', DocNumber: 'INV-002' },
            ],
          },
        });
      });

      const result = await getAllInvoicesFromQB(mockTokens);

      expect(result.success).toBe(true);
      expect(result.invoices).toHaveLength(2);
    });

    it('should filter invoices by date range', async () => {
      mockReportBalanceSheet.mockImplementation((options, callback) => {
        callback({ message: 'Not available' }, null);
      });
      mockQuery.mockImplementation((query, callback) => {
        expect(query).toContain("WHERE TxnDate >= '2024-01-01'");
        expect(query).toContain("AND TxnDate <= '2024-12-31'");
        callback(null, { QueryResponse: { Invoice: [] } });
      });

      await getAllInvoicesFromQB(mockTokens, '2024-01-01', '2024-12-31');
    });

    it('should handle errors when fetching invoices', async () => {
      mockReportBalanceSheet.mockImplementation((options, callback) => {
        callback({ message: 'Error' }, null);
      });
      mockQuery.mockImplementation((query, callback) => {
        callback({ message: 'Query failed' }, null);
      });

      const result = await getAllInvoicesFromQB(mockTokens);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });
  });

  describe('getAllPaymentsFromQB', () => {
    it('should retrieve all payments from QuickBooks', async () => {
      mockQuery.mockImplementation((query, callback) => {
        callback(null, {
          QueryResponse: {
            Payment: [
              { Id: '1', TotalAmt: 100.0 },
              { Id: '2', TotalAmt: 200.0 },
            ],
          },
        });
      });

      const result = await getAllPaymentsFromQB(mockTokens);

      expect(result.success).toBe(true);
      expect(result.payments).toHaveLength(2);
    });

    it('should filter payments by date range', async () => {
      mockQuery.mockImplementation((query, callback) => {
        expect(query).toContain("WHERE TxnDate >= '2024-01-01'");
        expect(query).toContain("AND TxnDate <= '2024-12-31'");
        callback(null, { QueryResponse: { Payment: [] } });
      });

      await getAllPaymentsFromQB(mockTokens, '2024-01-01', '2024-12-31');
    });

    it('should handle errors when fetching payments', async () => {
      mockQuery.mockImplementation((query, callback) => {
        callback({ message: 'Query failed' }, null);
      });

      const result = await getAllPaymentsFromQB(mockTokens);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');
    });
  });

  describe('searchCustomersInQB', () => {
    it('should search customers by name', async () => {
      mockQuery.mockImplementation((query, callback) => {
        expect(query).toContain("WHERE DisplayName LIKE '%Acme%'");
        callback(null, {
          QueryResponse: {
            Customer: [{ Id: '1', DisplayName: 'Acme Corp' }],
          },
        });
      });

      const result = await searchCustomersInQB(mockTokens, 'Acme');

      expect(result.success).toBe(true);
      expect(result.customers).toHaveLength(1);
      expect(result.customers?.[0].DisplayName).toBe('Acme Corp');
    });

    it('should return empty array if no matches found', async () => {
      mockQuery.mockImplementation((query, callback) => {
        callback(null, { QueryResponse: {} });
      });

      const result = await searchCustomersInQB(mockTokens, 'NonExistent');

      expect(result.success).toBe(true);
      expect(result.customers).toEqual([]);
    });

    it('should handle search errors', async () => {
      mockQuery.mockImplementation((query, callback) => {
        callback({ message: 'Search failed' }, null);
      });

      const result = await searchCustomersInQB(mockTokens, 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search failed');
    });
  });
});
