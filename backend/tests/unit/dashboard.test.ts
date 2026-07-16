import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mockPrisma';

vi.mock('../../src/config/database', () => ({
  default: mockPrisma,
}));

import * as dashboardService from '../../src/dashboard/service';

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard stats for admin', async () => {
      mockPrisma.project.count.mockResolvedValue(5);
      mockPrisma.task.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);
      mockPrisma.tenantMembership.count.mockResolvedValue(4);
      mockPrisma.task.groupBy.mockResolvedValue([
        { status: 'TODO', _count: 5 },
        { status: 'IN_PROGRESS', _count: 3 },
        { status: 'DONE', _count: 10 },
      ]);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await dashboardService.getDashboardStats('user-1', 'ADMIN', 'tenant-1');

      expect(result.totalProjects).toBe(5);
      expect(result.totalTasks).toBe(20);
      expect(result.completedTasks).toBe(10);
      expect(result.overdueTasks).toBe(3);
      expect(result.statusDistribution.DONE).toBe(10);
    });

    it('should return dashboard stats for team member', async () => {
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.task.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await dashboardService.getDashboardStats('user-1', 'MEMBER', 'tenant-1');

      expect(result.totalTasks).toBe(5);
    });
  });

  describe('getTaskCompletionTrend', () => {
    it('should return task completion trend', async () => {
      const now = new Date();
      mockPrisma.task.findMany.mockResolvedValue([
        { updatedAt: now },
        { updatedAt: now },
      ]);

      const result = await dashboardService.getTaskCompletionTrend('user-1', 'ADMIN', 'tenant-1', 7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(8);
    });
  });
});
