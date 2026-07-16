import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mockPrisma';

vi.mock('../../src/config/database', () => ({
  default: mockPrisma,
}));

import * as labelService from '../../src/labels/service';

describe('Label Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createLabel', () => {
    it('should create a label', async () => {
      const mockLabel = {
        id: 'label-1',
        name: 'Bug',
        color: '#EF4444',
        projectId: 'project-1',
      };

      mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1', tenantId: 'tenant-1' });
      mockPrisma.label.findUnique.mockResolvedValue(null);
      mockPrisma.label.create.mockResolvedValue(mockLabel);

      const result = await labelService.createLabel('project-1', 'Bug', '#EF4444', 'user-1', 'tenant-1');

      expect(result.name).toBe('Bug');
    });

    it('should throw error if label name already exists in project', async () => {
      mockPrisma.label.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        labelService.createLabel('project-1', 'Existing Label')
      ).rejects.toThrow('Label with this name already exists');
    });
  });

  describe('updateLabel', () => {
    it('should update label', async () => {
      const mockLabel = { id: 'label-1', name: 'Bug', color: '#EF4444', projectId: 'project-1' };

      mockPrisma.label.findFirst.mockResolvedValue(mockLabel);
      mockPrisma.label.findUnique.mockResolvedValue(null);
      mockPrisma.label.update.mockResolvedValue({ ...mockLabel, name: 'Critical Bug' });

      const result = await labelService.updateLabel(
        'project-1',
        'label-1',
        { name: 'Critical Bug' },
        'user-1',
        'tenant-1'
      );

      expect(result.name).toBe('Critical Bug');
    });

    it('should throw error if label not found', async () => {
      mockPrisma.label.findFirst.mockResolvedValue(null);

      await expect(
        labelService.updateLabel('project-1', 'nonexistent', { name: 'New Name' }, 'user-1', 'tenant-1')
      ).rejects.toThrow('Label not found');
    });
  });

  describe('deleteLabel', () => {
    it('should delete label', async () => {
      const mockLabel = { id: 'label-1', name: 'Bug', projectId: 'project-1' };

      mockPrisma.label.findFirst.mockResolvedValue(mockLabel);
      mockPrisma.label.delete.mockResolvedValue(mockLabel);

      const result = await labelService.deleteLabel('project-1', 'label-1', 'user-1', 'tenant-1');

      expect(result.message).toBe('Label deleted successfully');
    });

    it('should throw error if label not found', async () => {
      mockPrisma.label.findFirst.mockResolvedValue(null);

      await expect(
        labelService.deleteLabel('project-1', 'nonexistent', 'user-1', 'tenant-1')
      ).rejects.toThrow('Label not found');
    });
  });

  describe('listLabels', () => {
    it('should list labels for a project', async () => {
      const mockLabels = [
        { id: 'label-1', name: 'Bug', _count: { tasks: 3 } },
        { id: 'label-2', name: 'Feature', _count: { tasks: 5 } },
      ];

      mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1', tenantId: 'tenant-1' });
      mockPrisma.label.findMany.mockResolvedValue(mockLabels);
      mockPrisma.label.count.mockResolvedValue(2);

      const result = await labelService.listLabels('project-1', 'tenant-1');

      expect(result.labels).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });
});
