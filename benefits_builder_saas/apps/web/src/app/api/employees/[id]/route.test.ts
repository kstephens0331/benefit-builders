/**
 * Tests for Individual Employee API
 * CRUD operations for single employee
 */

import { GET, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

const mockDb = {
  from: jest.fn(() => mockDb),
  select: jest.fn(() => mockDb),
  update: jest.fn(() => mockDb),
  delete: jest.fn(() => mockDb),
  eq: jest.fn(() => mockDb),
  single: jest.fn(),
};

describe('API: /api/employees/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockEmployee = {
    id: 'emp-123',
    company_id: 'comp-456',
    first_name: 'John',
    last_name: 'Doe',
    ssn: '123456789',
    gross_wages: 50000,
    tax_savings: 3825,
    allowable_benefit_amount: 3825,
    status: 'active',
    hire_date: '2024-01-15',
    created_at: '2024-01-15T10:00:00Z',
  };

  describe('GET /api/employees/[id]', () => {
    it('should fetch employee by ID', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockEmployee, error: null });

      const request = new Request('http://localhost:3000/api/employees/emp-123');
      const response = await GET(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.id).toBe('emp-123');
    });

    it('should mask SSN in response', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockEmployee, error: null });

      const request = new Request('http://localhost:3000/api/employees/emp-123');
      const response = await GET(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.ssn).toBe('***-**-6789');
    });

    it('should return 404 for non-existent employee', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/employees/non-existent');
      const response = await GET(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should include company information', async () => {
      const employeeWithCompany = {
        ...mockEmployee,
        company: {
          id: 'comp-456',
          company_name: 'Acme Corp',
        },
      };

      mockDb.single.mockResolvedValueOnce({ data: employeeWithCompany, error: null });

      const request = new Request('http://localhost:3000/api/employees/emp-123');
      const response = await GET(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.company.company_name).toBe('Acme Corp');
    });

    it('should calculate tax savings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockEmployee, error: null });

      const request = new Request('http://localhost:3000/api/employees/emp-123');
      const response = await GET(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.tax_savings).toBe(3825); // 7.65% of $50,000
    });
  });

  describe('PATCH /api/employees/[id]', () => {
    it('should update employee', async () => {
      const updates = {
        gross_wages: 55000,
        tax_savings: 4207.5,
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.gross_wages).toBe(55000);
    });

    it('should recalculate tax savings when wages change', async () => {
      const updates = { gross_wages: 60000 };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, gross_wages: 60000, tax_savings: 4590 },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.tax_savings).toBe(4590); // 7.65% of $60,000
    });

    it('should update name', async () => {
      const updates = {
        first_name: 'Jane',
        last_name: 'Smith',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.first_name).toBe('Jane');
      expect(data.data.last_name).toBe('Smith');
    });

    it('should update status', async () => {
      const updates = {
        status: 'terminated',
        termination_date: '2024-11-30',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.status).toBe('terminated');
      expect(data.data.termination_date).toBe('2024-11-30');
    });

    it('should validate SSN format', async () => {
      const updates = { ssn: 'invalid' };

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });

      expect(response.status).toBe(400);
    });

    it('should validate wages are positive', async () => {
      const updates = { gross_wages: -1000 };

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });

      expect(response.status).toBe(400);
    });

    it('should not allow changing company_id', async () => {
      const updates = { company_id: 'different-company' };

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });

      expect(response.status).toBe(400);
    });

    it('should sanitize input fields', async () => {
      const updates = {
        first_name: '<script>alert("xss")</script>John',
        last_name: 'Doe<img src=x>',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, first_name: 'John', last_name: 'Doe' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.first_name).not.toContain('<script>');
      expect(data.data.last_name).not.toContain('<img');
    });

    it('should handle date field sanitization', async () => {
      const updates = {
        hire_date: '2024-01-15T00:00:00.000Z', // ISO timestamp
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, hire_date: '2024-01-15' }, // Should convert to date
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.hire_date).toBe('2024-01-15');
    });
  });

  describe('DELETE /api/employees/[id]', () => {
    it('should delete employee', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, status: 'deleted', deleted_at: new Date().toISOString() },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should return 404 for non-existent employee', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: { code: '23503' } });

      const request = new Request('http://localhost:3000/api/employees/non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'emp-123' } });

      expect(response.status).toBe(500);
    });

    it('should soft delete by default', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { ...mockEmployee, status: 'deleted', deleted_at: new Date().toISOString() },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'emp-123' } });
      const data = await response.json();

      expect(data.data.status).toBe('deleted');
      expect(data.data.deleted_at).toBeDefined();
    });

    it('should permanently delete if requested', async () => {
      const request = new Request(
        'http://localhost:3000/api/employees/emp-123?permanent=true',
        {
          method: 'DELETE',
        }
      );

      mockDb.single.mockResolvedValueOnce({ data: null, error: null });

      const response = await DELETE(request, { params: { id: 'emp-123' } });

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.single.mockRejectedValueOnce(new Error('Connection failed'));

      const request = new Request('http://localhost:3000/api/employees/emp-123');
      const response = await GET(request, { params: { id: 'emp-123' } });

      expect(response.status).toBe(500);
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/employees/emp-123', {
        method: 'PATCH',
        body: 'invalid json',
      });

      const response = await PATCH(request, { params: { id: 'emp-123' } });

      expect(response.status).toBe(400);
    });

    it('should handle missing ID parameter', async () => {
      const request = new Request('http://localhost:3000/api/employees/');
      const response = await GET(request, { params: { id: '' } });

      expect(response.status).toBe(400);
    });
  });
});
