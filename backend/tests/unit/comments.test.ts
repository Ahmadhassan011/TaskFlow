import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mockPrisma';

vi.mock('../../src/config/database', () => ({
  default: mockPrisma,
}));

vi.mock('../../src/activity/service', () => ({
  logActivity: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/notifications/service', () => ({
  createCommentNotification: vi.fn().mockResolvedValue({}),
}));

import * as commentService from '../../src/comments/service';

describe('Comment Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('addComment', () => {
    it('should add a comment', async () => {
      const mockTask = { id: 'task-1', projectId: 'project-1', tenantId: 'tenant-1' };
      const mockMembership = { id: 'member-1', userId: 'user-1', projectId: 'project-1' };
      const mockComment = {
        id: 'comment-1',
        content: 'Test comment',
        author: { id: 'user-1', name: 'Test User' },
      };

      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.projectMember.findUnique.mockResolvedValue(mockMembership);
      mockPrisma.comment.create.mockResolvedValue(mockComment);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test User' });

      const result = await commentService.addComment('task-1', 'Test comment', 'user-1', 'tenant-1');

      expect(result.content).toBe('Test comment');
    });

    it('should throw error if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        commentService.addComment('nonexistent', 'Test comment', 'user-1', 'tenant-1')
      ).rejects.toThrow('Task not found');
    });

    it('should throw error if user is not project member', async () => {
      const mockTask = { id: 'task-1', projectId: 'project-1', tenantId: 'tenant-1' };
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.projectMember.findUnique.mockResolvedValue(null);

      await expect(
        commentService.addComment('task-1', 'Test comment', 'user-1', 'tenant-1')
      ).rejects.toThrow('Not a member of this project');
    });
  });

  describe('updateComment', () => {
    beforeEach(() => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        tenantId: 'tenant-1',
      });
      mockPrisma.projectMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        projectId: 'project-1',
      });
    });

    it('should update comment', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Old content',
        authorId: 'user-1',
      };

      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({
        ...mockComment,
        content: 'New content',
        author: { id: 'user-1', name: 'Test User' },
      });

      const result = await commentService.updateComment(
        'task-1',
        'comment-1',
        'New content',
        'user-1',
        'tenant-1',
        'MEMBER'
      );

      expect(result.content).toBe('New content');
    });

    it('should throw error if comment not found', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        commentService.updateComment('task-1', 'nonexistent', 'New content', 'user-1', 'tenant-1', 'MEMBER')
      ).rejects.toThrow('Comment not found');
    });

    it('should throw error if user is not author', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Old content',
        authorId: 'user-1',
      };

      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);

      await expect(
        commentService.updateComment('task-1', 'comment-1', 'New content', 'user-2', 'tenant-1', 'MEMBER')
      ).rejects.toThrow('Can only edit your own comments');
    });
  });

  describe('deleteComment', () => {
    beforeEach(() => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        projectId: 'project-1',
        tenantId: 'tenant-1',
      });
      mockPrisma.projectMember.findUnique.mockResolvedValue({
        id: 'member-1',
        userId: 'user-1',
        projectId: 'project-1',
      });
    });

    it('should delete comment if author', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Test comment',
        authorId: 'user-1',
      };

      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.delete.mockResolvedValue(mockComment);

      const result = await commentService.deleteComment(
        'task-1',
        'comment-1',
        'user-1',
        'tenant-1',
        'MEMBER'
      );

      expect(result.message).toBe('Comment deleted successfully');
    });

    it('should delete comment if admin', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Test comment',
        authorId: 'user-1',
      };

      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.delete.mockResolvedValue(mockComment);

      const result = await commentService.deleteComment(
        'task-1',
        'comment-1',
        'user-2',
        'tenant-1',
        'ADMIN'
      );

      expect(result.message).toBe('Comment deleted successfully');
    });

    it('should throw error if comment not found', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        commentService.deleteComment('task-1', 'nonexistent', 'user-1', 'tenant-1', 'MEMBER')
      ).rejects.toThrow('Comment not found');
    });

    it('should throw error if user is not author or admin', async () => {
      const mockComment = {
        id: 'comment-1',
        content: 'Test comment',
        authorId: 'user-1',
      };

      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);

      await expect(
        commentService.deleteComment('task-1', 'comment-1', 'user-2', 'tenant-1', 'MEMBER')
      ).rejects.toThrow('Can only delete your own comments');
    });
  });
});
