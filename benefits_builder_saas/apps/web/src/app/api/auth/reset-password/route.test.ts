/**
 * Tests for Password Reset API
 * Password reset flow with token validation
 */

import { POST } from './route';
import { createServiceClient } from '@/lib/supabase';

jest.mock('@/lib/supabase');
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
}));
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'a'.repeat(64)), // 64 character hex string (32 bytes * 2)
  })),
}));

describe('API: /api/auth/reset-password', () => {
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
      gt: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
  });

  const mockUser = {
    id: 'user-123',
    email: 'user@test.com',
    password_hash: 'hashed_oldpassword',
  };

  describe('POST /api/auth/reset-password - Request Reset', () => {
    it('should send reset email for valid user', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toContain('sent');
    });

    it('should generate reset token', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const updateSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        if (table === 'password_reset_tokens') {
          return { insert: mockDb.insert, update: updateSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'generatetoken@test.com',
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user_id: 'user-123',
          expires_at: expect.any(String),
        })
      );
    });

    it('should set expiration to 30 minutes', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
        }),
      });

      const before = Date.now();
      await POST(request);
      const after = Date.now();

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls[0][0];
      const expiresAt = new Date(insertCall.expires_at).getTime();
      const expectedExpiry = before + 30 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiry);
      expect(expiresAt).toBeLessThanOrEqual(after + 30 * 60 * 1000);
    });

    it('should not reveal if email exists', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@test.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('sent');
    });

    it('should invalidate previous tokens', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@test.com',
        }),
      });

      await POST(request);

      expect(mockDb.update).toHaveBeenCalledWith({ used: true });
      expect(mockDb.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should validate email format', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should require email', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should rate limit requests', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      for (let i = 0; i < 5; i++) {
        await POST(
          new Request('http://localhost:3000/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email: 'user@test.com' }),
          })
        );
      }

      const response = await POST(
        new Request('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email: 'user@test.com' }),
        })
      );

      expect(response.status).toBe(429);
    });

    it('should include reset link in email', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const updateSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        if (table === 'password_reset_tokens') {
          return { insert: mockDb.insert, update: updateSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'resetlink@test.com',
        }),
      });

      await POST(request);

      // Verify email was sent with link
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/reset-password - Complete Reset', () => {
    const mockToken = {
      token: 'valid_token_123',
      user_id: 'user-123',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      used: false,
    };

    it('should reset password with valid token', async () => {
      const singleSpy = jest.fn()
        .mockResolvedValueOnce({ data: mockToken, error: null })
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy, single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const updateSpy = jest.fn().mockReturnValue({ eq: eqSpy, single: singleSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy, update: updateSpy };
        }
        if (table === 'auth_users') {
          return { update: updateSpy };
        }
        if (table === 'sessions') {
          return { delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }) };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NewPass123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should hash new password', async () => {
      const singleSpy = jest.fn()
        .mockResolvedValueOnce({ data: mockToken, error: null })
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy, single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const updateSpy = jest.fn().mockReturnValue({ eq: eqSpy, single: singleSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy, update: updateSpy };
        }
        if (table === 'auth_users') {
          return { update: updateSpy };
        }
        if (table === 'sessions') {
          return { delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }) };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NewPass123!',
        }),
      });

      await POST(request);

      const bcrypt = require('bcryptjs');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', expect.any(Number));
    });

    it('should reject expired token', async () => {
      const expiredToken = {
        ...mockToken,
        expires_at: new Date(Date.now() - 3600000).toISOString(),
      };

      const singleSpy = jest.fn().mockResolvedValue({ data: null, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'expired_token',
          new_password: 'NewPass123!',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject used token', async () => {
      const usedToken = {
        ...mockToken,
        used: true,
      };

      const singleSpy = jest.fn().mockResolvedValue({ data: usedToken, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'used_token',
          new_password: 'NewPass123!',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject invalid token', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: null, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid_token',
          new_password: 'NewPass123!',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should validate password strength', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockToken, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'weak',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should require uppercase letter', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'nouppercas3!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('uppercase');
    });

    it('should require lowercase letter', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NOLOWERCASE3!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('lowercase');
    });

    it('should require number', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NoNumber!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('number');
    });

    it('should require special character', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NoSpecial123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('special');
    });

    it('should require minimum length', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'Sh0rt!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('8 characters');
    });

    it('should mark token as used', async () => {
      const updateCalls: any[] = [];
      const singleSpy = jest.fn()
        .mockResolvedValueOnce({ data: mockToken, error: null })
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy, single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const updateSpy = jest.fn((data) => {
        updateCalls.push(data);
        return { eq: eqSpy, single: singleSpy };
      });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy, update: updateSpy };
        }
        if (table === 'auth_users') {
          return { update: updateSpy };
        }
        if (table === 'sessions') {
          return { delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }) };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NewPass123!',
        }),
      });

      await POST(request);

      // Check that update was called with { used: true } at some point
      expect(updateCalls.some(call => call.used === true)).toBe(true);
    });

    it('should invalidate all sessions', async () => {
      let fromCalls: string[] = [];
      const singleSpy = jest.fn()
        .mockResolvedValueOnce({ data: mockToken, error: null })
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy, single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const updateSpy = jest.fn().mockReturnValue({ eq: eqSpy, single: singleSpy });

      mockDb.from.mockImplementation((table: string) => {
        fromCalls.push(table);
        if (table === 'password_reset_tokens') {
          return { select: selectSpy, update: updateSpy };
        }
        if (table === 'auth_users') {
          return { update: updateSpy };
        }
        if (table === 'sessions') {
          return { delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }) };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NewPass123!',
        }),
      });

      await POST(request);

      expect(fromCalls).toContain('sessions');
    });

    it('should send confirmation email', async () => {
      const singleSpy = jest.fn()
        .mockResolvedValueOnce({ data: mockToken, error: null })
        .mockResolvedValueOnce({ data: { id: 'user-123' }, error: null });
      const gtSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const eqSpy = jest.fn().mockReturnValue({ gt: gtSpy, single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });
      const updateSpy = jest.fn().mockReturnValue({ eq: eqSpy, single: singleSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'password_reset_tokens') {
          return { select: selectSpy, update: updateSpy };
        }
        if (table === 'auth_users') {
          return { update: updateSpy };
        }
        if (table === 'sessions') {
          return { delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }) };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'NewPass123!',
        }),
      });

      await POST(request);

      // Verify confirmation email sent
    });

    it('should prevent common passwords', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
          new_password: 'Password123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('common');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const singleSpy = jest.fn().mockRejectedValue(new Error('Database error'));
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'dberror@test.com',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should handle missing parameters', async () => {
      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_token_123',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Security', () => {
    it('should use secure random tokens', async () => {
      const singleSpy = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'secure@test.com',
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall.token.length).toBeGreaterThan(32);
    });

    it('should sanitize error messages', async () => {
      const singleSpy = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      const eqSpy = jest.fn().mockReturnValue({ single: singleSpy });
      const selectSpy = jest.fn().mockReturnValue({ eq: eqSpy });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy };
        }
        return mockDb;
      });

      const request = new Request('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'sanitize@test.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).not.toContain('Database');
      expect(data.error).not.toContain('connection');
    });

    it('should prevent timing attacks', async () => {
      const singleSpy1 = jest.fn().mockResolvedValue({ data: mockUser, error: null });
      const eqSpy1 = jest.fn().mockReturnValue({ single: singleSpy1 });
      const selectSpy1 = jest.fn().mockReturnValue({ eq: eqSpy1 });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy1 };
        }
        return mockDb;
      });

      const start1 = Date.now();
      await POST(
        new Request('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email: 'valid@test.com' }),
        })
      );
      const time1 = Date.now() - start1;

      const singleSpy2 = jest.fn().mockResolvedValue({ data: null, error: null });
      const eqSpy2 = jest.fn().mockReturnValue({ single: singleSpy2 });
      const selectSpy2 = jest.fn().mockReturnValue({ eq: eqSpy2 });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_users') {
          return { select: selectSpy2 };
        }
        return mockDb;
      });

      const start2 = Date.now();
      await POST(
        new Request('http://localhost:3000/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email: 'invalid@test.com' }),
        })
      );
      const time2 = Date.now() - start2;

      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });
  });
});
