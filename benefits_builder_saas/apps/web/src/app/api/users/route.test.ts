/**
 * Tests for Users API
 * User management and authentication
 */

import { GET, POST, PATCH, DELETE } from './route';
import { createServiceClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

jest.mock('@/lib/supabase');
jest.mock('@/lib/auth');

describe('API: /api/users', () => {
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
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createServiceClient as jest.Mock).mockReturnValue(mockDb);
    (hashPassword as jest.Mock).mockImplementation((password) => `hashed_${password}`);
  });

  const mockUser = {
    id: 'user-123',
    username: 'adminuser',
    email: 'admin@test.com',
    full_name: 'Admin User',
    role: 'admin',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('GET /api/users', () => {
    const mockUsers = [
      mockUser,
      {
        id: 'user-456',
        username: 'regularuser',
        email: 'user@test.com',
        full_name: 'Regular User',
        role: 'user',
        active: true,
        created_at: '2024-02-01T00:00:00Z',
      },
    ];

    it('should fetch all users', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockUsers, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/users');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data).toEqual(mockUsers);
    });

    it('should not return password hashes', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockUsers, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/users');
      const response = await GET();
      const data = await response.json();

      expect(mockDb.select).toHaveBeenCalledWith('id, username, full_name, email, role, active, last_login_at, created_at');
    });

    it('should order by username', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: mockUsers, error: null });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/users');
      await GET();

      expect(orderSpy).toHaveBeenCalledWith('username');
    });

    it('should handle database errors', async () => {
      const orderSpy = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });

      mockDb.select.mockImplementation(() => ({
        order: orderSpy,
      }));

      const request = new Request('http://localhost:3000/api/users');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/users', () => {
    const newUser = {
      username: 'newuser',
      email: 'newuser@test.com',
      full_name: 'New User',
      password: 'SecurePass123!',
      role: 'user',
    };

    it('should create new user', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-new', username: 'newuser', email: 'newuser@test.com', full_name: 'New User', role: 'user', active: true },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.email).toBe('newuser@test.com');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should hash password', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-new', username: 'newuser' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      await POST(request);

      expect(hashPassword).toHaveBeenCalledWith('SecurePass123!');
    });

    it('should not return password in response', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-new', username: 'newuser', email: 'newuser@test.com' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockDb.select).toHaveBeenCalledWith('id, username, full_name, email, role, active, created_at');
    });

    it('should set default role to user', async () => {
      const userWithoutRole = {
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        password: 'SecurePass123!',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-new', ...userWithoutRole, role: 'user', active: true },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(userWithoutRole),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.role).toBe('user');
    });

    it('should set default active to true', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-new', username: 'newuser', active: true },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.data.active).toBe(true);
    });

    it('should handle database errors', async () => {
      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Insert failed');
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });

  describe('PATCH /api/users', () => {
    it('should update user profile', async () => {
      const updates = {
        id: 'user-123',
        full_name: 'Updated Name',
        email: 'newemail@test.com',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-123', username: 'adminuser', full_name: 'Updated Name', email: 'newemail@test.com', role: 'admin', active: true },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.full_name).toBe('Updated Name');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should require ID', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: 'Updated Name' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('User ID is required');
    });

    it('should update password hash when password provided', async () => {
      const updates = {
        id: 'user-123',
        password: 'NewPassword123!',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-123', username: 'adminuser' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      await PATCH(request);

      expect(hashPassword).toHaveBeenCalledWith('NewPassword123!');
    });

    it('should not return password in response', async () => {
      const updates = {
        id: 'user-123',
        full_name: 'Updated',
      };

      mockDb.single.mockResolvedValueOnce({
        data: { id: 'user-123', username: 'adminuser', full_name: 'Updated' },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(mockDb.select).toHaveBeenCalledWith('id, username, full_name, email, role, active, updated_at');
    });

    it('should handle database errors', async () => {
      const updates = {
        id: 'user-123',
        full_name: 'Updated',
      };

      mockDb.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Update failed');
    });
  });

  describe('DELETE /api/users', () => {
    it('should delete user when not last admin', async () => {
      // Mock that there are multiple admins
      mockDb.select.mockImplementation(() => ({
        eq: jest.fn().mockReturnThis(),
        then: (resolve) => resolve({ data: [{ id: 'admin-1' }, { id: 'admin-2' }], error: null }),
      }));

      mockDb.delete.mockImplementation(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const request = new Request('http://localhost:3000/api/users?id=user-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toBe('User deleted successfully');
    });

    it('should require ID parameter', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('User ID is required');
    });

    it('should prevent deleting last admin', async () => {
      // Mock that there is only one admin
      mockDb.select.mockImplementation(() => ({
        eq: jest.fn().mockReturnThis(),
        then: (resolve) => resolve({ data: [{ id: 'user-123' }], error: null }),
      }));

      const request = new Request('http://localhost:3000/api/users?id=user-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Cannot delete the only active admin user');
    });

    it('should handle database errors', async () => {
      // Mock that there are multiple admins
      mockDb.select.mockImplementation(() => ({
        eq: jest.fn().mockReturnThis(),
        then: (resolve) => resolve({ data: [{ id: 'admin-1' }, { id: 'admin-2' }], error: null }),
      }));

      mockDb.delete.mockImplementation(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } }),
      }));

      const request = new Request('http://localhost:3000/api/users?id=user-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Delete failed');
    });
  });
});
