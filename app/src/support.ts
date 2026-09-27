import { z } from 'zod';
import { db, day, type Task } from './data';
import { requireParent } from './parent-session';

export const supportLabels = { unrecorded: '未记录', independent: '自己完成', reminded: '提醒后完成', together: '一起完成', excluded: '不适用' } as const;
export type Support = keyof typeof supportLabels;
export async function recordSupport(id: string, value: Support) {
  requireParent();
  z.enum(['unrecorded', 'independent', 'reminded', 'together', 'excluded']).parse(value);
  await db.transaction('rw', db.tasks, async () => {
    requireParent();
    const task = await db.tasks.get(id);
    if (!task || !['done', 'partial'].includes(task.status)) throw Error('请先记录任务结果');
    if (task.status === 'partial' && ['independent', 'reminded'].includes(value)) throw Error('部分完成可记录一起完成，或暂不记录');
    await db.tasks.update(id, { support: value, supportUpdatedAt: Date.now() });
  });
}
export function weekRange(today: string, offset = 0) {
  const start = new Date(today + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7 + offset * 7);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)] as const;
}
export function supportReport(tasks: Task[], from: string, to: string) {
  const records = tasks.filter(t => t.status === 'done' && t.resultAt !== undefined && day(t.resultAt) >= from && day(t.resultAt) <= to);
  const counts: Record<Support, number> = { unrecorded: 0, independent: 0, reminded: 0, together: 0, excluded: 0 };
  for (const task of records) counts[task.support ?? 'unrecorded']++;
  return { total: records.length, counts, recorded: counts.independent + counts.reminded + counts.together };
}
