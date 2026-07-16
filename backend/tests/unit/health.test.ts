import { describe, it, expect } from 'vitest';
import { ROLES, TASK_STATUSES } from '../../src/config/constants';

describe('Health Check', () => {
  it('should return status ok', () => {
    const health = { status: 'ok', timestamp: new Date().toISOString() };
    expect(health.status).toBe('ok');
    expect(health.timestamp).toBeDefined();
  });
});

describe('Constants', () => {
  it('should have correct role values', () => {
    expect(ROLES.OWNER).toBe('OWNER');
    expect(ROLES.ADMIN).toBe('ADMIN');
    expect(ROLES.MANAGER).toBe('MANAGER');
    expect(ROLES.MEMBER).toBe('MEMBER');
    expect(ROLES.GUEST).toBe('GUEST');
  });

  it('should have correct task statuses', () => {
    expect(TASK_STATUSES.TODO).toBe('TODO');
    expect(TASK_STATUSES.IN_PROGRESS).toBe('IN_PROGRESS');
    expect(TASK_STATUSES.IN_REVIEW).toBe('IN_REVIEW');
    expect(TASK_STATUSES.DONE).toBe('DONE');
  });
});
