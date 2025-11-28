/**
 * Tests for Employees API
 * Manages employee CRUD operations
 */

import { GET, POST, PATCH } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/employees', () => {
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

  describe('GET /api/employees', () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        company_id: 'comp-1',
        first_name: 'John',
        last_name: 'Doe',
        gross_pay: 50000,
        active: true,
      },
      {
        id: 'emp-2',
        company_id: 'comp-1',
        first_name: 'Jane',
        last_name: 'Smith',
        gross_pay: 60000,
        active: true,
      },
    ];

    it('should fetch all employees', async () => {
      mockDb.select.mockImplementation(() => ({
        ...mockDb,
        order: jest.fn().mockResolvedValue({ data: mockEmployees, error: null }),
      }));

      const request = new Request('http://localhost:3000/api/employees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockEmployees);
    });

    it('should filter by company_id', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ data: [mockEmployees[0]], error: null });
      const orderSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/employees?company_id=comp-1');
      const response = await GET(request);
      const data = await response.json();

      expect(orderSpy).toHaveBeenCalledWith('last_name');
      expect(eqSpy).toHaveBeenCalledWith('company_id', 'comp-1');
      expect(data.ok).toBe(true);
      expect(data.data).toEqual([mockEmployees[0]]);
    });

    it('should order by last_name', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockEmployees, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/employees');
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('last_name');
    });

    it('should handle database errors', async () => {
      mockDb.select.mockImplementation(() => ({
        ...mockDb,
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }));

      const request = new Request('http://localhost:3000/api/employees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('POST /api/employees', () => {
    const newEmployee = {
      company_id: 'comp-123',
      first_name: 'Bob',
      last_name: 'Johnson',
      gross_pay: 45000,
      filing_status: 'single',
      dependents: 0,
    };

    it('should create new employee', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'emp-new', ...newEmployee, active: true },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees', {
        method: 'POST',
        body: JSON.stringify(newEmployee),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.first_name).toBe('Bob');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should set default values', async () => {
      const minimal = {
        company_id: 'comp-123',
        first_name: 'Alice',
        last_name: 'Wonder',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'emp-new2', ...minimal, filing_status: 'single', dependents: 0, gross_pay: 0, active: true },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees', {
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

      const request = new Request('http://localhost:3000/api/employees', {
        method: 'POST',
        body: JSON.stringify(newEmployee),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('PATCH /api/employees', () => {
    it('should update employee', async () => {
      const updates = {
        id: 'emp-1',
        gross_pay: 55000,
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'emp-1', gross_pay: 55000 },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees', {
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
      const request = new Request('http://localhost:3000/api/employees', {
        method: 'PATCH',
        body: JSON.stringify({ gross_pay: 55000 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('ID is required');
    });

    it('should sanitize date fields', async () => {
      const updates = {
        id: 'emp-1',
        dob: '',
        hire_date: 'undefined',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'emp-1', dob: null, hire_date: null },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });
});
