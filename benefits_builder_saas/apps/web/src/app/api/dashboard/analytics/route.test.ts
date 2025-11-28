/**
 * Tests for Dashboard Analytics API
 * Provides comprehensive KPIs, trends, and business metrics
 */

import { GET } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');
jest.mock('@/lib/models');
jest.mock('@/lib/tax');

describe('API: /api/dashboard/analytics', () => {
  let mockDb: any;
  let selectSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create spy for select that we can configure per test
    selectSpy = jest.fn();

    // Create a mock database client with proper chaining
    mockDb = {
      from: jest.fn(() => ({
        select: selectSpy,
      })),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);

    // Mock getModelRates
    const { getModelRates } = require('@/lib/models');
    (getModelRates as jest.Mock).mockReturnValue([0.05, 0.03]); // 5% employee, 3% employer

    // Mock calcFICA
    const { calcFICA } = require('@/lib/tax');
    (calcFICA as jest.Mock).mockReturnValue({ fica: 100 });
  });

  describe('GET /api/dashboard/analytics', () => {
    it('should fetch core metrics and return analytics summary', async () => {
      selectSpy
        // Total companies count
        .mockResolvedValueOnce({ count: 10, error: null })
        // Active companies count with .eq('status', 'active')
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ count: 8, error: null }),
        })
        // Total employees count
        .mockResolvedValueOnce({ count: 100, error: null })
        // Active employees count with .eq('active', true)
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ count: 90, error: null }),
        })
        // Active employees for benefits check with .eq('active', true)
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ data: [{ id: 'emp1' }, { id: 'emp2' }], error: null }),
        })
        // Employee benefits with .in('employee_id', [...])
        .mockReturnValueOnce({
          in: jest.fn().mockResolvedValue({ data: [{ employee_id: 'emp1' }, { employee_id: 'emp2' }], error: null }),
        })
        // Federal tax params with .eq('tax_year', year).single()
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { ss_rate: 0.062, med_rate: 0.0145 }, error: null }),
          }),
        })
        // Active companies query with .eq('status', 'active')
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'comp1', name: 'Company 1', model: '5/3', pay_frequency: 'biweekly' }],
            error: null,
          }),
        })
        // Employees for company with .eq('company_id', id).eq('active', true)
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [{ id: 'emp1', gross_pay: 50000 }], error: null }),
          }),
        })
        // Benefits for employees with .in('employee_id', [...])
        .mockReturnValueOnce({
          in: jest.fn().mockResolvedValue({
            data: [{ employee_id: 'emp1', per_pay_amount: 100, reduces_fica: true }],
            error: null,
          }),
        });

      // Mock billing snapshots for trends (6 months) with .eq('period', period)
      for (let i = 0; i < 6; i++) {
        selectSpy.mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({
            data: [{ employer_savings_cents: 10000, bb_profit_cents: 5000 }],
            error: null,
          }),
        });
      }

      // Mock company size count query with .eq('company_id', id).eq('active', true)
      selectSpy.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      });

      const request = new Request('http://localhost:3000/api/dashboard/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.summary).toBeDefined();
      expect(data.summary.total_companies).toBe(10);
      expect(data.summary.active_companies).toBe(8);
      expect(data.summary.total_employees).toBe(100);
      expect(data.summary.active_employees).toBe(90);
    });

    it('should calculate enrollment rate correctly', async () => {
      selectSpy
        .mockResolvedValueOnce({ count: 5, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 5, error: null }) })
        .mockResolvedValueOnce({ count: 50, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 45, error: null }) })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [{ id: 'emp1' }, { id: 'emp2' }], error: null }) })
        .mockReturnValueOnce({ in: jest.fn().mockResolvedValue({ data: [{ employee_id: 'emp1' }, { employee_id: 'emp2' }], error: null }) })
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { ss_rate: 0.062, med_rate: 0.0145 }, error: null }) }) })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });

      // Mock billing snapshots
      for (let i = 0; i < 6; i++) {
        selectSpy.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });
      }

      const request = new Request('http://localhost:3000/api/dashboard/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(data.summary.enrolled_employees).toBe(2);
      expect(data.summary.enrollment_rate).toBe(4.0); // 2/50 * 100 = 4.0%
    });

    it('should include trends data', async () => {
      selectSpy
        .mockResolvedValueOnce({ count: 1, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 1, error: null }) })
        .mockResolvedValueOnce({ count: 1, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 1, error: null }) })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) })
        // No .in() mock needed since employeeIds is empty
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { ss_rate: 0.062, med_rate: 0.0145 }, error: null }) }) })
        // Companies query
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });

      // Mock billing snapshots with data
      for (let i = 0; i < 6; i++) {
        selectSpy.mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ data: [{ employer_savings_cents: 50000, bb_profit_cents: 30000 }], error: null }),
        });
      }

      const request = new Request('http://localhost:3000/api/dashboard/analytics?months=6');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.trends).toBeDefined();
      expect(Array.isArray(data.trends)).toBe(true);
      expect(data.trends.length).toBe(6);
      expect(data.trends[0]).toHaveProperty('period');
      expect(data.trends[0]).toHaveProperty('revenue');
      expect(data.trends[0]).toHaveProperty('employer_savings');
    });

    it('should include company distribution by size', async () => {
      selectSpy
        .mockResolvedValueOnce({ count: 3, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 3, error: null }) })
        .mockResolvedValueOnce({ count: 50, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 50, error: null }) })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) })
        // No .in() mock needed since employeeIds is empty
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { ss_rate: 0.062, med_rate: 0.0145 }, error: null }) }) })
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({
            data: [
              { id: 'comp1', name: 'Small Co', model: '5/3', pay_frequency: 'biweekly' },
              { id: 'comp2', name: 'Medium Co', model: '5/3', pay_frequency: 'biweekly' },
              { id: 'comp3', name: 'Large Co', model: '5/3', pay_frequency: 'biweekly' },
            ],
            error: null,
          }),
        })
        // Mock employees for each company
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) })
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) })
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) });

      // Mock billing snapshots
      for (let i = 0; i < 6; i++) {
        selectSpy.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });
      }

      // Mock company size counts (one for each company)
      selectSpy
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 5, error: null }) }) })
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 15, error: null }) }) })
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 30, error: null }) }) });

      const request = new Request('http://localhost:3000/api/dashboard/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.company_distribution).toBeDefined();
      expect(Array.isArray(data.company_distribution)).toBe(true);
      expect(data.company_distribution.length).toBe(5);
    });

    it('should handle database errors gracefully', async () => {
      selectSpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new Request('http://localhost:3000/api/dashboard/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Failed to generate analytics');
    });

    it('should handle empty data gracefully', async () => {
      selectSpy
        .mockResolvedValueOnce({ count: 0, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 0, error: null }) })
        .mockResolvedValueOnce({ count: 0, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 0, error: null }) })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) })
        // No .in() mock needed since employeeIds is empty
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { ss_rate: 0.062, med_rate: 0.0145 }, error: null }) }) })
        // Companies query
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });

      // Mock billing snapshots
      for (let i = 0; i < 6; i++) {
        selectSpy.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });
      }

      const request = new Request('http://localhost:3000/api/dashboard/analytics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.summary.total_companies).toBe(0);
      expect(data.summary.monthly_revenue).toBe(0);
    });

    it('should accept custom months parameter', async () => {
      selectSpy
        .mockResolvedValueOnce({ count: 1, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 1, error: null }) })
        .mockResolvedValueOnce({ count: 1, error: null })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ count: 1, error: null }) })
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) })
        // No .in() mock needed since employeeIds is empty
        .mockReturnValueOnce({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { ss_rate: 0.062, med_rate: 0.0145 }, error: null }) }) })
        // Companies query
        .mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });

      // Mock billing snapshots for 12 months
      for (let i = 0; i < 12; i++) {
        selectSpy.mockReturnValueOnce({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) });
      }

      const request = new Request('http://localhost:3000/api/dashboard/analytics?months=12');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.trends.length).toBe(12);
    });
  });
});
