import { STORAGE_KEY } from './constants';
import { parseStoredLayout } from './schema';
import type { RoomLayout } from './types';

export function loadLayout(key=STORAGE_KEY): RoomLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parseStoredLayout(parsed);
  } catch (error) {
    console.warn('Failed to load saved layout:', error);
    return null;
  }
}

/**
 * Where a stored blob that exists but can no longer be read (JSON or schema
 * failure) is stashed before the autosave loop can overwrite it with the
 * fallback layout — the user's house survives for manual recovery (#113).
 */
export const RECOVERY_STORAGE_KEY = `${STORAGE_KEY}-recovery`;

/**
 * Call only after loadLayout() returned null: if a raw blob exists at all, it
 * is unreadable — copy it aside before it gets clobbered. Best-effort; a
 * quota failure here must not break the mount.
 */
export function backupUnreadableLayout(key=STORAGE_KEY): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    window.localStorage.setItem(`${key}-recovery`, raw);
    console.warn(`Saved layout is unreadable; a copy was kept under "${RECOVERY_STORAGE_KEY}".`);
  } catch (error) {
    console.warn('Failed to back up unreadable layout:', error);
  }
}

/** Returns true when the layout was persisted, false on any storage failure. */
export function saveLayout(layout: RoomLayout,key=STORAGE_KEY): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
    return true;
  } catch (error) {
    // The most common failure here is QuotaExceededError when a large base64
    // floor-plan image pushes us past the ~5MB localStorage budget. Surface it
    // as a warning rather than crashing the auto-save loop, and report the
    // failure to the caller so the HUD doesn't falsely show "Saved".
    console.warn('Failed to persist layout to localStorage:', error);
    return false;
  }
}
