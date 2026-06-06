'use client';

export interface RecoveryBackupState {
  verifiedAt?: number;
  bypassedAt?: number;
}

const STORAGE_PREFIX = 'notechain:recovery-key-backup:v1:';
export const RECOVERY_BACKUP_STATE_CHANGED = 'notechain:recovery-key-backup-changed';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getRecoveryBackupState(userId: string | null | undefined): RecoveryBackupState {
  if (!userId || !hasBrowserStorage()) return {};

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as RecoveryBackupState;
    return {
      verifiedAt: typeof parsed.verifiedAt === 'number' ? parsed.verifiedAt : undefined,
      bypassedAt: typeof parsed.bypassedAt === 'number' ? parsed.bypassedAt : undefined,
    };
  } catch {
    return {};
  }
}

function writeRecoveryBackupState(userId: string, state: RecoveryBackupState): void {
  if (!hasBrowserStorage()) return;

  window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent(RECOVERY_BACKUP_STATE_CHANGED, {
      detail: { userId, state },
    })
  );
}

export function markRecoveryBackupVerified(
  userId: string,
  verifiedAt = Date.now()
): RecoveryBackupState {
  const state: RecoveryBackupState = { verifiedAt };
  writeRecoveryBackupState(userId, state);
  return state;
}

export function markRecoveryBackupBypassed(
  userId: string,
  bypassedAt = Date.now()
): RecoveryBackupState {
  const current = getRecoveryBackupState(userId);
  const state: RecoveryBackupState = { ...current, bypassedAt };
  writeRecoveryBackupState(userId, state);
  return state;
}

export function clearRecoveryBackupState(userId: string): void {
  if (!hasBrowserStorage()) return;

  window.localStorage.removeItem(storageKey(userId));
  window.dispatchEvent(
    new CustomEvent(RECOVERY_BACKUP_STATE_CHANGED, {
      detail: { userId, state: {} },
    })
  );
}

export function isRecoveryBackupVerified(userId: string | null | undefined): boolean {
  return Boolean(getRecoveryBackupState(userId).verifiedAt);
}

export function isRecoveryBackupSatisfied(userId: string | null | undefined): boolean {
  const state = getRecoveryBackupState(userId);
  return Boolean(state.verifiedAt || state.bypassedAt);
}
