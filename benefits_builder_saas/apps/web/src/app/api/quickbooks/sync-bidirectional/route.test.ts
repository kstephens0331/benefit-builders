/**
 * Tests for QuickBooks Bidirectional Sync API
 * Critical endpoint for automatic 3-hour sync
 */

import { POST, GET } from './route';
import { createServiceClient } from '@/lib/supabase';
import * as qbLib from '@/lib/quickbooks';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/quickbooks');

describe('API: /api/quickbooks/sync-bidirectional', () => {
  let mockDb: any;

  const mockConnection = {
    id: 'conn-123',
    realm_id: 'realm-456',
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    status: 'active',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      raw: jest.fn((sql) => sql),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  describe('POST - Bidirectional Sync', () => {
    it('should reject requests without proper authorization', async () => {
      process.env.CRON_SECRET = 'my-secret';

      const request = new Request('http://localhost:3000/api/quickbooks/sync-bidirectional', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return error if no QuickBooks connection exists', async () => {
      process.env.CRON_SECRET = 'my-secret';

      const request = new Request('http://localhost:3000/api/quickbooks/sync-bidirectional', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer my-secret',
        },
      });

      mockDb.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('No active QuickBooks connection');
      expect(data.skipped).toBe(true);
    });

    it('should accept requests with correct cron secret and sync successfully', async () => {
      process.env.CRON_SECRET = 'my-secret';

      const request = new Request('http://localhost:3000/api/quickbooks/sync-bidirectional', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer my-secret',
        },
      });

      // Mock all database calls
      let singleCallCount = 0;
      mockDb.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // QB connection
          return Promise.resolve({ data: mockConnection, error: null });
        }
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      });

      // Mock company and invoice queries
      let orCallCount = 0;
      mockDb.or.mockImplementation(() => {
        orCallCount++;
        if (orCallCount === 1) {
          // Companies query
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });

      let eqCallCount = 0;
      mockDb.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          // QB connection eq('status', 'active')
          return mockDb;
        }
        if (eqCallCount === 2) {
          // Companies eq('status', 'active')
          return mockDb;
        }
        if (eqCallCount === 3) {
          // Invoices eq('qb_synced', false)
          return Promise.resolve({ data: [], error: null });
        }
        return mockDb;
      });

      (qbLib.ensureValidToken as jest.Mock).mockResolvedValue({
        realmId: mockConnection.realm_id,
        accessToken: mockConnection.access_token,
        refreshToken: mockConnection.refresh_token,
        accessTokenExpiry: mockConnection.token_expires_at,
        refreshTokenExpiry: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
      });
      (qbLib.getAllPaymentsFromQB as jest.Mock).mockResolvedValue({
        success: true,
        payments: [],
      });

      mockDb.insert.mockResolvedValue({ data: {}, error: null });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.results).toBeDefined();
    });
  });

  describe('GET - Sync Status', () => {
    it('should return sync status and pending counts', async () => {
      const mockSyncHistory = [
        {
          id: 'log-1',
          sync_type: 'bidirectional',
          customers_pushed: 5,
          invoices_pushed: 10,
          payments_pulled: 3,
          synced_at: '2024-11-20T10:00:00Z',
          errors: null,
        },
      ];

      let singleCallCount = 0;
      mockDb.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          // Connection check
          return Promise.resolve({ data: mockConnection, error: null });
        }
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      });

      let limitCallCount = 0;
      mockDb.limit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          // Sync history
          return Promise.resolve({ data: mockSyncHistory, error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });

      let orCallCount = 0;
      mockDb.or.mockImplementation(() => {
        orCallCount++;
        if (orCallCount === 1) {
          // Companies count
          return Promise.resolve({ data: null, error: null, count: 2 });
        }
        return Promise.resolve({ data: null, error: null, count: 0 });
      });

      let eqCallCount = 0;
      mockDb.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 1) {
          // Connection status check
          return mockDb;
        }
        if (eqCallCount === 2) {
          // Companies status check
          return mockDb;
        }
        if (eqCallCount === 3) {
          // Invoices qb_synced check
          return Promise.resolve({ data: null, error: null, count: 5 });
        }
        return mockDb;
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.connection_active).toBe(true);
      expect(data.last_sync).toBe('2024-11-20T10:00:00Z');
      expect(data.pending_sync.customers).toBe(2);
      expect(data.pending_sync.invoices).toBe(5);
      expect(data.sync_history).toHaveLength(1);
    });

    it('should return not connected if no active connection', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      mockDb.limit.mockResolvedValueOnce({ data: [], error: null });
      mockDb.or.mockResolvedValue({ data: null, error: null, count: 0 });
      mockDb.eq.mockReturnThis();

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.connection_active).toBe(false);
      expect(data.last_sync).toBeNull();
      expect(data.pending_sync.customers).toBe(0);
      expect(data.pending_sync.invoices).toBe(0);
    });
  });
});
