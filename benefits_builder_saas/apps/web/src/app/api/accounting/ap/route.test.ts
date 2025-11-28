/**
 * Tests for Accounts Payable (A/P) API
 * Manages bills and money owed to vendors
 */

import { GET, POST, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/accounting/ap', () => {
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
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  describe('GET /api/accounting/ap', () => {
    const mockAPRecords = [
      {
        id: 'ap-1',
        vendor_name: 'Acme Corp',
        bill_number: 'BILL-001',
        amount: 5000,
        amount_paid: 0,
        status: 'open',
        due_date: '2024-12-31',
      },
      {
        id: 'ap-2',
        vendor_name: 'Test Vendor',
        bill_number: 'BILL-002',
        amount: 3000,
        amount_paid: 1000,
        status: 'partial',
        due_date: '2024-11-30',
      },
    ];

    it('should fetch all A/P records', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockAPRecords, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/accounting/ap');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].vendor_name).toBe('Acme Corp');
      expect(orderSpy).toHaveBeenCalledWith('bill_date', { ascending: false });
    });

    it('should filter A/P by status', async () => {
      const eqSpy = jest.fn().mockResolvedValue({
        data: [{ id: 'ap-1', status: 'open' }],
        error: null,
      });
      const orderSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/accounting/ap?status=open');
      const response = await GET(request);
      const data = await response.json();

      expect(orderSpy).toHaveBeenCalledWith('bill_date', { ascending: false });
      expect(eqSpy).toHaveBeenCalledWith('status', 'open');
      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should order by bill_date descending', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockAPRecords, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/accounting/ap');
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('bill_date', { ascending: false });
    });

    it('should handle database errors', async () => {
      const orderSpy = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/accounting/ap');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('POST /api/accounting/ap', () => {
    const newBill = {
      vendor_name: 'New Vendor',
      bill_number: 'BILL-003',
      bill_date: '2024-11-01',
      due_date: '2024-12-01',
      amount: 10000,
      description: 'Office supplies',
    };

    it('should create new A/P record', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'ap-new', ...newBill, status: 'open', amount_paid: 0, created_by: 'system' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/accounting/ap', {
        method: 'POST',
        body: JSON.stringify(newBill),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.vendor_name).toBe('New Vendor');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should set default values', async () => {
      const minimal = {
        vendor_name: 'Minimal Vendor',
        bill_number: 'BILL-004',
        bill_date: '2024-11-01',
        due_date: '2024-12-01',
        amount: 5000,
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'ap-new2', ...minimal, status: 'open', amount_paid: 0, created_by: 'system' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/accounting/ap', {
        method: 'POST',
        body: JSON.stringify(minimal),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.status).toBe('open');
      expect(data.data.amount_paid).toBe(0);
      expect(data.data.created_by).toBe('system');
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const request = new Request('http://localhost:3000/api/accounting/ap', {
        method: 'POST',
        body: JSON.stringify(newBill),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('PATCH /api/accounting/ap', () => {
    it('should update A/P record', async () => {
      const updates = {
        id: 'ap-1',
        amount_paid: 2500,
        status: 'partial',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'ap-1', amount_paid: 2500, status: 'partial' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/accounting/ap', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.eq).toHaveBeenCalledWith('id', 'ap-1');
    });

    it('should require ID', async () => {
      const request = new Request('http://localhost:3000/api/accounting/ap', {
        method: 'PATCH',
        body: JSON.stringify({ amount_paid: 2500 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('A/P ID is required');
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const request = new Request('http://localhost:3000/api/accounting/ap', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'ap-1', amount_paid: 2500 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('DELETE /api/accounting/ap', () => {
    it('should delete A/P record without payments', async () => {
      // Mock payment check returns no payments
      const limitSpy = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqSpy = jest.fn().mockReturnValue({ limit: limitSpy });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
      }));

      // Mock delete operation
      mockDb.eq.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/accounting/ap?id=ap-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toBe('A/P deleted successfully');
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should prevent deletion if payments exist', async () => {
      // Mock payment check returns payments
      const limitSpy = jest.fn().mockResolvedValue({
        data: [{ id: 'payment-1' }],
        error: null
      });
      const eqSpy = jest.fn().mockReturnValue({ limit: limitSpy });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/accounting/ap?id=ap-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Cannot delete A/P with existing payments');
    });

    it('should require ID', async () => {
      const request = new Request('http://localhost:3000/api/accounting/ap', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('A/P ID is required');
    });

    it('should handle database errors', async () => {
      // Mock payment check succeeds
      const limitSpy = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqSpy = jest.fn().mockReturnValue({ limit: limitSpy });

      mockDb.select.mockImplementationOnce(() => ({
        eq: eqSpy,
      }));

      // Mock delete operation fails
      mockDb.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed' }
      });

      const request = new Request('http://localhost:3000/api/accounting/ap?id=ap-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });
});
