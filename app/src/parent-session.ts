import { reactive } from 'vue';

// Deliberately memory-only: reloads and other tabs start in child mode.
export const parentSession = reactive({ unlocked: false, expiresAt: 0 });
export function lockParent() { parentSession.unlocked = false; parentSession.expiresAt = 0; }
export function touchParent() { if (parentSession.unlocked) parentSession.expiresAt = Date.now() + 5 * 60_000; }
export function unlockParentSession() { parentSession.unlocked = true; touchParent(); }
export function requireParent() {
  if (!parentSession.unlocked || Date.now() >= parentSession.expiresAt) {
    lockParent();
    throw Error('请先进入家长管理并输入口令');
  }
}
