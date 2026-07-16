import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mockPrisma';

const { mockCompare, mockHash } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
}));

vi.mock('../../src/config/database', () => ({
  default: mockPrisma,
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: mockCompare,
    hash: mockHash,
  },
  compare: mockCompare,
  hash: mockHash,
}));

import * as authService from '../../src/auth/service';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHash.mockResolvedValue('$2a$12$hashedpassword');
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'MEMBER',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.tenant.create.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.tenantMembership.create.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await authService.register('test@example.com', 'Test User', 'Password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.tenantId).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

      await expect(
        authService.register('test@example.com', 'Test User', 'Password123')
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockCompare.mockResolvedValue(true);

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        role: 'MEMBER',
        isActive: true,
        isVerified: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.tenant.create.mockResolvedValue({ id: 'tenant-1' });
      mockPrisma.tenantMembership.create.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login('test@example.com', 'Password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login('test@example.com', 'Password123')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error if account is inactive', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed',
        isActive: false,
        isVerified: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.login('test@example.com', 'Password123')).rejects.toThrow(
        'Account is inactive'
      );
    });

    it('should throw error if email not verified', async () => {
      mockCompare.mockResolvedValue(true);

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed',
        isActive: true,
        isVerified: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.login('test@example.com', 'Password123')).rejects.toThrow(
        'Please verify your email before logging in'
      );
    });

    it('should throw error if password is incorrect', async () => {
      mockCompare.mockResolvedValue(false);

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed',
        isActive: true,
        isVerified: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.login('test@example.com', 'WrongPassword')).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'MEMBER',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getProfile('1');

      expect(result.email).toBe('user@example.com');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('1')).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      mockCompare.mockResolvedValue(true);

      const mockUser = {
        id: '1',
        password: 'hashed',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      await expect(
        authService.changePassword('1', 'OldPassword123', 'NewPassword123')
      ).resolves.toBeUndefined();
    });

    it('should throw error if current password is incorrect', async () => {
      mockCompare.mockResolvedValue(false);

      const mockUser = {
        id: '1',
        password: 'hashed',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.changePassword('1', 'WrongPassword', 'NewPassword123')
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
