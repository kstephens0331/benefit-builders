/**
 * Tests for Batch Invoice Email API
 * One-click email for all invoices in a period
 */

import { POST } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

// Mock fetch for calling individual email endpoints
global.fetch = jest.fn();

describe('API: /api/invoices/email-batch', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
  });

  it('should send emails for all invoices in specified period', async () => {
    const mockInvoices = [
      { id: 'inv-1' },
      { id: 'inv-2' },
      { id: 'inv-3' },
    ];

    const neqSpy = jest.fn().mockResolvedValue({ data: mockInvoices, error: null });
    const eqSpy = jest.fn(() => ({ neq: neqSpy }));

    mockDb.select.mockImplementation(() => ({
      eq: eqSpy,
    }));

    const request = new Request('http://localhost:3000/api/invoices/email-batch', {
      method: 'POST',
      body: JSON.stringify({ period: '2024-11' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.sent).toBe(3);
    expect(eqSpy).toHaveBeenCalledWith('period', '2024-11');
    expect(neqSpy).toHaveBeenCalledWith('status', 'sent');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should send emails for specific invoice IDs', async () => {
    const invoiceIds = ['inv-1', 'inv-2'];
    const request = new Request('http://localhost:3000/api/invoices/email-batch', {
      method: 'POST',
      body: JSON.stringify({ invoiceIds }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.sent).toBe(2);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/invoices/inv-1/email',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/invoices/inv-2/email',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should return error if neither period nor invoiceIds provided', async () => {
    const request = new Request('http://localhost:3000/api/invoices/email-batch', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('period');
    expect(data.error).toContain('invoiceIds');
  });

  it('should track failed sends and return error count', async () => {
    const mockInvoices = [
      { id: 'inv-1' },
      { id: 'inv-2' },
      { id: 'inv-3' },
    ];

    const neqSpy = jest.fn().mockResolvedValue({ data: mockInvoices, error: null });
    const eqSpy = jest.fn(() => ({ neq: neqSpy }));

    mockDb.select.mockImplementation(() => ({
      eq: eqSpy,
    }));

    // Mock one failure
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false, error: 'Email failed' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const request = new Request('http://localhost:3000/api/invoices/email-batch', {
      method: 'POST',
      body: JSON.stringify({ period: '2024-11' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.sent).toBe(2);
    expect(data.failed).toBe(1);
    expect(data.errors).toHaveLength(1);
  });

  it('should return empty result if no invoices found for period', async () => {
    const neqSpy = jest.fn().mockResolvedValue({ data: [], error: null });
    const eqSpy = jest.fn(() => ({ neq: neqSpy }));

    mockDb.select.mockImplementation(() => ({
      eq: eqSpy,
    }));

    const request = new Request('http://localhost:3000/api/invoices/email-batch', {
      method: 'POST',
      body: JSON.stringify({ period: '2024-99' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.sent).toBe(0);
    expect(data.message).toContain('No invoices to send');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const neqSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
    const eqSpy = jest.fn(() => ({ neq: neqSpy }));

    mockDb.select.mockImplementation(() => ({
      eq: eqSpy,
    }));

    const request = new Request('http://localhost:3000/api/invoices/email-batch', {
      method: 'POST',
      body: JSON.stringify({ period: '2024-11' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Database error');
  });

  it('should handle fetch errors for individual emails', async () => {
    const mockInvoices = [
      { id: 'inv-1' },
      { id: 'inv-2' },
    ];

    const neqSpy = jest.fn().mockResolvedValue({ data: mockInvoices, error: null });
    const eqSpy = jest.fn(() => ({ neq: neqSpy }));

    mockDb.select.mockImplementation(() => ({
      eq: eqSpy,
    }));

    // Mock fetch throwing error
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockRejectedValueOnce(new Error('Network error'));

    const request = new Request('http://localhost:3000/api/invoices/email-batch', {
      method: 'POST',
      body: JSON.stringify({ period: '2024-11' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.sent).toBe(1);
    expect(data.failed).toBe(1);
    expect(data.errors[0]).toContain('Network error');
  });
});
