/**
 * Tests for Change Password API
 * User password updates with validation
 */

import { POST } from './route';
import { createServiceClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

jest.mock('@/lib/supabase');
jest.mock('@/lib/auth');

describe('API: /api/auth/change-password', () => {
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
    (hashPassword as jest.Mock).mockImplementation((password) => `hashed_${password}`);
  });

  describe('POST /api/auth/change-password', () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@test.com',
      username: 'testuser',
      password_hash: 'hashed_oldpassword',
    };

    it('should change password with valid credentials', async () => {
      // Mock auth_users query (successful)
      mockDb.single
        .mockResolvedValueOnce({ data: mockUser, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toBe('Password changed successfully');
    });

    it('should hash new password', async () => {
      mockDb.single
        .mockResolvedValueOnce({ data: mockUser, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      await POST(request);

      expect(hashPassword).toHaveBeenCalledWith('oldpassword');
      expect(hashPassword).toHaveBeenCalledWith('NewPass123!');
    });

    it('should verify current password', async () => {
      // First query returns null (auth_users), second query returns null (internal_users)
      mockDb.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'wrongpassword',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid email or current password');
    });

    it('should require email', async () => {
      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email, current password, and new password are required');
    });

    it('should validate new password strength', async () => {
      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'weak',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('New password must be at least 8 characters long');
    });

    it('should require minimum length', async () => {
      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'Sh0rt!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('New password must be at least 8 characters long');
    });

    it('should log password change event', async () => {
      mockDb.single
        .mockResolvedValueOnce({ data: mockUser, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      await POST(request);

      // Verify audit log was called
      expect(mockDb.from).toHaveBeenCalledWith('audit_log');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDb.single.mockRejectedValueOnce(new Error('Database error'));

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });

    it('should require both passwords', async () => {
      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email, current password, and new password are required');
    });

    it('should check auth_users table first', async () => {
      mockDb.single
        .mockResolvedValueOnce({ data: mockUser, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      await POST(request);

      expect(mockDb.from).toHaveBeenCalledWith('auth_users');
    });

    it('should fall back to internal_users table', async () => {
      const internalUser = { ...mockUser, id: 'internal-123' };

      mockDb.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: internalUser, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockDb.from).toHaveBeenCalledWith('internal_users');
    });

    it('should handle update errors', async () => {
      // Create a custom mock for this test that handles multiple eq calls
      let eqCallCount = 0;
      const customMockDb: any = {
        from: jest.fn(() => customMockDb),
        select: jest.fn(() => customMockDb),
        update: jest.fn(() => customMockDb),
        insert: jest.fn(() => customMockDb),
        eq: jest.fn(() => {
          eqCallCount++;
          // First two eq calls are for the select query (email, password_hash)
          if (eqCallCount <= 2) {
            return customMockDb;
          }
          // Third eq call is for the update query - return error
          return Promise.resolve({ data: null, error: { message: 'Update failed' } });
        }),
        single: jest.fn(),
      };

      (createServiceClient as jest.Mock).mockReturnValue(customMockDb);

      // Mock successful user lookup
      customMockDb.single.mockResolvedValueOnce({ data: mockUser, error: null });

      const request = new Request('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
          currentPassword: 'oldpassword',
          newPassword: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Update failed');
    });
  });
});
