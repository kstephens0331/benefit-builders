/**
 * Tests for Billing Period API
 * Manages billing periods and monthly invoicing
 */

import { GET } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');
jest.mock('@/lib/fees');
jest.mock('@/lib/tax');

describe('API: /api/billing/[period]', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);

    // Mock fee calculation
    const { computeFeesForPretaxMonthly, computeProfitShare } = require('@/lib/fees');
    (computeFeesForPretaxMonthly as jest.Mock).mockReturnValue({
      employeeFeeMonthly: 100,
      employerFeeMonthly: 50,
      employeeRate: 0.05,
      employerRate: 0.03,
    });
    (computeProfitShare as jest.Mock).mockReturnValue({
      profitShareAmount: 10,
      description: 'Test profit share',
    });

    // Mock FICA calculation
    const { calcFICA } = require('@/lib/tax');
    (calcFICA as jest.Mock).mockReturnValue({
      fica: 1000,
      ss: 800,
      med: 200,
    });
  });

  describe('GET /api/billing/[period]', () => {
    it('should fetch billing data for period with companies', async () => {
      // Mock federal tax params - first select call
      const eqSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ss_rate: 0.062, med_rate: 0.0145 },
        error: null,
      });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
        single: singleSpy,
      }));

      // Mock companies select - second select call
      mockDb.select.mockImplementationOnce(() => ({
        then: (resolve: any) => resolve({
          data: [
            {
              id: 'comp-1',
              name: 'Test Co',
              model: '5/3',
              state: 'CA',
              pay_frequency: 'biweekly',
            },
          ],
          error: null,
        }),
      }));

      // Mock billing settings
      mockDb.maybeSingle.mockResolvedValueOnce({
        data: { profit_share_mode: 'none', profit_share_percent: 0 },
        error: null,
      });

      // Mock employees
      const empSelectSpy = jest.fn().mockResolvedValue({
        data: [
          { id: 'emp-1', first_name: 'John', last_name: 'Doe', gross_pay: 5000 },
        ],
        error: null,
      });
      mockDb.eq.mockImplementation((field: string, value: any) => {
        if (field === 'active') {
          return { then: (resolve: any) => resolve(empSelectSpy()) };
        }
        return mockDb;
      });

      // Mock employee benefits
      const benefitsSpy = jest.fn().mockResolvedValue({
        data: [
          { employee_id: 'emp-1', per_pay_amount: 100, reduces_fica: true },
        ],
        error: null,
      });
      mockDb.in.mockImplementation(() => ({
        then: (resolve: any) => resolve(benefitsSpy()),
      }));

      const request = new Request('http://localhost:3000/api/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.period).toBe('2024-11');
      expect(data.invoices).toHaveLength(1);
    });

    it('should return 404 when no companies found', async () => {
      // Mock federal tax params - need to return a proper chain
      const eqSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ss_rate: 0.062, med_rate: 0.0145 },
        error: null,
      });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
        single: singleSpy,
      }));

      // Mock empty companies list
      mockDb.select.mockImplementationOnce(() => ({
        then: (resolve: any) => resolve({ data: [], error: null }),
      }));

      const request = new Request('http://localhost:3000/api/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('No companies');
    });

    it('should skip companies with no active employees', async () => {
      // Mock federal tax params
      const eqSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ss_rate: 0.062, med_rate: 0.0145 },
        error: null,
      });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
        single: singleSpy,
      }));

      // Mock companies
      mockDb.select.mockImplementationOnce(() => ({
        then: (resolve: any) => resolve({
          data: [
            {
              id: 'comp-1',
              name: 'Test Co',
              model: '5/3',
              state: 'CA',
              pay_frequency: 'biweekly',
            },
          ],
          error: null,
        }),
      }));

      // Mock billing settings
      mockDb.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock empty employees
      mockDb.eq.mockImplementation((field: string, value: any) => {
        if (field === 'active') {
          return { then: (resolve: any) => resolve({ data: [], error: null }) };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.invoices).toHaveLength(0);
    });

    it('should include profit share calculations', async () => {
      // Mock federal tax params
      const eqSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ss_rate: 0.062, med_rate: 0.0145 },
        error: null,
      });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
        single: singleSpy,
      }));

      // Mock companies
      mockDb.select.mockImplementationOnce(() => ({
        then: (resolve: any) => resolve({
          data: [
            {
              id: 'comp-1',
              name: 'Test Co',
              model: '5/3',
              state: 'CA',
              pay_frequency: 'monthly',
            },
          ],
          error: null,
        }),
      }));

      // Mock billing settings with profit sharing
      mockDb.maybeSingle.mockResolvedValueOnce({
        data: { profit_share_mode: 'percent_er_savings', profit_share_percent: 50 },
        error: null,
      });

      // Mock employees
      const empSelectSpy = jest.fn().mockResolvedValue({
        data: [
          { id: 'emp-1', first_name: 'John', last_name: 'Doe', gross_pay: 5000 },
        ],
        error: null,
      });
      mockDb.eq.mockImplementation((field: string, value: any) => {
        if (field === 'active') {
          return { then: (resolve: any) => resolve(empSelectSpy()) };
        }
        return mockDb;
      });

      // Mock employee benefits
      const benefitsSpy = jest.fn().mockResolvedValue({
        data: [
          { employee_id: 'emp-1', per_pay_amount: 200, reduces_fica: true },
        ],
        error: null,
      });
      mockDb.in.mockImplementation(() => ({
        then: (resolve: any) => resolve(benefitsSpy()),
      }));

      const request = new Request('http://localhost:3000/api/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices[0].profit_share_mode).toBe('percent_er_savings');
      expect(data.invoices[0].profit_share_credit).toBe(10);
      expect(data.invoices[0].profit_share_description).toBe('Test profit share');
    });

    it('should calculate fees based on model', async () => {
      // Mock federal tax params
      const eqSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ss_rate: 0.062, med_rate: 0.0145 },
        error: null,
      });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
        single: singleSpy,
      }));

      // Mock companies
      mockDb.select.mockImplementationOnce(() => ({
        then: (resolve: any) => resolve({
          data: [
            {
              id: 'comp-1',
              name: 'Test Co',
              model: '5/3',
              state: 'CA',
              pay_frequency: 'weekly',
            },
          ],
          error: null,
        }),
      }));

      // Mock billing settings
      mockDb.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock employees
      const empSelectSpy = jest.fn().mockResolvedValue({
        data: [
          { id: 'emp-1', first_name: 'John', last_name: 'Doe', gross_pay: 1000 },
        ],
        error: null,
      });
      mockDb.eq.mockImplementation((field: string, value: any) => {
        if (field === 'active') {
          return { then: (resolve: any) => resolve(empSelectSpy()) };
        }
        return mockDb;
      });

      // Mock employee benefits
      const benefitsSpy = jest.fn().mockResolvedValue({
        data: [
          { employee_id: 'emp-1', per_pay_amount: 50, reduces_fica: false },
        ],
        error: null,
      });
      mockDb.in.mockImplementation(() => ({
        then: (resolve: any) => resolve(benefitsSpy()),
      }));

      const request = new Request('http://localhost:3000/api/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices[0].model).toBe('5/3');
      expect(data.invoices[0].rates).toBe('5.0% / 3.0%');
      expect(data.invoices[0].employer_fee).toBe(50);
      expect(data.invoices[0].employee_fee_total).toBe(100);
    });
  });
});
