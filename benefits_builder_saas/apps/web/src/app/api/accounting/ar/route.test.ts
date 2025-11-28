/**
 * API Route Tests: Accounts Receivable (A/R)
 * Tests all CRUD operations for the A/R endpoint
 */

import { GET, POST, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase');

describe('API: /api/accounting/ar', () => {
  let mockDb: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock database client
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

  describe('GET /api/accounting/ar', () => {
    it('should fetch all A/R records successfully', async () => {
      const mockData = [
        {
          id: '123',
          company_id: 'abc',
          invoice_number: 'INV-001',
          invoice_date: '2024-01-01',
          due_date: '2024-01-31',
          amount: 1000,
          amount_paid: 0,
          amount_due: 1000,
          status: 'open',
          companies: { name: 'Test Company' },
        },
      ];

      // GET doesn't use .single(), it directly awaits the query
      mockDb.order.mockResolvedValue({ data: mockData, error: null });

      const request = new Request('http://localhost:3002/api/accounting/ar');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockDb.from).toHaveBeenCalledWith('accounts_receivable');
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.order).toHaveBeenCalledWith('invoice_date', { ascending: false });
    });

    it('should filter A/R records by status', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ data: [], error: null });

      mockDb.order.mockReturnValue({ eq: eqSpy });

      const request = new Request('http://localhost:3002/api/accounting/ar?status=overdue');
      await GET(request);

      expect(mockDb.order).toHaveBeenCalledWith('invoice_date', { ascending: false });
      expect(eqSpy).toHaveBeenCalledWith('status', 'overdue');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const request = new Request('http://localhost:3002/api/accounting/ar');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.ok).toBe(false);
      expect(json.error).toBe('Database error');
    });
  });

  describe('POST /api/accounting/ar', () => {
    it('should create a new A/R record successfully', async () => {
      const mockData = {
        id: '123',
        company_id: 'abc',
        invoice_number: 'INV-001',
        invoice_date: '2024-01-01',
        due_date: '2024-01-31',
        amount: 1000,
        status: 'open',
      };

      mockDb.single.mockResolvedValue({ data: mockData, error: null });

      const request = new Request('http://localhost:3002/api/accounting/ar', {
        method: 'POST',
        body: JSON.stringify({
          company_id: 'abc',
          invoice_number: 'INV-001',
          invoice_date: '2024-01-01',
          due_date: '2024-01-31',
          amount: 1000,
          description: 'Test invoice',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data).toEqual(mockData);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockDb.single.mockResolvedValue({
        data: null,
        error: { message: 'Validation failed' },
      });

      const request = new Request('http://localhost:3002/api/accounting/ar', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          invoice_number: 'INV-001',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.ok).toBe(false);
    });
  });

  describe('PATCH /api/accounting/ar', () => {
    it('should update an A/R record successfully', async () => {
      const mockData = {
        id: '123',
        status: 'paid',
        amount_paid: 1000,
      };

      mockDb.single.mockResolvedValue({ data: mockData, error: null });

      const request = new Request('http://localhost:3002/api/accounting/ar', {
        method: 'PATCH',
        body: JSON.stringify({
          id: '123',
          status: 'paid',
          amount_paid: 1000,
        }),
      });

      const response = await PATCH(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.eq).toHaveBeenCalledWith('id', '123');
    });

    it('should return 400 if ID is missing', async () => {
      const request = new Request('http://localhost:3002/api/accounting/ar', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'paid',
        }),
      });

      const response = await PATCH(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('A/R ID is required');
    });
  });

  describe('DELETE /api/accounting/ar', () => {
    it('should delete an A/R record successfully', async () => {
      // Mock the payment check query chain (no existing payments)
      const limitSpy = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqSpy = jest.fn().mockReturnValue({ limit: limitSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      // Mock the delete query chain
      const deleteEqSpy = jest.fn().mockResolvedValue({ error: null });
      const deleteSpy = jest.fn().mockReturnValue({ eq: deleteEqSpy });

      // Setup mock to return different chains for each call
      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: payment check
          return { select: selectSpy };
        } else {
          // Second call: delete
          return { delete: deleteSpy };
        }
      });

      const request = new Request('http://localhost:3002/api/accounting/ar?id=123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockDb.from).toHaveBeenCalledWith('payment_transactions');
      expect(mockDb.from).toHaveBeenCalledWith('accounts_receivable');
      expect(limitSpy).toHaveBeenCalledWith(1);
      expect(deleteEqSpy).toHaveBeenCalledWith('id', '123');
    });

    it('should prevent deletion if payments exist', async () => {
      // Mock the payment check query chain (existing payments)
      const limitSpy = jest.fn().mockResolvedValue({
        data: [{ id: 'payment-1' }],
        error: null
      });
      const eqSpy = jest.fn().mockReturnValue({ limit: limitSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation(() => {
        return { select: selectSpy };
      });

      const request = new Request('http://localhost:3002/api/accounting/ar?id=123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('Cannot delete A/R with existing payments');
    });

    it('should return 400 if ID is missing', async () => {
      const request = new Request('http://localhost:3002/api/accounting/ar', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('A/R ID is required');
    });
  });
});
