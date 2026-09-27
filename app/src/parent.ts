import { db } from './data';
import { lockParent, requireParent, unlockParentSession } from './parent-session';

const hex = (bytes: Uint8Array) => Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
async function digest(pin: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256)));
}
export async function setParentPin(pin: string, confirmation: string) {
  if (!/^\d{6}$/.test(pin)) throw Error('请设置6位数字口令');
  if (pin !== confirmation) throw Error('两次输入的口令不一致');
  const profile = await db.profiles.get('student');
  if (!profile) throw Error('请先创建成长档案');
  if (profile.parentPin) requireParent();
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await digest(pin, salt);
  await db.transaction('rw', db.profiles, async () => {
    const current = await db.profiles.get('student');
    if (!current || current.parentPin?.hash !== profile.parentPin?.hash) throw Error('口令已在另一页设置，请重新打开家长入口');
    if (current.parentPin) requireParent();
    await db.profiles.update('student', { parentPin: { salt, hash }, parentFailures: 0, parentRetryAt: 0 });
  });
  // Require entry of the saved PIN before opening the parent area.
  lockParent();
}
export async function unlockParent(pin: string) {
  const profile = await db.profiles.get('student');
  if (!profile?.parentPin) throw Error('请先设置家长口令');
  if ((profile.parentRetryAt ?? 0) > Date.now()) throw Error('尝试次数较多，请一分钟后再试');
  const hash = await digest(pin, profile.parentPin.salt);
  const accepted = await db.transaction('rw', db.profiles, async () => {
    const current = await db.profiles.get('student');
    if (current?.parentPin?.hash !== profile.parentPin!.hash) throw Error('口令已变化，请重新输入');
    if ((current.parentRetryAt ?? 0) > Date.now()) throw Error('尝试次数较多，请一分钟后再试');
    if (hash !== current.parentPin!.hash) {
      const failures = (current.parentFailures ?? 0) + 1;
      await db.profiles.update('student', { parentFailures: failures % 5, parentRetryAt: failures >= 5 ? Date.now() + 60_000 : 0 });
      return false;
    }
    await db.profiles.update('student', { parentFailures: 0, parentRetryAt: 0 });
    return true;
  });
  if (!accepted) throw Error('口令不正确，请再试一次');
  unlockParentSession();
}
