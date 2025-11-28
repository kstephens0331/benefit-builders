/**
 * Tests for Reports Summary API
 * Generates summary reports with key metrics
 */

import { GET } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/reports/summary', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockFedParams = {
    ss_rate: 0.062,
    med_rate: 0.0145,
  };

  const mockCompanies = [
    {
      id: 'comp-1',
      name: 'Acme Corp',
      state: 'TX',
      model: '5/3',
      status: 'active',
    },
    {
      id: 'comp-2',
      name: 'TechStart Inc',
      state: 'CA',
      model: '5/0',
      status: 'active',
    },
  ];

  const mockEmployees = [
    {
      id: 'emp-1',
      company_id: 'comp-1',
      active: true,
      pay_period: 'b',
      paycheck_gross: 2000,
    },
    {
      id: 'emp-2',
      company_id: 'comp-2',
      active: true,
      pay_period: 'm',
      paycheck_gross: 5000,
    },
  ];

  const mockBenefits = [
    {
      employee_id: 'emp-1',
      per_pay_amount: 100,
      reduces_fica: true,
    },
    {
      employee_id: 'emp-2',
      per_pay_amount: 200,
      reduces_fica: true,
    },
  ];

  it('should fetch summary report', async () => {
    const singleSpy = jest.fn()
      .mockResolvedValueOnce({ data: mockFedParams, error: null });
    const eqSpy1 = jest.fn().mockReturnValue({ single: singleSpy });
    const selectSpy1 = jest.fn().mockReturnValue({ eq: eqSpy1 });

    const eqSpy2 = jest.fn().mockResolvedValue({ data: mockCompanies, error: null });
    const selectSpy2 = jest.fn().mockReturnValue({ eq: eqSpy2 });

    const eqSpy3 = jest.fn().mockResolvedValue({ data: mockEmployees, error: null });
    const selectSpy3 = jest.fn().mockReturnValue({ eq: eqSpy3 });

    const selectSpy4 = jest.fn().mockResolvedValue({ data: mockBenefits, error: null });

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'tax_federal_params') {
        return { select: selectSpy1 };
      } else if (table === 'companies') {
        return { select: selectSpy2 };
      } else if (table === 'employees') {
        return { select: selectSpy3 };
      } else if (table === 'employee_benefits') {
        return { select: selectSpy4 };
      }
      return mockDb;
    });

    const request = new Request('http://localhost:3000/api/reports/summary?period=2024-11');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.count).toBe(2);
    expect(data.data).toHaveLength(2);
  });

  it('should handle missing federal params', async () => {
    mockDb.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const request = new Request('http://localhost:3000/api/reports/summary?period=2024-11');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Federal params missing');
  });

  it('should handle companies query errors', async () => {
    const singleSpy = jest.fn().mockResolvedValueOnce({ data: mockFedParams, error: null });
    const eqSpy1 = jest.fn().mockReturnValue({ single: singleSpy });
    const selectSpy1 = jest.fn().mockReturnValue({ eq: eqSpy1 });

    const eqSpy2 = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const selectSpy2 = jest.fn().mockReturnValue({ eq: eqSpy2 });

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'tax_federal_params') {
        return { select: selectSpy1 };
      } else if (table === 'companies') {
        return { select: selectSpy2 };
      }
      return mockDb;
    });

    const request = new Request('http://localhost:3000/api/reports/summary?period=2024-11');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('DB error');
  });

  it('should calculate metrics correctly', async () => {
    const singleSpy = jest.fn().mockResolvedValueOnce({ data: mockFedParams, error: null });
    const eqSpy1 = jest.fn().mockReturnValue({ single: singleSpy });
    const selectSpy1 = jest.fn().mockReturnValue({ eq: eqSpy1 });

    const eqSpy2 = jest.fn().mockResolvedValue({ data: mockCompanies, error: null });
    const selectSpy2 = jest.fn().mockReturnValue({ eq: eqSpy2 });

    const eqSpy3 = jest.fn().mockResolvedValue({ data: mockEmployees, error: null });
    const selectSpy3 = jest.fn().mockReturnValue({ eq: eqSpy3 });

    const selectSpy4 = jest.fn().mockResolvedValue({ data: mockBenefits, error: null });

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'tax_federal_params') {
        return { select: selectSpy1 };
      } else if (table === 'companies') {
        return { select: selectSpy2 };
      } else if (table === 'employees') {
        return { select: selectSpy3 };
      } else if (table === 'employee_benefits') {
        return { select: selectSpy4 };
      }
      return mockDb;
    });

    const request = new Request('http://localhost:3000/api/reports/summary?period=2024-11');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data[0]).toHaveProperty('company_name');
    expect(data.data[0]).toHaveProperty('employees_active');
    expect(data.data[0]).toHaveProperty('pretax_monthly');
    expect(data.data[0]).toHaveProperty('employer_fica_saved_monthly');
    expect(data.data[0]).toHaveProperty('employee_fee_monthly');
    expect(data.data[0]).toHaveProperty('employer_fee_monthly');
    expect(data.data[0]).toHaveProperty('employer_net_monthly');
  });
});
