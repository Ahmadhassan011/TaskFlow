import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mockPrisma';

vi.mock('../../src/config/database', () => ({
  default: mockPrisma,
}));

vi.mock('../../src/activity/service', () => ({
  logActivity: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/notifications/service', () => ({
  createTaskAssignedNotification: vi.fn().mockResolvedValue({}),
  createStatusChangeNotification: vi.fn().mockResolvedValue({}),
  createCommentNotification: vi.fn().mockResolvedValue({}),
}));

import * as taskService from '../../src/tasks/service';

describe('Task Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createTask', () => {
    it('should create a task', async () => {
      const mockProject = { id: 'project-1', name: 'Test Project', tenantId: 'tenant-1' };
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        projectId: 'project-1',
        tenantId: 'tenant-1',
        assigneeId: null,
        labels: [],
      };

      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const result = await taskService.createTask(
        { title: 'Test Task', projectId: 'project-1' },
        'user-1',
        'tenant-1'
      );

      expect(result.title).toBe('Test Task');
    });

    it('should throw error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        taskService.createTask({ title: 'Test', projectId: 'nonexistent' }, 'user-1', 'tenant-1')
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if assignee is not project member', async () => {
      const mockProject = { id: 'project-1', name: 'Test Project', tenantId: 'tenant-1' };
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockPrisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        taskService.createTask(
          { title: 'Test', projectId: 'project-1', assigneeId: 'non-member' },
          'user-1',
          'tenant-1'
        )
      ).rejects.toThrow('Assignee must be a project member');
    });
  });

  describe('getTask', () => {
    it('should return task by id', async () => {
      const mockTask = {
        id: 'task-1',
        tenantId: 'tenant-1',
        title: 'Test Task',
        project: { id: 'project-1', name: 'Test Project' },
        assignee: null,
        subtasks: [],
        labels: [],
        comments: [],
      };

      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await taskService.getTask('task-1', 'user-1', 'ADMIN', 'tenant-1');

      expect(result.id).toBe('task-1');
    });

    it('should throw error if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(taskService.getTask('nonexistent', 'user-1', 'ADMIN', 'tenant-1')).rejects.toThrow(
        'Task not found'
      );
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status (linear progression)', async () => {
      const mockTask = {
        id: 'task-1',
        tenantId: 'tenant-1',
        status: 'TODO',
        assigneeId: 'user-1',
        title: 'Test Task',
      };

      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'IN_PROGRESS' });

      const result = await taskService.updateTaskStatus(
        'task-1',
        'IN_PROGRESS',
        'MEMBER',
        'user-1',
        'tenant-1'
      );

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw error if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        taskService.updateTaskStatus('nonexistent', 'IN_PROGRESS', 'MEMBER', 'user-1', 'tenant-1')
      ).rejects.toThrow('Task not found');
    });

    it('should throw error if non-admin tries to skip stages', async () => {
      const mockTask = { id: 'task-1', tenantId: 'tenant-1', status: 'TODO' };
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        taskService.updateTaskStatus('task-1', 'IN_REVIEW', 'MEMBER', 'user-1', 'tenant-1')
      ).rejects.toThrow('Cannot skip stages');
    });

    it('should allow admin to skip stages', async () => {
      const mockTask = {
        id: 'task-1',
        tenantId: 'tenant-1',
        status: 'TODO',
        title: 'Test',
        assigneeId: null,
      };
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: 'DONE' });

      const result = await taskService.updateTaskStatus('task-1', 'DONE', 'ADMIN', 'user-1', 'tenant-1');

      expect(result.status).toBe('DONE');
    });
  });

  describe('deleteTask', () => {
    it('should delete task', async () => {
      const mockTask = { id: 'task-1', tenantId: 'tenant-1', title: 'Test Task' };
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.task.delete.mockResolvedValue(mockTask);

      const result = await taskService.deleteTask('task-1', 'user-1', 'tenant-1');

      expect(result.message).toBe('Task deleted successfully');
    });

    it('should throw error if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(taskService.deleteTask('nonexistent', 'user-1', 'tenant-1')).rejects.toThrow(
        'Task not found'
      );
    });
  });

  describe('addSubtask', () => {
    it('should add a subtask', async () => {
      const mockTask = { id: 'task-1', tenantId: 'tenant-1' };
      const mockSubtask = { id: 'sub-1', title: 'Subtask 1', isCompleted: false, taskId: 'task-1' };

      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.subtask.create.mockResolvedValue(mockSubtask);

      const result = await taskService.addSubtask('task-1', 'Subtask 1', 'user-1', 'tenant-1');

      expect(result.title).toBe('Subtask 1');
    });

    it('should throw error if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        taskService.addSubtask('nonexistent', 'Subtask', 'user-1', 'tenant-1')
      ).rejects.toThrow('Task not found');
    });
  });

  describe('deleteSubtask', () => {
    it('should delete a subtask', async () => {
      const mockSubtask = { id: 'sub-1', taskId: 'task-1' };
      mockPrisma.subtask.findFirst.mockResolvedValue(mockSubtask);
      mockPrisma.subtask.delete.mockResolvedValue(mockSubtask);

      const result = await taskService.deleteSubtask('task-1', 'sub-1', 'user-1', 'tenant-1');

      expect(result.message).toBe('Subtask deleted successfully');
    });

    it('should throw error if subtask not found', async () => {
      mockPrisma.subtask.findFirst.mockResolvedValue(null);

      await expect(
        taskService.deleteSubtask('task-1', 'nonexistent', 'user-1', 'tenant-1')
      ).rejects.toThrow('Subtask not found');
    });
  });
});
