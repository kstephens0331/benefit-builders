/**
 * Tests for Invoices API
 * Manages invoice CRUD operations
 */

import { GET, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/invoices', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  describe('GET /api/invoices', () => {
    const mockInvoices = [
      {
        id: 'inv-1',
        invoice_number: 'INV-001',
        company_id: 'comp-1',
        period: '2024-11',
        invoice_date: '2024-11-01',
        due_date: '2024-11-30',
        subtotal: 1000,
        tax_amount: 80,
        total_amount: 1080,
        status: 'open',
        companies: { company_name: 'Test Co' },
      },
      {
        id: 'inv-2',
        invoice_number: 'INV-002',
        company_id: 'comp-2',
        period: '2024-11',
        total_amount: 2000,
        status: 'sent',
        companies: { company_name: 'Demo Inc' },
      },
    ];

    it('should fetch all invoices', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockInvoices, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].invoice_number).toBe('INV-001');
      expect(orderSpy).toHaveBeenCalledWith('period', { ascending: false });
    });

    it('should filter by period', async () => {
      const eqSpy = jest.fn().mockResolvedValue({
        data: mockInvoices.filter((i) => i.period === '2024-11'),
        error: null,
      });
      const orderSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/invoices?period=2024-11');
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('period', { ascending: false });
      expect(eqSpy).toHaveBeenCalledWith('period', '2024-11');
    });

    it('should filter by company_id', async () => {
      const eqSpy = jest.fn().mockResolvedValue({
        data: [mockInvoices[0]],
        error: null,
      });
      const orderSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/invoices?company_id=comp-1');
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('period', { ascending: false });
      expect(eqSpy).toHaveBeenCalledWith('company_id', 'comp-1');
    });

    it('should include company details', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockInvoices, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDb.select).toHaveBeenCalledWith('*, companies(name)');
      expect(data.data[0].companies.company_name).toBe('Test Co');
    });

    it('should handle database errors', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('PATCH /api/invoices', () => {
    it('should update invoice', async () => {
      const updates = {
        id: 'inv-1',
        status: 'sent',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'inv-1', status: 'sent' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.eq).toHaveBeenCalledWith('id', 'inv-1');
    });

    it('should require ID', async () => {
      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'sent' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Invoice ID is required');
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'inv-1', status: 'sent' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('DELETE /api/invoices', () => {
    it('should delete invoice', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ error: null });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/invoices?id=inv-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toBe('Invoice deleted successfully');
      expect(mockDb.delete).toHaveBeenCalled();
      expect(eqSpy).toHaveBeenCalledWith('id', 'inv-1');
    });

    it('should require ID', async () => {
      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Invoice ID is required');
    });

    it('should handle database errors', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/invoices?id=inv-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });
});
