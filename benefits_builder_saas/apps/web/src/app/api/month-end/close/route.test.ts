/**
 * Tests for Month-End Close API
 * Month-end closing process and workflow
 */

import { POST, GET } from './route';
import { createServiceClient } from '@/lib/supabase';
import { sendMonthEndReport } from '@/lib/email';

jest.mock('@/lib/supabase');
jest.mock('@/lib/email');

describe('API: /api/month-end/close', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  describe('POST /api/month-end/close', () => {
    it('should require closingDate parameter', async () => {
      const request = new Request('http://localhost:3000/api/month-end/close', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Closing date is required');
    });

    it('should prevent duplicate close', async () => {
      // Mock existing closed record
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'close-1', status: 'closed' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/month-end/close', {
        method: 'POST',
        body: JSON.stringify({ closingDate: '2024-11-30' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('already closed');
    });

    it('should complete close with no active companies', async () => {
      // Mock check for existing closing
      const singleSpy1 = jest.fn().mockResolvedValue({ data: null, error: null });

      // Mock insert new closing record
      const singleSpy2 = jest.fn().mockResolvedValue({ data: { id: 'close-1' }, error: null });

      // Mock no active companies
      const eqSpy = jest.fn().mockResolvedValue({ data: [], error: null });

      // Mock update closing record
      const updateSpy = jest.fn().mockResolvedValue({ data: {}, error: null });

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // First select: check existing closing
          return { eq: () => ({ single: singleSpy1 }) };
        } else if (selectCount === 2) {
          // Second select: get companies
          return { eq: eqSpy };
        }
        return mockDb;
      });

      mockDb.insert.mockImplementation(() => ({
        select: () => ({
          single: singleSpy2,
        }),
      }));

      mockDb.update.mockImplementation(() => ({
        eq: () => updateSpy(),
      }));

      const request = new Request('http://localhost:3000/api/month-end/close', {
        method: 'POST',
        body: JSON.stringify({ closingDate: '2024-11-30' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toContain('No active companies');
      expect(data.closingId).toBe('close-1');
    });

    it('should process companies and calculate totals', async () => {
      // Mock no existing record
      mockDb.single.mockResolvedValueOnce({ data: null, error: null });

      // Mock insert new closing record
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'close-1' },
        error: null,
      });

      // Mock companies query
      const companiesSpy = jest.fn().mockResolvedValue({
        data: [
          { id: 'comp-1', name: 'Company A', email: 'test@example.com', status: 'active', employee_rate: '5', employer_rate: '1' },
        ],
        error: null,
      });

      // Mock employees query
      const employeesSpy = jest.fn().mockResolvedValue({
        data: [
          { id: 'emp-1', health_insurance: '100', dental_insurance: '20', vision_insurance: '10' },
        ],
        error: null,
      });

      // Mock AR query
      const arSpy = jest.fn().mockResolvedValue({ data: [], error: null });

      // Mock AP query
      const apSpy = jest.fn().mockResolvedValue({ data: [], error: null });

      // Mock insert company details
      const insertSpy = jest.fn().mockResolvedValue({ data: {}, error: null });

      // Mock update closing record
      const updateSpy = jest.fn().mockResolvedValue({ data: {}, error: null });

      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check existing closing
          return { eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
        } else if (callCount === 2) {
          // Second call: get companies
          return { eq: companiesSpy };
        } else if (callCount === 3) {
          // Third call: get employees
          return { eq: () => ({ eq: employeesSpy }) };
        } else if (callCount === 4) {
          // Fourth call: get AR
          return { eq: () => ({ neq: arSpy }) };
        } else if (callCount === 5) {
          // Fifth call: get AP
          return { neq: apSpy };
        }
        return mockDb;
      });

      mockDb.insert.mockImplementation((data) => ({
        select: () => ({
          single: () => {
            if (data.closing_date) {
              return Promise.resolve({ data: { id: 'close-1' }, error: null });
            }
            return insertSpy();
          },
        }),
      }));

      mockDb.update.mockImplementation(() => ({
        eq: () => updateSpy(),
      }));

      const request = new Request('http://localhost:3000/api/month-end/close', {
        method: 'POST',
        body: JSON.stringify({ closingDate: '2024-11-30', sendEmails: false }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.closingId).toBe('close-1');
      expect(data.summary).toBeDefined();
      expect(data.summary.totalCompanies).toBe(1);
      expect(data.summary.totalEmployees).toBe(1);
    });

    it('should handle database errors', async () => {
      // Mock error on initial check
      mockDb.single.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new Request('http://localhost:3000/api/month-end/close', {
        method: 'POST',
        body: JSON.stringify({ closingDate: '2024-11-30' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Database connection failed');
    });
  });

  describe('GET /api/month-end/close', () => {
    it('should fetch month-end closings', async () => {
      const mockClosings = [
        { id: 'close-1', closing_date: '2024-11-30', status: 'closed' },
        { id: 'close-2', closing_date: '2024-10-31', status: 'closed' },
      ];

      const limitSpy = jest.fn().mockResolvedValue({ data: mockClosings, error: null });
      const orderSpy = jest.fn().mockReturnValue({ limit: limitSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/month-end/close');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockClosings);
      expect(orderSpy).toHaveBeenCalledWith('closing_date', { ascending: false });
      expect(limitSpy).toHaveBeenCalledWith(24);
    });

    it('should handle database errors', async () => {
      const limitSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
      const orderSpy = jest.fn().mockReturnValue({ limit: limitSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/month-end/close');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });
});
