/**
 * Tests for Benefits API
 * Manages employee benefits (individual benefit assignments)
 */

import { GET, POST, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/benefits', () => {
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

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  describe('GET /api/benefits', () => {
    const mockBenefits = [
      {
        id: 'ben-1',
        employee_id: 'emp-1',
        plan_code: 'HEALTH',
        per_pay_amount: 100,
        reduces_fit: true,
        reduces_fica: true,
        effective_date: '2024-01-01',
      },
      {
        id: 'ben-2',
        employee_id: 'emp-1',
        plan_code: 'DENTAL',
        per_pay_amount: 50,
        reduces_fit: true,
        reduces_fica: true,
        effective_date: '2024-01-01',
      },
    ];

    it('should fetch benefits for an employee', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockBenefits, error: null });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });

      mockDb.select.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/benefits?employee_id=emp-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockBenefits);
      expect(eqSpy).toHaveBeenCalledWith('employee_id', 'emp-1');
      expect(orderSpy).toHaveBeenCalledWith('plan_code');
    });

    it('should require employee_id', async () => {
      const request = new Request('http://localhost:3000/api/benefits');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Employee ID is required');
    });

    it('should handle database errors', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
      const eqSpy = jest.fn().mockReturnValue({ order: orderSpy });

      mockDb.select.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/benefits?employee_id=emp-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('POST /api/benefits', () => {
    const newBenefit = {
      employee_id: 'emp-1',
      plan_code: 'HEALTH',
      per_pay_amount: 150,
      reduces_fit: true,
      reduces_fica: false,
      effective_date: '2024-01-15',
    };

    it('should create new benefit', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'ben-new', ...newBenefit },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/benefits', {
        method: 'POST',
        body: JSON.stringify(newBenefit),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.plan_code).toBe('HEALTH');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should set default values', async () => {
      const minimal = {
        employee_id: 'emp-1',
        plan_code: 'DENTAL',
      };

      mockDb.single.mockResolvedValueOnce({
        data: {
          id: 'ben-new',
          ...minimal,
          per_pay_amount: 0,
          reduces_fit: true,
          reduces_fica: true,
          effective_date: new Date().toISOString().split('T')[0],
        },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/benefits', {
        method: 'POST',
        body: JSON.stringify(minimal),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

      const request = new Request('http://localhost:3000/api/benefits', {
        method: 'POST',
        body: JSON.stringify(newBenefit),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('PATCH /api/benefits', () => {
    it('should update benefit', async () => {
      const updates = {
        id: 'ben-1',
        per_pay_amount: 200,
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'ben-1', per_pay_amount: 200 },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/benefits', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should require ID', async () => {
      const request = new Request('http://localhost:3000/api/benefits', {
        method: 'PATCH',
        body: JSON.stringify({ per_pay_amount: 200 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Benefit ID is required');
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

      const request = new Request('http://localhost:3000/api/benefits', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'ben-1', per_pay_amount: 200 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('DELETE /api/benefits', () => {
    it('should delete benefit', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ error: null });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/benefits?id=ben-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toBe('Benefit deleted successfully');
      expect(mockDb.delete).toHaveBeenCalled();
      expect(eqSpy).toHaveBeenCalledWith('id', 'ben-1');
    });

    it('should require ID', async () => {
      const request = new Request('http://localhost:3000/api/benefits', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Benefit ID is required');
    });

    it('should handle database errors', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/benefits?id=ben-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });
});
