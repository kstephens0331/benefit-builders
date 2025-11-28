/**
 * Tests for Invoice Email API
 * Sends professional HTML emails with PDF links
 */

import { POST } from './route';
import { createServiceClient } from '@/lib/supabase';
import * as nodemailer from 'nodemailer';

jest.mock('@/lib/supabase');
jest.mock('nodemailer');

describe('API: /api/invoices/[id]/email', () => {
  let mockDb: any;
  const mockTransporter = {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test@test.com';
    process.env.EMAIL_PASSWORD = 'password';
    process.env.EMAIL_FROM = 'noreply@benefitsbuilder.com';
    process.env.EMAIL_FROM_NAME = 'Benefits Builder';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
  });

  const mockInvoice = {
    id: 'inv-123',
    period: '2024-11',
    issued_at: '2024-11-01T00:00:00Z',
    subtotal_cents: 100000,
    tax_cents: 8000,
    total_cents: 108000,
    status: 'draft',
    companies: {
      id: 'comp-123',
      name: 'Test Company Inc',
      contact_email: 'test@company.com',
    },
  };

  const mockLines = [
    {
      description: 'FICA Administration - November 2024',
      quantity: 25,
      amount_cents: 100000,
    },
  ];

  it('should send email with invoice details successfully', async () => {
    const eqSpy = jest.fn().mockResolvedValue({ data: null, error: null });
    const singleSpy = jest.fn().mockResolvedValue({ data: mockInvoice, error: null });
    const selectSpy = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: mockLines, error: null }),
    }));

    mockDb.select.mockImplementation((fields: string) => {
      if (fields.includes('companies')) {
        return {
          eq: jest.fn().mockReturnThis(),
          single: singleSpy,
        };
      }
      return {
        eq: jest.fn().mockResolvedValue({ data: mockLines, error: null }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      eq: eqSpy,
    }));

    const request = new Request('http://localhost:3000/api/invoices/inv-123/email', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'inv-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@company.com',
        subject: expect.stringContaining('2024-11'),
      })
    );
  });

  it('should return error if invoice not found', async () => {
    mockDb.single.mockResolvedValue({ data: null, error: null });

    const request = new Request('http://localhost:3000/api/invoices/inv-999/email', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'inv-999' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Invoice not found');
  });

  it('should return error if company has no email', async () => {
    const invoiceNoEmail = {
      ...mockInvoice,
      companies: { ...mockInvoice.companies, contact_email: null },
    };

    mockDb.single.mockResolvedValue({ data: invoiceNoEmail, error: null });

    const request = new Request('http://localhost:3000/api/invoices/inv-123/email', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'inv-123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('no contact email');
  });

  it('should include PDF download link in email', async () => {
    const singleSpy = jest.fn().mockResolvedValue({ data: mockInvoice, error: null });

    mockDb.select.mockImplementation((fields: string) => {
      if (fields.includes('companies')) {
        return {
          eq: jest.fn().mockReturnThis(),
          single: singleSpy,
        };
      }
      return {
        eq: jest.fn().mockResolvedValue({ data: mockLines, error: null }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const request = new Request('http://localhost:3000/api/invoices/inv-123/email', {
      method: 'POST',
    });

    await POST(request, { params: { id: 'inv-123' } });

    expect(mockTransporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('/api/invoices/inv-123/pdf'),
      })
    );
  });

  it('should update invoice status to sent', async () => {
    const eqSpy = jest.fn().mockResolvedValue({ data: null, error: null });
    const singleSpy = jest.fn().mockResolvedValue({ data: mockInvoice, error: null });

    mockDb.select.mockImplementation((fields: string) => {
      if (fields.includes('companies')) {
        return {
          eq: jest.fn().mockReturnThis(),
          single: singleSpy,
        };
      }
      return {
        eq: jest.fn().mockResolvedValue({ data: mockLines, error: null }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      eq: eqSpy,
    }));

    const request = new Request('http://localhost:3000/api/invoices/inv-123/email', {
      method: 'POST',
    });

    await POST(request, { params: { id: 'inv-123' } });

    expect(mockDb.update).toHaveBeenCalledWith({ status: 'sent' });
    expect(eqSpy).toHaveBeenCalledWith('id', 'inv-123');
  });

  it('should handle email sending errors gracefully', async () => {
    const singleSpy = jest.fn().mockResolvedValue({ data: mockInvoice, error: null });

    mockDb.select.mockImplementation((fields: string) => {
      if (fields.includes('companies')) {
        return {
          eq: jest.fn().mockReturnThis(),
          single: singleSpy,
        };
      }
      return {
        eq: jest.fn().mockResolvedValue({ data: mockLines, error: null }),
      };
    });

    mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

    const request = new Request('http://localhost:3000/api/invoices/inv-123/email', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'inv-123' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('SMTP connection failed');
  });

  it('should include invoice amount and period in email', async () => {
    const singleSpy = jest.fn().mockResolvedValue({ data: mockInvoice, error: null });

    mockDb.select.mockImplementation((fields: string) => {
      if (fields.includes('companies')) {
        return {
          eq: jest.fn().mockReturnThis(),
          single: singleSpy,
        };
      }
      return {
        eq: jest.fn().mockResolvedValue({ data: mockLines, error: null }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const request = new Request('http://localhost:3000/api/invoices/inv-123/email', {
      method: 'POST',
    });

    await POST(request, { params: { id: 'inv-123' } });

    const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
    expect(sendMailCall.html).toContain('1080.00');
    expect(sendMailCall.html).toContain('2024-11');
  });

  it('should handle companies as array', async () => {
    const invoiceWithArray = {
      ...mockInvoice,
      companies: [mockInvoice.companies],
    };

    const singleSpy = jest.fn().mockResolvedValue({ data: invoiceWithArray, error: null });

    mockDb.select.mockImplementation((fields: string) => {
      if (fields.includes('companies')) {
        return {
          eq: jest.fn().mockReturnThis(),
          single: singleSpy,
        };
      }
      return {
        eq: jest.fn().mockResolvedValue({ data: mockLines, error: null }),
      };
    });

    mockDb.update.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const request = new Request('http://localhost:3000/api/invoices/inv-123/email', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'inv-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
