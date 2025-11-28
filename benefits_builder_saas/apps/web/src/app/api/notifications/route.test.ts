/**
 * Tests for Notifications API
 * User notifications, reminders, and alerts
 */

import { GET, POST, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('API: /api/notifications', () => {
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
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockNotifications = [
    {
      id: 'notif-1',
      user_id: 'user-123',
      type: 'invoice_reminder',
      title: 'Invoice Due Soon',
      message: 'Invoice INV-001 is due in 7 days',
      data: {
        invoice_id: 'inv-001',
        company_id: 'comp-123',
        amount: 2500.0,
      },
      read: false,
      created_at: '2024-11-24T10:00:00Z',
    },
    {
      id: 'notif-2',
      user_id: 'user-123',
      type: 'payment_received',
      title: 'Payment Received',
      message: 'Payment of $2,500.00 received from Acme Corp',
      data: {
        payment_id: 'pay-001',
        company_id: 'comp-123',
        amount: 2500.0,
      },
      read: true,
      created_at: '2024-11-23T15:30:00Z',
    },
  ];

  describe('GET /api/notifications', () => {
    it('should fetch user notifications', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockNotifications, error: null });
      mockDb.select.mockImplementation(() => ({
        ...mockDb,
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications', {
        headers: { authorization: 'Bearer user-token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('should order by created_at desc', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockNotifications, error: null });
      mockDb.select.mockImplementation(() => ({
        ...mockDb,
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications', {
        headers: { authorization: 'Bearer user-token' },
      });
      await GET(request);

      expect(orderSpy).toHaveBeenCalledWith('created_at', expect.objectContaining({ ascending: false }));
    });

    it('should filter by read status', async () => {
      const eqSpy = jest.fn().mockReturnThis();
      const orderSpy = jest.fn().mockResolvedValue({
        data: [mockNotifications[0]],
        error: null,
      });

      mockDb.select.mockImplementation(() => ({
        eq: eqSpy,
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications?read=false', {
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(eqSpy).toHaveBeenCalledWith('read', false);
      expect(data.data).toHaveLength(1);
    });

    it('should filter by type', async () => {
      const eqSpy = jest.fn().mockReturnThis();
      const orderSpy = jest.fn().mockResolvedValue({
        data: [mockNotifications[0]],
        error: null,
      });

      mockDb.select.mockImplementation(() => ({
        eq: eqSpy,
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications?type=invoice_reminder', {
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(eqSpy).toHaveBeenCalledWith('type', 'invoice_reminder');
    });

    it('should limit results', async () => {
      const limitSpy = jest.fn().mockResolvedValue({ data: mockNotifications, error: null });
      const orderSpy = jest.fn().mockReturnValue({ limit: limitSpy });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications?limit=10', {
        headers: { authorization: 'Bearer user-token' },
      });

      await GET(request);

      expect(limitSpy).toHaveBeenCalledWith(10);
    });

    it('should return unread count', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockNotifications, error: null });
      mockDb.select.mockImplementation(() => ({
        ...mockDb,
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications', {
        headers: { authorization: 'Bearer user-token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(data.unread_count).toBe(1);
    });

    it('should require authentication', async () => {
      const request = new Request('http://localhost:3000/api/notifications');

      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should handle empty notifications', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: [], error: null });
      mockDb.select.mockImplementation(() => ({
        ...mockDb,
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications', {
        headers: { authorization: 'Bearer user-token' },
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });
  });

  describe('POST /api/notifications', () => {
    it('should create notification', async () => {
      const newNotification = {
        user_id: 'user-123',
        type: 'invoice_reminder',
        title: 'Invoice Due',
        message: 'Invoice INV-002 is due today',
        data: { invoice_id: 'inv-002' },
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'notif-3', ...newNotification },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(newNotification),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.ok).toBe(true);
      expect(data.data.id).toBe('notif-3');
    });

    it('should validate notification type', async () => {
      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-123',
          type: 'invalid_type',
          title: 'Test',
          message: 'Test message',
        }),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should require title', async () => {
      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-123',
          type: 'invoice_reminder',
          message: 'Test message',
        }),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should require message', async () => {
      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-123',
          type: 'invoice_reminder',
          title: 'Test',
        }),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should set default read status', async () => {
      const newNotification = {
        user_id: 'user-123',
        type: 'invoice_reminder',
        title: 'Test',
        message: 'Test message',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...newNotification, read: false },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(newNotification),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.read).toBe(false);
    });

    it('should sanitize message content', async () => {
      const newNotification = {
        user_id: 'user-123',
        type: 'invoice_reminder',
        title: 'Test',
        message: '<script>alert("xss")</script>Test',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { ...newNotification, message: 'Test' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(newNotification),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.message).not.toContain('<script>');
    });
  });

  describe('PATCH /api/notifications/:id', () => {
    it('should mark notification as read', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { ...mockNotifications[0], read: true },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/notifications/notif-1', {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await PATCH(request, { params: { id: 'notif-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.read).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should mark notification as unread', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { ...mockNotifications[1], read: false },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/notifications/notif-2', {
        method: 'PATCH',
        body: JSON.stringify({ read: false }),
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await PATCH(request, { params: { id: 'notif-2' } });
      const data = await response.json();

      expect(data.data.read).toBe(false);
    });

    it('should only allow own notifications', async () => {
      const request = new Request('http://localhost:3000/api/notifications/notif-1', {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
        headers: { authorization: 'Bearer other-user-token' },
      });

      const response = await PATCH(request, { params: { id: 'notif-1' } });

      expect(response.status).toBe(403);
    });

    it('should handle not found', async () => {
      mockDb.single.mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/notifications/invalid', {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await PATCH(request, { params: { id: 'invalid' } });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/notifications/mark-all-read', () => {
    it('should mark all as read', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({
        data: { count: 5 },
        error: null,
      });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.update.mockImplementation(() => ({
        eq: eqSpy1,
      }));

      const request = new Request('http://localhost:3000/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should only affect user notifications', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({
        data: { count: 3 },
        error: null,
      });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.update.mockImplementation(() => ({
        eq: eqSpy1,
      }));

      const request = new Request('http://localhost:3000/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { authorization: 'Bearer user-token' },
      });

      await PATCH(request);

      expect(eqSpy1).toHaveBeenCalledWith('user_id', expect.any(String));
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ data: null, error: null });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications/notif-1', {
        method: 'DELETE',
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await DELETE(request, { params: { id: 'notif-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should only allow own notifications', async () => {
      const request = new Request('http://localhost:3000/api/notifications/notif-1', {
        method: 'DELETE',
        headers: { authorization: 'Bearer other-user-token' },
      });

      const response = await DELETE(request, { params: { id: 'notif-1' } });

      expect(response.status).toBe(403);
    });

    it('should handle not found', async () => {
      const eqSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications/invalid', {
        method: 'DELETE',
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await DELETE(request, { params: { id: 'invalid' } });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/notifications/clear-all', () => {
    it('should clear all read notifications', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({
        data: { count: 10 },
        error: null,
      });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy1,
      }));

      const request = new Request('http://localhost:3000/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { authorization: 'Bearer user-token' },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should only delete read notifications', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({
        data: { count: 5 },
        error: null,
      });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy1,
      }));

      const request = new Request('http://localhost:3000/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { authorization: 'Bearer user-token' },
      });

      await DELETE(request);

      expect(eqSpy2).toHaveBeenCalledWith('read', true);
    });

    it('should only affect user notifications', async () => {
      const eqSpy2 = jest.fn().mockResolvedValue({
        data: { count: 5 },
        error: null,
      });
      const eqSpy1 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.delete.mockImplementation(() => ({
        eq: eqSpy1,
      }));

      const request = new Request('http://localhost:3000/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { authorization: 'Bearer user-token' },
      });

      await DELETE(request);

      expect(eqSpy1).toHaveBeenCalledWith('user_id', expect.any(String));
    });
  });

  describe('Notification Types', () => {
    it('should support invoice_reminder type', async () => {
      const notification = {
        ...mockNotifications[0],
        type: 'invoice_reminder',
      };

      mockDb.single.mockResolvedValueOnce({ data: notification, error: null });

      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notification),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should support payment_received type', async () => {
      const notification = {
        user_id: 'user-123',
        type: 'payment_received',
        title: 'Payment',
        message: 'Payment received',
      };

      mockDb.single.mockResolvedValueOnce({ data: notification, error: null });

      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notification),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should support overdue_invoice type', async () => {
      const notification = {
        user_id: 'user-123',
        type: 'overdue_invoice',
        title: 'Overdue',
        message: 'Invoice is overdue',
      };

      mockDb.single.mockResolvedValueOnce({ data: notification, error: null });

      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notification),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should support system_alert type', async () => {
      const notification = {
        user_id: 'user-123',
        type: 'system_alert',
        title: 'System',
        message: 'System alert',
      };

      mockDb.single.mockResolvedValueOnce({ data: notification, error: null });

      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notification),
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
      mockDb.select.mockImplementation(() => ({
        ...mockDb,
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/notifications', {
        headers: { authorization: 'Bearer user-token' },
      });
      const response = await GET(request);

      expect(response.status).toBe(500);
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: 'invalid json',
        headers: { authorization: 'Bearer admin-token' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
