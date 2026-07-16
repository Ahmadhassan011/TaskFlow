import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mockPrisma';

vi.mock('../../src/config/database', () => ({
  default: mockPrisma,
}));

import * as userService from '../../src/users/service';

describe('User Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const members = [
        {
          id: 'm1',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date(),
          user: {
            id: '1',
            email: 'user1@example.com',
            name: 'User 1',
            role: 'MEMBER',
            isActive: true,
            avatar: null,
            createdAt: new Date(),
            _count: { assignedTasks: 2 },
          },
        },
        {
          id: 'm2',
          role: 'ADMIN',
          status: 'ACTIVE',
          joinedAt: new Date(),
          user: {
            id: '2',
            email: 'user2@example.com',
            name: 'User 2',
            role: 'ADMIN',
            isActive: true,
            avatar: null,
            createdAt: new Date(),
            _count: { assignedTasks: 0 },
          },
        },
      ];

      mockPrisma.tenantMembership.findMany.mockResolvedValue(members);
      mockPrisma.tenantMembership.count.mockResolvedValue(2);

      const result = await userService.listUsers({ page: 1, limit: 10, tenantId: 'tenant-1' });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      const membership = {
        id: 'm1',
        role: 'MEMBER',
        status: 'ACTIVE',
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'MEMBER',
          isActive: true,
          avatar: null,
          createdAt: new Date(),
          _count: { assignedTasks: 3 },
        },
      };

      mockPrisma.tenantMembership.findUnique.mockResolvedValue(membership);

      const result = await userService.getUser('1', 'tenant-1');

      expect(result.email).toBe('user@example.com');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(null);

      await expect(userService.getUser('nonexistent', 'tenant-1')).rejects.toThrow(
        'User not found in this workspace'
      );
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue({ id: 'm1', role: 'MEMBER' });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
      mockPrisma.user.update.mockResolvedValue({
        id: '1',
        email: 'user@example.com',
        name: 'Updated Name',
        role: 'MEMBER',
        isActive: true,
        avatar: null,
        createdAt: new Date(),
      });

      const result = await userService.updateUser('1', { name: 'Updated Name' }, 'tenant-1');

      expect(result.name).toBe('Updated Name');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(null);

      await expect(
        userService.updateUser('nonexistent', { name: 'New Name' }, 'tenant-1')
      ).rejects.toThrow('User not found in this workspace');
    });
  });

  describe('deleteUser', () => {
    it('should remove member from workspace', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue({ id: 'm1', role: 'MEMBER' });
      mockPrisma.tenantMembership.delete.mockResolvedValue({});

      const result = await userService.deleteUser('1', 'tenant-1', 'other-user-id');

      expect(result.message).toBe('Member removed from workspace successfully');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.tenantMembership.findUnique.mockResolvedValue(null);

      await expect(
        userService.deleteUser('nonexistent', 'tenant-1', 'other-user-id')
      ).rejects.toThrow('User not found in this workspace');
    });

    it('should throw error if trying to delete yourself', async () => {
      await expect(userService.deleteUser('1', 'tenant-1', '1')).rejects.toThrow(
        'Cannot remove yourself from the workspace'
      );
    });
  });

  describe('createUser', () => {
    it('should create a user', async () => {
      mockPrisma.tenantMembership.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue({
        id: '1',
        email: 'new@example.com',
        name: 'New User',
        role: 'MEMBER',
        isActive: true,
        avatar: null,
        createdAt: new Date(),
      });
      mockPrisma.tenantMembership.create.mockResolvedValue({});

      const result = await userService.createUser(
        'new@example.com',
        'New User',
        'Password123',
        'MEMBER',
        'tenant-1'
      );

      expect(result.email).toBe('new@example.com');
    });

    it('should throw error if email already exists', async () => {
      mockPrisma.tenantMembership.findFirst.mockResolvedValue({ id: 'm1' });

      await expect(
        userService.createUser('existing@example.com', 'User', 'Password123', 'MEMBER', 'tenant-1')
      ).rejects.toThrow('User is already a member of this workspace');
    });
  });
});
