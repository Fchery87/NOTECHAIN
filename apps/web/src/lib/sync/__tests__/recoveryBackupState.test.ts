import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearRecoveryBackupState,
  getRecoveryBackupState,
  isRecoveryBackupSatisfied,
  isRecoveryBackupVerified,
  markRecoveryBackupBypassed,
  markRecoveryBackupVerified,
  RECOVERY_BACKUP_STATE_CHANGED,
} from '../recoveryBackupState';

describe('recoveryBackupState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts unverified and unsatisfied for new users', () => {
    expect(getRecoveryBackupState('user-1')).toEqual({});
    expect(isRecoveryBackupVerified('user-1')).toBe(false);
    expect(isRecoveryBackupSatisfied('user-1')).toBe(false);
  });

  it('marks recovery backup as verified', () => {
    const state = markRecoveryBackupVerified('user-1', 1234);

    expect(state).toEqual({ verifiedAt: 1234 });
    expect(getRecoveryBackupState('user-1')).toEqual({ verifiedAt: 1234 });
    expect(isRecoveryBackupVerified('user-1')).toBe(true);
    expect(isRecoveryBackupSatisfied('user-1')).toBe(true);
  });

  it('marks explicit unsafe bypass as satisfied but not verified', () => {
    markRecoveryBackupBypassed('user-1', 5678);

    expect(getRecoveryBackupState('user-1')).toEqual({ bypassedAt: 5678 });
    expect(isRecoveryBackupVerified('user-1')).toBe(false);
    expect(isRecoveryBackupSatisfied('user-1')).toBe(true);
  });

  it('clears recovery backup state', () => {
    markRecoveryBackupVerified('user-1', 1234);
    clearRecoveryBackupState('user-1');

    expect(getRecoveryBackupState('user-1')).toEqual({});
    expect(isRecoveryBackupSatisfied('user-1')).toBe(false);
  });

  it('emits a browser event when state changes', () => {
    const listener = vi.fn();
    window.addEventListener(RECOVERY_BACKUP_STATE_CHANGED, listener);

    markRecoveryBackupVerified('user-1', 1234);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      type: RECOVERY_BACKUP_STATE_CHANGED,
      detail: {
        userId: 'user-1',
        state: { verifiedAt: 1234 },
      },
    });

    window.removeEventListener(RECOVERY_BACKUP_STATE_CHANGED, listener);
  });
});
