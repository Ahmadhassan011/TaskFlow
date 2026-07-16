import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mockPrisma';

vi.mock('../../src/config/database', () => ({
  default: mockPrisma,
}));

vi.mock('../../src/activity/service', () => ({
  logActivity: vi.fn().mockResolvedValue({}),
}));

import * as projectService from '../../src/projects/service';

describe('Project Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createProject', () => {
    it('should create a project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        slug: 'test-project',
        ownerId: 'user-1',
        tenantId: 'tenant-1',
        members: [],
      };

      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await projectService.createProject('user-1', 'tenant-1', {
        name: 'Test Project',
        startDate: '2024-01-01',
      });

      expect(result.name).toBe('Test Project');
    });
  });

  describe('getProject', () => {
    it('should return project by id (admin)', async () => {
      const mockProject = {
        id: 'project-1',
        tenantId: 'tenant-1',
        name: 'Test Project',
        owner: { id: 'user-1', name: 'Owner' },
        members: [{ userId: 'user-1' }],
        _count: { tasks: 5 },
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await projectService.getProject('project-1', 'user-1', 'ADMIN', 'tenant-1');

      expect(result.id).toBe('project-1');
    });

    it('should return project by id (member)', async () => {
      const mockProject = {
        id: 'project-1',
        tenantId: 'tenant-1',
        name: 'Test Project',
        owner: { id: 'user-1', name: 'Owner' },
        members: [{ userId: 'user-1' }],
        _count: { tasks: 5 },
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await projectService.getProject('project-1', 'user-1', 'MEMBER', 'tenant-1');

      expect(result.id).toBe('project-1');
    });

    it('should throw error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        projectService.getProject('nonexistent', 'user-1', 'ADMIN', 'tenant-1')
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if user is not member (non-admin)', async () => {
      const mockProject = {
        id: 'project-1',
        tenantId: 'tenant-1',
        members: [{ userId: 'user-2' }],
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        projectService.getProject('project-1', 'user-1', 'MEMBER', 'tenant-1')
      ).rejects.toThrow('Not a member of this project');
    });
  });

  describe('deleteProject', () => {
    it('should delete project if admin', async () => {
      const mockProject = {
        id: 'project-1',
        tenantId: 'tenant-1',
        ownerId: 'user-1',
        members: [{ userId: 'user-2', role: 'member' }],
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.project.delete.mockResolvedValue(mockProject);

      const result = await projectService.deleteProject('project-1', 'user-2', 'ADMIN', 'tenant-1');

      expect(result.message).toBe('Project deleted successfully');
    });

    it('should throw error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        projectService.deleteProject('nonexistent', 'user-1', 'ADMIN', 'tenant-1')
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if non-manager tries to delete', async () => {
      const mockProject = {
        id: 'project-1',
        tenantId: 'tenant-1',
        ownerId: 'user-1',
        members: [{ userId: 'user-2', role: 'member' }],
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);

      await expect(
        projectService.deleteProject('project-1', 'user-2', 'MEMBER', 'tenant-1')
      ).rejects.toThrow('Only project managers can delete');
    });

    it('should allow project manager to delete own project', async () => {
      const mockProject = {
        id: 'project-1',
        tenantId: 'tenant-1',
        ownerId: 'user-1',
        members: [{ userId: 'user-1', role: 'manager' }],
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.project.delete.mockResolvedValue(mockProject);

      const result = await projectService.deleteProject(
        'project-1',
        'user-1',
        'MANAGER',
        'tenant-1'
      );

      expect(result.message).toBe('Project deleted successfully');
    });
  });
});
