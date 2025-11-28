/**
 * Tests for Payment Transactions API
 * Handles both A/R and A/P payments
 */

import { GET, POST, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/accounting/payments', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn().mockReturnThis(),
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

  describe('GET /api/accounting/payments', () => {
    it('should fetch all payment transactions', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          transaction_type: 'ar_payment',
          amount: 1000,
          payment_date: '2024-11-15',
          payment_method: 'check',
          check_number: '12345',
        },
        {
          id: 'pay-2',
          transaction_type: 'ap_payment',
          amount: 500,
          payment_date: '2024-11-14',
          payment_method: 'ach',
        },
      ];

      // Mock the chain: from -> select -> order -> resolved value
      mockDb.order.mockResolvedValue({ data: mockPayments, error: null });

      const request = new Request('http://localhost:3000/api/accounting/payments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('should filter by transaction type', async () => {
      // Create a proper chain mock
      const eqSpy = jest.fn().mockResolvedValue({
        data: [{ id: 'pay-1', transaction_type: 'ar_payment' }],
        error: null,
      });

      mockDb.eq.mockReturnValue(eqSpy);
      mockDb.order.mockReturnValue(mockDb);

      const request = new Request('http://localhost:3000/api/accounting/payments?type=ar_payment');
      await GET(request);

      expect(mockDb.eq).toHaveBeenCalledWith('transaction_type', 'ar_payment');
    });

    it('should filter by ar_id', async () => {
      const eqSpy = jest.fn().mockResolvedValue({
        data: [{ id: 'pay-1', ar_id: 'ar-123' }],
        error: null,
      });

      mockDb.eq.mockReturnValue(eqSpy);
      mockDb.order.mockReturnValue(mockDb);

      const request = new Request('http://localhost:3000/api/accounting/payments?ar_id=ar-123');
      await GET(request);

      expect(mockDb.eq).toHaveBeenCalledWith('ar_id', 'ar-123');
    });

    it('should filter by ap_id', async () => {
      const eqSpy = jest.fn().mockResolvedValue({
        data: [{ id: 'pay-2', ap_id: 'ap-456' }],
        error: null,
      });

      mockDb.eq.mockReturnValue(eqSpy);
      mockDb.order.mockReturnValue(mockDb);

      const request = new Request('http://localhost:3000/api/accounting/payments?ap_id=ap-456');
      await GET(request);

      expect(mockDb.eq).toHaveBeenCalledWith('ap_id', 'ap-456');
    });

    it('should order by payment_date desc', async () => {
      mockDb.order.mockResolvedValue({ data: [], error: null });

      const request = new Request('http://localhost:3000/api/accounting/payments');
      await GET(request);

      expect(mockDb.order).toHaveBeenCalledWith('payment_date', { ascending: false });
    });
  });

  describe('POST /api/accounting/payments', () => {
    const arPayment = {
      transaction_type: 'ar_payment',
      ar_id: 'ar-123',
      payment_date: '2024-11-20',
      amount: 1000,
      payment_method: 'check',
      check_number: '54321',
    };

    const apPayment = {
      transaction_type: 'ap_payment',
      ap_id: 'ap-456',
      payment_date: '2024-11-20',
      amount: 500,
      payment_method: 'ach',
      reference_number: 'ACH-789',
    };

    it('should record A/R payment', async () => {
      // Mock the payment insert
      const selectSpy = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'pay-new', ...arPayment },
          error: null,
        }),
      });
      mockDb.insert.mockReturnValue({ select: selectSpy });

      // Mock the AR record fetch
      const arSelectSpy = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { amount_paid: 0 },
            error: null,
          }),
        }),
      });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'accounts_receivable') {
          return { select: arSelectSpy, update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/accounting/payments', {
        method: 'POST',
        body: JSON.stringify(arPayment),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.transaction_type).toBe('ar_payment');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should record A/P payment', async () => {
      // Mock the payment insert
      const selectSpy = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'pay-new', ...apPayment },
          error: null,
        }),
      });
      mockDb.insert.mockReturnValue({ select: selectSpy });

      // Mock the AP record fetch
      const apSelectSpy = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { amount_paid: 0 },
            error: null,
          }),
        }),
      });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'accounts_payable') {
          return { select: apSelectSpy, update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/accounting/payments', {
        method: 'POST',
        body: JSON.stringify(apPayment),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.transaction_type).toBe('ap_payment');
    });

    it('should require ar_id or ap_id', async () => {
      const invalidPayment = {
        transaction_type: 'ar_payment',
        payment_date: '2024-11-20',
        amount: 1000,
        payment_method: 'check',
      };

      const request = new Request('http://localhost:3000/api/accounting/payments', {
        method: 'POST',
        body: JSON.stringify(invalidPayment),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('ar_id or ap_id is required');
    });

    it('should not allow both ar_id and ap_id', async () => {
      const invalidPayment = {
        ...arPayment,
        ap_id: 'ap-789',
      };

      const request = new Request('http://localhost:3000/api/accounting/payments', {
        method: 'POST',
        body: JSON.stringify(invalidPayment),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Cannot specify both');
    });

    it('should update A/R amount_paid after recording payment', async () => {
      // Mock the payment insert
      const selectSpy = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'pay-new', ...arPayment },
          error: null,
        }),
      });
      mockDb.insert.mockReturnValue({ select: selectSpy });

      // Mock the AR record fetch and update
      const arSelectSpy = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { amount_paid: 0 },
            error: null,
          }),
        }),
      });

      const arUpdateSpy = jest.fn().mockReturnThis();
      const arEqSpy = jest.fn().mockResolvedValue({ data: null, error: null });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'accounts_receivable') {
          return {
            select: arSelectSpy,
            update: arUpdateSpy,
            eq: arEqSpy
          };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/accounting/payments', {
        method: 'POST',
        body: JSON.stringify(arPayment),
      });

      await POST(request);

      expect(arUpdateSpy).toHaveBeenCalledWith({ amount_paid: 1000 });
    });

    it('should handle database errors', async () => {
      const selectSpy = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      });
      mockDb.insert.mockReturnValue({ select: selectSpy });

      const request = new Request('http://localhost:3000/api/accounting/payments', {
        method: 'POST',
        body: JSON.stringify(arPayment),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });
});
