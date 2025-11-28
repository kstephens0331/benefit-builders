/**
 * Tests for Logout API
 * Handles user logout and session cleanup
 */

import { POST } from './route';
import { logout, clearSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

jest.mock('@/lib/auth');
jest.mock('next/headers');

describe('API: /api/auth/logout', () => {
  let mockCookieStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCookieStore = {
      get: jest.fn(),
    };

    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
    (logout as jest.Mock).mockResolvedValue(undefined);
    (clearSessionCookie as jest.Mock).mockResolvedValue(undefined);
  });

  it('should logout successfully with valid session', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'valid-session-token' });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(logout).toHaveBeenCalledWith('valid-session-token');
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should handle logout without session gracefully', async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(logout).not.toHaveBeenCalled();
    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should clear session cookie even without session token', async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    await POST();

    expect(clearSessionCookie).toHaveBeenCalled();
  });

  it('should handle errors during logout', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'valid-session-token' });
    (logout as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('An error occurred during logout');
  });

  it('should handle errors during cookie clearing', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    (clearSessionCookie as jest.Mock).mockRejectedValue(new Error('Cookie error'));

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('An error occurred during logout');
  });
});
