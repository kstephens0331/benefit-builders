/**
 * Tests for Proposals API
 * Manages benefit proposals for companies
 */

import { GET } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/proposals', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock the select to return a promise with data
    mockDb.select.mockImplementation(() => {
      const chain = {
        ...mockDb,
        then: (resolve) => resolve({ data: [], error: null }),
      };
      return chain;
    });

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  describe('GET /api/proposals', () => {
    const mockProposals = [
      {
        id: 'prop-1',
        proposal_name: 'Test Proposal',
        company_name: 'Test Co',
        company_id: 'comp-1',
        effective_date: '2024-11-01',
        model_percentage: '5/3',
        pay_period: 'monthly',
        total_employees: 10,
        qualified_employees: 8,
        total_monthly_savings: 3187.50,
        total_annual_savings: 38250,
        status: 'pending',
        created_at: '2024-11-01T00:00:00Z',
        sent_at: null,
        accepted_at: null,
      },
      {
        id: 'prop-2',
        proposal_name: 'Demo Proposal',
        company_name: 'Demo Inc',
        company_id: 'comp-2',
        effective_date: '2024-11-15',
        model_percentage: '5/0',
        pay_period: 'biweekly',
        total_employees: 5,
        qualified_employees: 5,
        total_monthly_savings: 1593.75,
        total_annual_savings: 19125,
        status: 'accepted',
        created_at: '2024-11-15T00:00:00Z',
        sent_at: '2024-11-16T00:00:00Z',
        accepted_at: '2024-11-18T00:00:00Z',
      },
    ];

    it('should fetch all proposals', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockProposals, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/proposals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockProposals);
      expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should order by created_at descending', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockProposals, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/proposals');
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no proposals exist', async () => {
      mockDb.select.mockImplementation(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const request = new Request('http://localhost:3000/api/proposals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockDb.select.mockImplementation(() => ({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }));

      const request = new Request('http://localhost:3000/api/proposals');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });
});
