/**
 * Tests for Invoices API (List & Update & Delete)
 * Invoice listing, filtering, and basic CRUD operations
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
      then: undefined, // Ensure it's not thenable by default
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockInvoices = [
    {
      id: 'inv-1',
      period: '2024-11',
      total_cents: 250000,
      status: 'draft',
      companies: { name: 'Acme Corp' },
    },
    {
      id: 'inv-2',
      period: '2024-10',
      total_cents: 320000,
      status: 'sent',
      companies: { name: 'TechStart Inc' },
    },
  ];

  describe('GET /api/invoices', () => {
    it('should fetch all invoices', async () => {
      mockDb.order.mockResolvedValue({ data: mockInvoices, error: null });

      const request = new Request('http://localhost:3000/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(mockDb.order).toHaveBeenCalledWith('period', { ascending: false });
    });

    it('should filter by company_id', async () => {
      // Create a mock query that can be awaited
      const queryResult = { data: [mockInvoices[0]], error: null };
      const eqMock = jest.fn().mockResolvedValue(queryResult);

      // Mock order to return an object with eq
      mockDb.order.mockReturnValue({
        eq: eqMock,
        then: (resolve: any) => resolve(queryResult),
      });

      const request = new Request('http://localhost:3000/api/invoices?company_id=comp-123');
      const response = await GET(request);
      const data = await response.json();

      expect(eqMock).toHaveBeenCalledWith('company_id', 'comp-123');
      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it('should filter by period', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: [mockInvoices[0]], error: null });
      const eqSpy = jest.fn(() => ({ order: orderSpy }));

      mockDb.select.mockReturnValue({ ...mockDb, eq: eqSpy });

      const request = new Request('http://localhost:3000/api/invoices?period=2024-11');
      const response = await GET(request);

      expect(eqSpy).toHaveBeenCalledWith('period', '2024-11');
    });

    it('should order by period descending', async () => {
      mockDb.order.mockResolvedValue({ data: mockInvoices, error: null });

      const request = new Request('http://localhost:3000/api/invoices');
      await GET(request);

      expect(mockDb.order).toHaveBeenCalledWith('period', { ascending: false });
    });

    it('should handle database errors', async () => {
      mockDb.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const request = new Request('http://localhost:3000/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Database error');
    });

    it('should filter by multiple parameters', async () => {
      // Create a mock query that chains eq calls
      const queryResult = { data: [mockInvoices[0]], error: null };
      const eqMock = jest.fn();
      const chainedEq = {
        eq: eqMock,
        then: (resolve: any) => resolve(queryResult),
      };

      eqMock.mockReturnValue(chainedEq);

      mockDb.order.mockReturnValue(chainedEq);

      const request = new Request('http://localhost:3000/api/invoices?company_id=comp-123&period=2024-11');
      const response = await GET(request);
      const data = await response.json();

      expect(eqMock).toHaveBeenCalledWith('company_id', 'comp-123');
      expect(eqMock).toHaveBeenCalledWith('period', '2024-11');
      expect(data.ok).toBe(true);
    });
  });

  describe('PATCH /api/invoices', () => {
    it('should update invoice', async () => {
      const updates = {
        id: 'inv-1',
        status: 'sent',
      };

      mockDb.single.mockResolvedValue({
        data: { ...mockInvoices[0], status: 'sent' },
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
      expect(data.data.status).toBe('sent');
      expect(mockDb.update).toHaveBeenCalledWith({ status: 'sent' });
      expect(mockDb.eq).toHaveBeenCalledWith('id', 'inv-1');
    });

    it('should require invoice ID', async () => {
      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'sent' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('ID is required');
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'inv-1', status: 'sent' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Update failed');
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'PATCH',
        body: 'invalid json',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('DELETE /api/invoices', () => {
    it('should delete invoice', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ data: null, error: null });

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
      expect(data.message).toContain('deleted successfully');
      expect(eqSpy).toHaveBeenCalledWith('id', 'inv-1');
    });

    it('should require invoice ID', async () => {
      const request = new Request('http://localhost:3000/api/invoices', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('ID is required');
    });

    it('should handle database errors', async () => {
      const eqSpy = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

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
      expect(data.error).toContain('Delete failed');
    });

    it('should handle exceptions', async () => {
      mockDb.delete.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new Request('http://localhost:3000/api/invoices?id=inv-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Unexpected error');
    });
  });
});
