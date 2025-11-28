/**
 * Tests for Tax Rates API
 * Manages state tax rates for calculations
 */

import { GET, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/tax-rates', () => {
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

  describe('GET /api/tax-rates', () => {
    const mockTaxRates = [
      {
        id: 'rate-1',
        state: 'CA',
        tax_year: 2024,
        state_income_tax_rate: 0.093,
        state_sdi_rate: 0.009,
        state_sui_rate: 0.034,
      },
      {
        id: 'rate-2',
        state: 'NY',
        tax_year: 2024,
        state_income_tax_rate: 0.0685,
        state_sdi_rate: 0.005,
        state_sui_rate: 0.025,
      },
    ];

    it('should fetch all tax rates', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockTaxRates, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/tax-rates');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockTaxRates);
      expect(orderSpy).toHaveBeenCalledWith('state');
    });

    it('should filter by state', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ data: [mockTaxRates[0]], error: null });
      const orderSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/tax-rates?state=CA');
      const response = await GET(request);
      const data = await response.json();

      expect(orderSpy).toHaveBeenCalledWith('state');
      expect(eqSpy).toHaveBeenCalledWith('state', 'CA');
      expect(data.ok).toBe(true);
      expect(data.data).toEqual([mockTaxRates[0]]);
    });

    it('should filter by tax_year', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ data: mockTaxRates, error: null });
      const orderSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/tax-rates?tax_year=2024');
      const response = await GET(request);

      expect(eqSpy).toHaveBeenCalledWith('tax_year', 2024);
    });

    it('should filter by both state and tax_year', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({ data: [mockTaxRates[0]], error: null });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });
      const orderSpy = jest.fn().mockReturnValue({ eq: eqSpy1 });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/tax-rates?state=CA&tax_year=2024');
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('state');
      expect(eqSpy1).toHaveBeenCalledWith('state', 'CA');
      expect(eqSpy2).toHaveBeenCalledWith('tax_year', 2024);
    });

    it('should order by state', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockTaxRates, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/tax-rates');
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('state');
    });

    it('should handle database errors', async () => {
      mockDb.select.mockImplementation(() => ({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      }));

      const request = new Request('http://localhost:3000/api/tax-rates');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('PATCH /api/tax-rates', () => {
    it('should update existing tax rate', async () => {
      const updates = {
        state: 'CA',
        tax_year: 2024,
        state_income_tax_rate: 0.095,
      };

      // Mock the select query to find existing record
      mockDb.single.mockResolvedValueOnce({
        data: { state: 'CA', tax_year: 2024 },
        error: null,
      });

      // Mock the update query
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'rate-1', ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/tax-rates', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(data.data.state_income_tax_rate).toBe(0.095);
    });

    it('should insert new tax rate if not exists', async () => {
      const newRate = {
        state: 'TX',
        tax_year: 2024,
        state_income_tax_rate: 0.0,
        state_sdi_rate: 0.0,
      };

      // Mock the select query to not find existing record
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock the insert query
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'rate-new', ...newRate },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/tax-rates', {
        method: 'PATCH',
        body: JSON.stringify(newRate),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should require state', async () => {
      const updates = {
        tax_year: 2024,
        state_income_tax_rate: 0.095,
      };

      const request = new Request('http://localhost:3000/api/tax-rates', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('State and tax year are required');
    });

    it('should require tax_year', async () => {
      const updates = {
        state: 'CA',
        state_income_tax_rate: 0.095,
      };

      const request = new Request('http://localhost:3000/api/tax-rates', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('State and tax year are required');
    });

    it('should handle database errors on update', async () => {
      const updates = {
        state: 'CA',
        tax_year: 2024,
        state_income_tax_rate: 0.095,
      };

      // Mock the select query to find existing record
      mockDb.single.mockResolvedValueOnce({
        data: { state: 'CA', tax_year: 2024 },
        error: null,
      });

      // Mock the update query to fail
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const request = new Request('http://localhost:3000/api/tax-rates', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Update failed');
    });

    it('should handle JSON parse errors', async () => {
      const request = new Request('http://localhost:3000/api/tax-rates', {
        method: 'PATCH',
        body: 'invalid json',
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('DELETE /api/tax-rates', () => {
    it('should delete tax rate', async () => {
      mockDb.delete.mockImplementation(() => ({
        ...mockDb,
        eq: jest.fn().mockReturnThis(),
      }));

      const deleteSpy = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqSpy2 = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy1,
      }));

      const request = new Request('http://localhost:3000/api/tax-rates?state=CA&tax_year=2024', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toBe('Tax rate deleted successfully');
      expect(eqSpy1).toHaveBeenCalledWith('state', 'CA');
      expect(eqSpy2).toHaveBeenCalledWith('tax_year', 2024);
    });

    it('should require state', async () => {
      const request = new Request('http://localhost:3000/api/tax-rates?tax_year=2024', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('State and tax year are required');
    });

    it('should require tax_year', async () => {
      const request = new Request('http://localhost:3000/api/tax-rates?state=CA', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('State and tax year are required');
    });

    it('should handle database errors', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy1,
      }));

      const request = new Request('http://localhost:3000/api/tax-rates?state=CA&tax_year=2024', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Delete failed');
    });

    it('should handle URL parse errors', async () => {
      const request = new Request('http://localhost:3000/api/tax-rates', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });
  });
});
