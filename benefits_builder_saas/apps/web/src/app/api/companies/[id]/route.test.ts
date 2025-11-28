/**
 * Tests for Individual Company API
 * CRUD operations for single company
 */

import { GET, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/companies/[id]', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockCompany = {
    id: 'comp-123',
    company_name: 'Acme Corp',
    contact_name: 'John Doe',
    contact_email: 'john@acme.com',
    contact_phone: '555-1234',
    billing_model: '5/3',
    status: 'active',
    ein: '12-3456789',
    address: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zip: '12345',
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('GET /api/companies/[id]', () => {
    it('should fetch company by ID', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockCompany, error: null });

      const request = new Request('http://localhost:3000/api/companies/comp-123');
      const response = await GET(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.id).toBe('comp-123');
      expect(data.data.company_name).toBe('Acme Corp');
    });

    it('should include employee count', async () => {
      const companyWithEmployees = {
        ...mockCompany,
        employee_count: 25,
      };

      mockDb.single.mockResolvedValueOnce({ data: companyWithEmployees, error: null });

      const request = new Request('http://localhost:3000/api/companies/comp-123');
      const response = await GET(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.employee_count).toBe(25);
    });

    it('should include total savings calculation', async () => {
      const companyWithSavings = {
        ...mockCompany,
        total_savings: 95625, // 25 employees * avg $3,825
      };

      mockDb.single.mockResolvedValueOnce({ data: companyWithSavings, error: null });

      const request = new Request('http://localhost:3000/api/companies/comp-123');
      const response = await GET(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.total_savings).toBe(95625);
    });

    it('should include QuickBooks integration status', async () => {
      const companyWithQB = {
        ...mockCompany,
        quickbooks_customer_id: 'qb-123',
        quickbooks_synced_at: '2024-11-24T10:00:00Z',
      };

      mockDb.single.mockResolvedValueOnce({ data: companyWithQB, error: null });

      const request = new Request('http://localhost:3000/api/companies/comp-123');
      const response = await GET(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.quickbooks_customer_id).toBe('qb-123');
      expect(data.data.quickbooks_synced_at).toBeDefined();
    });

    it('should return 404 for non-existent company', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/companies/non-existent');
      const response = await GET(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should include employees if requested', async () => {
      const companyWithEmployees = {
        ...mockCompany,
        employees: [
          { id: 'emp-1', first_name: 'Jane', last_name: 'Smith', gross_wages: 50000 },
          { id: 'emp-2', first_name: 'Bob', last_name: 'Johnson', gross_wages: 60000 },
        ],
      };

      mockDb.single.mockResolvedValueOnce({ data: companyWithEmployees, error: null });

      const request = new Request(
        'http://localhost:3000/api/companies/comp-123?include=employees'
      );
      const response = await GET(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.employees).toHaveLength(2);
    });
  });

  describe('PATCH /api/companies/[id]', () => {
    it('should update company details', async () => {
      const updates = {
        contact_name: 'Jane Smith',
        contact_email: 'jane@acme.com',
        contact_phone: '555-123-5678',
      };

      const selectSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ...mockCompany, ...updates },
        error: null,
      });

      mockDb.update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: selectSpy,
        }),
      });
      mockDb.select = selectSpy;
      selectSpy.mockReturnValue({ single: singleSpy });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.contact_name).toBe('Jane Smith');
      expect(data.data.contact_email).toBe('jane@acme.com');
    });

    it('should update billing model', async () => {
      const updates = { billing_model: '5/0' };

      const selectSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ...mockCompany, ...updates },
        error: null,
      });

      mockDb.update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: selectSpy,
        }),
      });
      selectSpy.mockReturnValue({ single: singleSpy });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.billing_model).toBe('5/0');
    });

    it('should validate billing model format', async () => {
      const updates = { billing_model: 'invalid' };

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(400);
    });

    it('should update company status', async () => {
      const updates = { status: 'inactive' };

      const selectSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ...mockCompany, ...updates },
        error: null,
      });

      mockDb.update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: selectSpy,
        }),
      });
      selectSpy.mockReturnValue({ single: singleSpy });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.status).toBe('inactive');
    });

    it('should update address', async () => {
      const updates = {
        address: '456 Oak Ave',
        city: 'Newtown',
        state: 'NY',
        zip: '54321',
      };

      const selectSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: { ...mockCompany, ...updates },
        error: null,
      });

      mockDb.update.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: selectSpy,
        }),
      });
      selectSpy.mockReturnValue({ single: singleSpy });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.address).toBe('456 Oak Ave');
      expect(data.data.city).toBe('Newtown');
      expect(data.data.state).toBe('NY');
    });

    it('should validate email format', async () => {
      const updates = { contact_email: 'invalid-email' };

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(400);
    });

    it('should validate phone format', async () => {
      const updates = { contact_phone: '123' };

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(400);
    });

    it('should validate EIN format', async () => {
      const updates = { ein: 'invalid' };

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(400);
    });

    it('should validate ZIP code format', async () => {
      const updates = { zip: '123' };

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(400);
    });

    it('should sanitize input', async () => {
      const updates = {
        company_name: '<script>alert("xss")</script>Acme',
        contact_name: 'John<img src=x>',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockCompany, company_name: 'Acme', contact_name: 'John' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.company_name).not.toContain('<script>');
      expect(data.data.contact_name).not.toContain('<img');
    });
  });

  describe('DELETE /api/companies/[id]', () => {
    it('should delete company', async () => {
      // First call to check if company exists
      const selectSpy1 = jest.fn().mockReturnThis();
      const singleSpy1 = jest.fn().mockResolvedValue({
        data: mockCompany,
        error: null,
      });
      selectSpy1.mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: singleSpy1 }),
      });

      // Second call to update (soft delete)
      const selectSpy2 = jest.fn().mockReturnThis();
      const singleSpy2 = jest.fn().mockResolvedValue({
        data: { ...mockCompany, status: 'deleted', deleted_at: new Date().toISOString() },
        error: null,
      });
      selectSpy2.mockReturnValue({ single: singleSpy2 });

      mockDb.from.mockReturnValueOnce({
        select: selectSpy1,
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: selectSpy2,
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should prevent deletion if company has employees', async () => {
      // First call to check if company exists
      const selectSpy1 = jest.fn().mockReturnThis();
      const singleSpy1 = jest.fn().mockResolvedValue({
        data: mockCompany,
        error: null,
      });
      selectSpy1.mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: singleSpy1 }),
      });

      // Second call to update (soft delete) - this should return error
      const selectSpy2 = jest.fn().mockReturnThis();
      const singleSpy2 = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'foreign key constraint' },
      });
      selectSpy2.mockReturnValue({ single: singleSpy2 });

      mockDb.from.mockReturnValueOnce({
        select: selectSpy1,
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: selectSpy2,
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(409);
    });

    it('should prevent deletion if company has invoices', async () => {
      // First call to check if company exists
      const selectSpy1 = jest.fn().mockReturnThis();
      const singleSpy1 = jest.fn().mockResolvedValue({
        data: mockCompany,
        error: null,
      });
      selectSpy1.mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: singleSpy1 }),
      });

      // Second call to update (soft delete) - this should return error
      const selectSpy2 = jest.fn().mockReturnThis();
      const singleSpy2 = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'foreign key constraint' },
      });
      selectSpy2.mockReturnValue({ single: singleSpy2 });

      mockDb.from.mockReturnValueOnce({
        select: selectSpy1,
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: selectSpy2,
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(409);
    });

    it('should return 404 for non-existent company', async () => {
      // Mock the check if company exists - returns null (not found)
      const selectSpy = jest.fn().mockReturnThis();
      const singleSpy = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      selectSpy.mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: singleSpy }),
      });

      mockDb.from.mockReturnValueOnce({
        select: selectSpy,
      });

      const request = new Request('http://localhost:3000/api/companies/non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should cascade delete if requested', async () => {
      // First call to check if company exists
      const selectSpy1 = jest.fn().mockReturnThis();
      const singleSpy1 = jest.fn().mockResolvedValue({
        data: mockCompany,
        error: null,
      });
      selectSpy1.mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: singleSpy1 }),
      });

      // Second call to update (soft delete)
      const selectSpy2 = jest.fn().mockReturnThis();
      const singleSpy2 = jest.fn().mockResolvedValue({
        data: { ...mockCompany, status: 'deleted', deleted_at: new Date().toISOString() },
        error: null,
      });
      selectSpy2.mockReturnValue({ single: singleSpy2 });

      mockDb.from.mockReturnValueOnce({
        select: selectSpy1,
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: selectSpy2,
          }),
        }),
      });

      const request = new Request(
        'http://localhost:3000/api/companies/comp-123?cascade=true',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(200);
    });

    it('should soft delete by default', async () => {
      // First call to check if company exists
      const selectSpy1 = jest.fn().mockReturnThis();
      const singleSpy1 = jest.fn().mockResolvedValue({
        data: mockCompany,
        error: null,
      });
      selectSpy1.mockReturnValue({
        eq: jest.fn().mockReturnValue({ single: singleSpy1 }),
      });

      // Second call to update (soft delete)
      const selectSpy2 = jest.fn().mockReturnThis();
      const singleSpy2 = jest.fn().mockResolvedValue({
        data: { ...mockCompany, status: 'deleted', deleted_at: new Date().toISOString() },
        error: null,
      });
      selectSpy2.mockReturnValue({ single: singleSpy2 });

      mockDb.from.mockReturnValueOnce({
        select: selectSpy1,
      }).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: selectSpy2,
          }),
        }),
      });

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'comp-123' } });
      const data = await response.json();

      expect(data.data.status).toBe('deleted');
      expect(data.data.deleted_at).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      mockDb.single.mockRejectedValueOnce(new Error('Database error'));

      const request = new Request('http://localhost:3000/api/companies/comp-123');
      const response = await GET(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(500);
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: 'invalid json',
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(400);
    });

    it('should validate required fields', async () => {
      const updates = { company_name: '' };

      const request = new Request('http://localhost:3000/api/companies/comp-123', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request, { params: { id: 'comp-123' } });

      expect(response.status).toBe(400);
    });
  });
});
