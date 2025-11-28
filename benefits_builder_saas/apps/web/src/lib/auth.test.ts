/**
 * Tests for Authentication Library
 * Login, session management, password hashing
 */

import {
  authenticateUser,
  logout,
  hashPassword,
  generateSessionToken,
  validateSession,
  getCurrentUser,
  setSessionCookie,
  clearSessionCookie,
  logAuditEvent,
  InternalUser,
  SessionInfo,
} from './auth';

// Mock Supabase client
const mockSingle = jest.fn();
const mockChain = {
  eq: jest.fn(function() { return this; }),
  single: mockSingle,
};
const mockEq = jest.fn(() => mockChain);
const mockDelete = jest.fn(() => ({ eq: mockEq }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })) }));
const mockSelect = jest.fn(() => mockChain);
const mockFrom = jest.fn((table: string) => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
}));
const mockRpc = jest.fn();

jest.mock('./supabase', () => ({
  createServiceClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock crypto for deterministic testing
const mockRandomBytes = jest.fn(() => Buffer.from('a'.repeat(64), 'hex'));
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: (size: number) => mockRandomBytes(size),
}));

describe('Authentication Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockReset();
    mockChain.eq.mockImplementation(function() { return this; });
    mockEq.mockReturnValue(mockChain);
    mockDelete.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockInsert.mockReturnValue({ select: jest.fn(() => ({ single: mockSingle })) });
    mockSelect.mockReturnValue(mockChain);
    mockFrom.mockImplementation((table: string) => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
    }));
  });

  describe('hashPassword', () => {
    it('should hash password using SHA-256', () => {
      const hashed = hashPassword('mypassword');

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce same hash for same password', () => {
      const hash1 = hashPassword('same');
      const hash2 = hashPassword('same');

      // SHA-256 is deterministic
      expect(hash1).toBe(hash2);
    });

    it('should handle empty password', () => {
      const hashed = hashPassword('');

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
    });

    it('should handle very long passwords', () => {
      const longPassword = 'a'.repeat(1000);
      const hashed = hashPassword(longPassword);

      expect(hashed).toBeDefined();
      expect(hashed.length).toBe(64);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate session token', () => {
      const token = generateSessionToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens on consecutive calls', () => {
      mockRandomBytes
        .mockReturnValueOnce(Buffer.from('a'.repeat(64), 'hex'))
        .mockReturnValueOnce(Buffer.from('b'.repeat(64), 'hex'));

      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate with valid credentials', async () => {
      const mockUser: InternalUser = {
        id: 'user-123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        active: true,
        last_login_at: null,
      };

      const passwordHash = hashPassword('password123');

      // Mock user lookup
      mockSingle.mockResolvedValueOnce({
        data: { ...mockUser, password_hash: passwordHash },
        error: null,
      });
      // Mock session creation
      mockSingle.mockResolvedValueOnce({
        data: { session_token: 'session-token', expires_at: new Date().toISOString() },
        error: null,
      });

      const result = await authenticateUser('testuser', 'password123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.session.user.id).toBe('user-123');
        expect(result.session.session_token).toBeDefined();
      }
    });

    it('should reject invalid credentials', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await authenticateUser('testuser', 'wrongpassword');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid username or password');
      }
    });

    it('should reject disabled account', async () => {
      const mockUser: InternalUser = {
        id: 'user-123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        active: false,
        last_login_at: null,
      };

      const passwordHash = hashPassword('password123');

      mockSingle.mockResolvedValueOnce({
        data: { ...mockUser, password_hash: passwordHash },
        error: null,
      });

      const result = await authenticateUser('testuser', 'password123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Account is disabled');
      }
    });

    it('should log failed login attempts', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await authenticateUser('testuser', 'wrongpassword', '127.0.0.1', 'Mozilla/5.0');

      expect(mockFrom).toHaveBeenCalledWith('audit_log');
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should delete session from database', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { username: 'testuser' },
        error: null,
      });

      await logout('session-123');

      expect(mockFrom).toHaveBeenCalledWith('user_sessions');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should log logout action', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123' },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { username: 'testuser' },
        error: null,
      });

      await logout('session-123');

      expect(mockFrom).toHaveBeenCalledWith('audit_log');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle missing session gracefully', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(logout('invalid-session')).resolves.not.toThrow();
    });
  });

  describe('validateSession', () => {
    it('should validate active session and return user', async () => {
      const mockUser: InternalUser = {
        id: 'user-123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        active: true,
        last_login_at: null,
      };

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', expires_at: futureDate.toISOString() },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      const result = await validateSession('valid-token');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
    });

    it('should return null for expired session', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', expires_at: pastDate.toISOString() },
        error: null,
      });

      const result = await validateSession('expired-token');

      expect(result).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should return null for invalid token', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await validateSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const mockUser: InternalUser = {
        id: 'user-123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        active: false,
        last_login_at: null,
      };

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', expires_at: futureDate.toISOString() },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      const result = await validateSession('valid-token');

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user from valid session cookie', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn(() => ({ value: 'session-token' })),
        set: jest.fn(),
        delete: jest.fn(),
      };
      cookies.mockResolvedValue(mockCookies);

      const mockUser: InternalUser = {
        id: 'user-123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        active: true,
        last_login_at: null,
      };

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', expires_at: futureDate.toISOString() },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      const result = await getCurrentUser();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
    });

    it('should return null if no session cookie', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn(() => undefined),
        set: jest.fn(),
        delete: jest.fn(),
      };
      cookies.mockResolvedValue(mockCookies);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('setSessionCookie', () => {
    it('should set session cookie with correct options', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };
      cookies.mockResolvedValue(mockCookies);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await setSessionCookie('token-123', expiresAt);

      expect(mockCookies.set).toHaveBeenCalledWith(
        'bb_session',
        'token-123',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });
  });

  describe('clearSessionCookie', () => {
    it('should delete session cookie', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };
      cookies.mockResolvedValue(mockCookies);

      await clearSessionCookie();

      expect(mockCookies.delete).toHaveBeenCalledWith('bb_session');
    });
  });

  describe('logAuditEvent', () => {
    it('should log audit event with user info', async () => {
      const { cookies } = require('next/headers');
      const mockCookies = {
        get: jest.fn(() => ({ value: 'session-token' })),
        set: jest.fn(),
        delete: jest.fn(),
      };
      cookies.mockResolvedValue(mockCookies);

      const mockUser: InternalUser = {
        id: 'user-123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        active: true,
        last_login_at: null,
      };

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      mockSingle.mockResolvedValueOnce({
        data: { user_id: 'user-123', expires_at: futureDate.toISOString() },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      await logAuditEvent('test_action', 'test_resource', 'resource-123', { foo: 'bar' });

      expect(mockFrom).toHaveBeenCalledWith('audit_log');
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
