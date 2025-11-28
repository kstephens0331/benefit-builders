/**
 * Tests for Settings API
 * Company settings, billing configuration, email SMTP
 */

import { GET, PATCH } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/settings', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      from: jest.fn(() => mockDb),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockSettings = {
    id: 'settings-1',
    company: {
      name: 'Benefits Builder',
      logo_url: 'https://example.com/logo.png',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345',
      phone: '555-1234',
      email: 'support@benefitsbuilder.com',
      website: 'https://benefitsbuilder.com',
      tax_id: '12-3456789',
    },
    billing: {
      default_payment_terms: 'Net 30',
      late_fee_rate: 1.5,
      invoice_prefix: 'INV-',
      invoice_footer: 'Thank you for your business',
      default_billing_model: '5/3',
    },
    email: {
      smtp_host: 'smtp.example.com',
      smtp_port: 587,
      smtp_user: 'noreply@benefitsbuilder.com',
      smtp_password: 'encrypted_password',
      from_email: 'noreply@benefitsbuilder.com',
      from_name: 'Benefits Builder',
      use_tls: true,
    },
    quickbooks: {
      enabled: true,
      connected: true,
      realm_id: 'qb_realm_123',
      last_sync: '2024-11-24T10:00:00Z',
      auto_sync: true,
      sync_interval: 60,
    },
    notifications: {
      send_invoice_reminders: true,
      reminder_days_before: 7,
      send_payment_confirmations: true,
      send_overdue_notices: true,
      overdue_notice_days: 30,
    },
    updated_at: '2024-11-24T12:00:00Z',
  };

  describe('GET /api/settings', () => {
    it('should fetch all settings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockSettings, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.company.name).toBe('Benefits Builder');
    });

    it('should return company settings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockSettings, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.company).toBeDefined();
      expect(data.data.company.address).toBe('123 Main St');
    });

    it('should return billing settings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockSettings, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.billing).toBeDefined();
      expect(data.data.billing.default_payment_terms).toBe('Net 30');
    });

    it('should return email settings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockSettings, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.email).toBeDefined();
      expect(data.data.email.smtp_host).toBe('smtp.example.com');
    });

    it('should mask SMTP password', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockSettings, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.email.smtp_password).toBe('********');
    });

    it('should return QuickBooks settings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockSettings, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.quickbooks).toBeDefined();
      expect(data.data.quickbooks.connected).toBe(true);
    });

    it('should return notification settings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: mockSettings, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.notifications).toBeDefined();
      expect(data.data.notifications.send_invoice_reminders).toBe(true);
    });

    it('should require authentication', async () => {
      const request = new Request('http://localhost:3000/api/settings');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });

    it('should handle missing settings', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });

  describe('PATCH /api/settings - Company', () => {
    it('should update company settings', async () => {
      const updates = {
        company: {
          name: 'Updated Company Name',
          address: '456 Oak Ave',
        },
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockSettings, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(updates);
    });

    it('should validate company name', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { name: '' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate phone format', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { phone: 'invalid' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate email format', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { email: 'invalid-email' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate ZIP code format', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { zip: '123' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate state code', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { state: 'XX' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate tax ID format', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { tax_id: 'invalid' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/settings - Billing', () => {
    it('should update billing settings', async () => {
      const updates = {
        billing: {
          default_payment_terms: 'Net 15',
          late_fee_rate: 2.0,
        },
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockSettings, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(updates);
    });

    it('should validate payment terms', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          billing: { default_payment_terms: 'Invalid Terms' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate late fee rate', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          billing: { late_fee_rate: -1 },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate billing model', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          billing: { default_billing_model: '10/10' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate invoice prefix', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          billing: { invoice_prefix: '' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/settings - Email', () => {
    it('should update email settings', async () => {
      const updates = {
        email: {
          smtp_host: 'smtp.newhost.com',
          smtp_port: 465,
        },
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockSettings, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(updates);
    });

    it('should validate SMTP host', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          email: { smtp_host: '' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate SMTP port', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          email: { smtp_port: 99999 },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate from email', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          email: { from_email: 'invalid-email' },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should encrypt SMTP password', async () => {
      const updates = {
        email: {
          smtp_password: 'newpassword',
        },
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockSettings, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { authorization: 'Bearer token' },
      });

      await PATCH(request);

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.objectContaining({
            smtp_password: expect.not.stringContaining('newpassword'),
          }),
        })
      );
    });
  });

  describe('PATCH /api/settings - Notifications', () => {
    it('should update notification settings', async () => {
      const updates = {
        notifications: {
          send_invoice_reminders: false,
          reminder_days_before: 14,
        },
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...mockSettings, ...updates },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(updates);
    });

    it('should validate reminder days', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          notifications: { reminder_days_before: -1 },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate overdue notice days', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          notifications: { overdue_notice_days: 0 },
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      mockDb.single.mockRejectedValueOnce(new Error('Database error'));

      const request = new Request('http://localhost:3000/api/settings', {
        headers: { authorization: 'Bearer token' },
      });
      const response = await GET(request);

      expect(response.status).toBe(500);
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: 'invalid json',
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should handle empty updates', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('should validate nested objects', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: 'not an object',
        }),
        headers: { authorization: 'Bearer token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Permissions', () => {
    it('should require admin role', async () => {
      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { name: 'New Name' },
        }),
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(403);
    });

    it('should allow admin updates', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { name: 'New Name' },
        }),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Audit Logging', () => {
    it('should log settings changes', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { name: 'New Name' },
        }),
        headers: { authorization: 'Bearer admin-token' },
      });

      await PATCH(request);

      expect(mockDb.from).toHaveBeenCalledWith('audit_log');
    });

    it('should record user who made changes', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const request = new Request('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          company: { name: 'New Name' },
        }),
        headers: { authorization: 'Bearer admin-token' },
      });

      await PATCH(request);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: expect.any(String),
          action: 'update_settings',
        })
      );
    });
  });
});
