/**
 * Tests for Billing Period Report API
 * Generate billing reports for specific periods
 */

import { GET } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/reports/billing/[period]', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockInvoiceData = [
    {
      company_id: 'comp-1',
      period: '2024-11',
      subtotal_cents: 250000,
      tax_cents: 0,
      total_cents: 250000,
      companies: {
        name: 'Acme Corp',
        model: '5/3',
        employer_rate: 5.0,
        employee_rate: 3.0,
      },
    },
    {
      company_id: 'comp-2',
      period: '2024-11',
      subtotal_cents: 180000,
      tax_cents: 0,
      total_cents: 180000,
      companies: {
        name: 'TechStart Inc',
        model: '5/0',
        employer_rate: 5.0,
        employee_rate: 0.0,
      },
    },
  ];

  describe('GET /api/reports/billing/[period]', () => {
    it('should generate billing report for period', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockInvoiceData, error: null });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/reports/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.period).toBe('2024-11');
      expect(data.invoices).toHaveLength(2);
    });

    it('should transform invoice data correctly', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockInvoiceData, error: null });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/reports/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(data.invoices[0].company_name).toBe('Acme Corp');
      expect(data.invoices[0].model).toBe('5/3');
      expect(data.invoices[0].rates).toBe('5.0% / 3.0%');
      expect(data.invoices[0].total_pretax).toBe(2500);
    });

    it('should calculate FICA savings', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockInvoiceData, error: null });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/reports/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      // 0.0765 * 2500 = 191.25
      expect(data.invoices[0].total_employer_fica_saved).toBeCloseTo(191.25, 2);
    });

    it('should calculate fees correctly', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockInvoiceData, error: null });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/reports/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      // Employer: 2500 * 0.05 = 125
      expect(data.invoices[0].employer_fee).toBe(125);
      // Employee: 2500 * 0.03 = 75
      expect(data.invoices[0].employee_fee_total).toBe(75);
    });

    it('should handle database errors', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/reports/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('DB error');
    });

    it('should handle empty results', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/reports/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.invoices).toHaveLength(0);
    });

    it('should handle missing company data', async () => {
      const dataWithoutCompany = [
        {
          company_id: 'comp-1',
          period: '2024-11',
          subtotal_cents: 250000,
          tax_cents: 0,
          total_cents: 250000,
          companies: null,
        },
      ];

      const orderSpy = jest.fn().mockResolvedValue({ data: dataWithoutCompany, error: null });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/reports/billing/2024-11');
      const response = await GET(request, { params: Promise.resolve({ period: '2024-11' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices[0].company_name).toBe('Unknown');
      expect(data.invoices[0].model).toBe(null);
    });
  });
});
