/**
 * Tests for QuickBooks Status API
 */

import { GET } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/accounting/quickbooks/status', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  it('should return not connected if no settings exist', async () => {
    mockDb.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.connected).toBe(false);
    expect(data.lastSync).toBeNull();
  });

  it('should return connected if valid credentials exist', async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();

    mockDb.single
      .mockResolvedValueOnce({
        data: {
          qb_access_token: 'valid-token',
          qb_refresh_token: 'refresh-token',
          qb_realm_id: 'realm-123',
          qb_token_expires_at: futureDate,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { created_at: '2024-11-20T10:00:00Z' },
        error: null,
      });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.connected).toBe(true);
    expect(data.lastSync).toBe('2024-11-20T10:00:00Z');
    expect(data.realmId).toBe('realm-123');
  });

  it('should return not connected if token is expired', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();

    mockDb.single
      .mockResolvedValueOnce({
        data: {
          qb_access_token: 'expired-token',
          qb_refresh_token: 'refresh-token',
          qb_realm_id: 'realm-123',
          qb_token_expires_at: pastDate,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      }); // No sync log

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.connected).toBe(false);
  });

  it('should handle database errors', async () => {
    mockDb.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'OTHER_ERROR', message: 'Database error' },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
  });
});
