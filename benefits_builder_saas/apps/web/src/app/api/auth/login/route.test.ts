/**
 * Tests for Login API
 * Handles user authentication
 */

import { POST } from './route';
import * as auth from '@/lib/auth';

jest.mock('@/lib/auth');

describe('API: /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validCredentials = {
    username: 'testuser',
    password: 'SecurePassword123!',
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    role: 'admin',
    full_name: 'Test User',
  };

  const mockSession = {
    session_token: 'session-token-123',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    user: mockUser,
  };

  it('should login with valid credentials', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(validCredentials),
    });

    (auth.authenticateUser as jest.Mock).mockResolvedValue({
      success: true,
      session: mockSession,
    });
    (auth.setSessionCookie as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.user).toEqual(mockUser);
    expect(auth.setSessionCookie).toHaveBeenCalledWith(
      mockSession.session_token,
      mockSession.expires_at
    );
  });

  it('should reject invalid credentials', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'wrong',
        password: 'password',
      }),
    });

    (auth.authenticateUser as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Invalid username or password',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Invalid username or password');
  });

  it('should require username', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'password' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Username and password are required');
  });

  it('should require password', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Username and password are required');
  });

  it('should pass IP address and user agent to authenticateUser', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify(validCredentials),
    });

    (auth.authenticateUser as jest.Mock).mockResolvedValue({
      success: true,
      session: mockSession,
    });
    (auth.setSessionCookie as jest.Mock).mockResolvedValue(undefined);

    await POST(request);

    expect(auth.authenticateUser).toHaveBeenCalledWith(
      'testuser',
      'SecurePassword123!',
      '192.168.1.1',
      'Mozilla/5.0'
    );
  });

  it('should use unknown for missing IP and user agent', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(validCredentials),
    });

    (auth.authenticateUser as jest.Mock).mockResolvedValue({
      success: true,
      session: mockSession,
    });
    (auth.setSessionCookie as jest.Mock).mockResolvedValue(undefined);

    await POST(request);

    expect(auth.authenticateUser).toHaveBeenCalledWith(
      'testuser',
      'SecurePassword123!',
      'unknown',
      'unknown'
    );
  });

  it('should handle errors during login', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(validCredentials),
    });

    (auth.authenticateUser as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('An error occurred during login');
  });
});
