import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { db, ForestDB, saveTask, completeTask, exportBackup, restoreBackup, validateBackup, type Task } from '../src/data';
import { lockParent, unlockParentSession, parentSession } from '../src/parent-session';
import { setParentPin, unlockParent } from '../src/parent';
import { savePrize, redeemPrize, approveRedemption, claimRedemption, cancelRedemption } from '../src/rewards';
import { recordSupport, supportReport, weekRange } from '../src/support';
import { saveGoal, useTemplate } from '../src/progression';

const at = Date.parse('2026-09-27T19:00:00+08:00');
const task: Task = { id: 't', name: '整理书包', category: '习惯', criteria: '按课表放好课本', date: '2026-09-27', minutes: 5, stars: 5, status: 'todo', createdAt: at };
const prize = { id: 'p', name: '公园野餐', description: '一起去公园', costStars: 3, enabled: true, version: 0, createdAt: at, updatedAt: at };
beforeEach(async () => {
  unlockParentSession();
  for (const table of db.tables) await table.clear();
  await db.profiles.put({ id: 'student', nickname: '小芽', grade: '一年级', companion: 'tuantuan', reduceMotion: false });
  await saveTask(task);
});
afterEach(() => { vi.restoreAllMocks(); lockParent(); });

it('口令哈希保存，设置后需重新解锁；错误口令不能解锁', async () => {
  await setParentPin('246810', '246810');
  expect(parentSession.unlocked).toBe(false);
  const profile = await db.profiles.get('student');
  expect(profile?.parentPin?.hash).toHaveLength(64);
  expect(JSON.stringify(profile)).not.toContain('246810');
  await expect(unlockParent('111111')).rejects.toThrow('不正确');
  expect(parentSession.unlocked).toBe(false);
  await unlockParent('246810');
  expect(parentSession.unlocked).toBe(true);
});
it('连续5次错误会暂时限制尝试，等待后正确口令可解锁', async () => {
  await setParentPin('246810','246810');
  for (let i=0;i<5;i++) await expect(unlockParent('111111')).rejects.toThrow();
  await expect(unlockParent('246810')).rejects.toThrow('一分钟');
  const retryAt = (await db.profiles.get('student'))!.parentRetryAt!;
  vi.spyOn(Date,'now').mockReturnValue(retryAt + 1);
  await unlockParent('246810');
  expect(parentSession.unlocked).toBe(true);
});
it('并发初次设置只能保存一个口令；锁定时不能重设', async () => {
  const results = await Promise.allSettled([setParentPin('246810','246810'),setParentPin('135790','135790')]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  await expect(setParentPin('111111','111111')).rejects.toThrow('家长');
});
it('孩子可以完成任务，但不能编辑规则、计划、礼品、备份或陪伴记录', async () => {
  lockParent();
  await expect(saveTask({...task,stars:99})).rejects.toThrow('家长');
  await expect(savePrize(prize,0)).rejects.toThrow('家长');
  await expect(saveGoal({} as never)).rejects.toThrow('家长');
  await expect(useTemplate('x','2026-09-27','2026-09-27',1)).rejects.toThrow('家长');
  await expect(exportBackup()).rejects.toThrow('家长');
  await expect(restoreBackup({})).rejects.toThrow('家长');
  await completeTask('t','done');
  await expect(recordSupport('t','independent')).rejects.toThrow('家长');
  expect((await db.tasks.get('t'))?.status).toBe('done');
});
it('过期的家长会话不能写入，即使定时器还未执行', async () => {
  parentSession.expiresAt=Date.now()-1;
  await expect(saveTask(task)).rejects.toThrow('家长');
  expect(parentSession.unlocked).toBe(false);
});
it('陪伴记录可修正、清空，不改变奖励、完成时间和伙伴归属', async () => {
  await completeTask('t','done');
  const before=await exportBackup();
  await recordSupport('t','independent');
  await recordSupport('t','together');
  expect((await db.tasks.get('t'))?.support).toBe('together');
  await recordSupport('t','unrecorded');
  const after=await exportBackup();
  expect(after.ledger).toEqual(before.ledger);
  expect(after.bindings).toEqual(before.bindings);
  expect(after.tasks[0].resultAt).toBe(before.tasks[0].resultAt);
  expect(after.tasks[0].support).toBe('unrecorded');
});
it('周统计按上海实际完成日期；缺失、不适用、部分完成均不冒充独立', () => {
  const records: Task[] = [
    {...task,status:'done',resultAt:at},
    {...task,id:'b',status:'done',resultAt:at,support:'independent'},
    {...task,id:'c',status:'done',resultAt:at,support:'excluded'},
    {...task,id:'d',status:'partial',resultAt:at,support:'together'},
    {...task,id:'e',status:'done',resultAt:Date.parse('2026-09-27T16:00:00Z'),support:'independent'},
  ];
  expect(weekRange('2026-09-27')).toEqual(['2026-09-21','2026-09-27']);
  expect(weekRange('2026-09-28')).toEqual(['2026-09-28','2026-10-04']);
  expect(supportReport(records,...weekRange('2026-09-27'))).toEqual({total:3,recorded:1,counts:{unrecorded:1,independent:1,reminded:0,together:0,excluded:1}});
});
it('申请先预留星星，只有家长可确认与兑现；确认不重复扣星', async () => {
  await completeTask('t','done');await savePrize(prize,0);lockParent();
  const order=await redeemPrize('p',1,'request');
  expect(order.status).toBe('requested');
  await expect(approveRedemption(order.id,'周六')).rejects.toThrow('家长');
  await expect(claimRedemption(order.id)).rejects.toThrow('家长');
  unlockParentSession();
  await expect(claimRedemption(order.id)).rejects.toThrow('先由家长');
  await expect(approveRedemption(order.id,' ')).rejects.toThrow('约定');
  await Promise.all([approveRedemption(order.id,'周六下午'),approveRedemption(order.id,'周六下午')]);
  expect((await db.ledger.toArray()).reduce((n,l)=>n+l.delta,0)).toBe(2);
  lockParent();await expect(cancelRedemption(order.id)).rejects.toThrow('家长');
  unlockParentSession();await claimRedemption(order.id);
  expect((await db.redemptions.get(order.id))?.status).toBe('claimed');
  validateBackup(await exportBackup());
});
it('孩子可取消待确认申请；确认和取消并发时星星保持一致', async () => {
  await completeTask('t','done');await savePrize(prize,0);
  const order=await redeemPrize('p',1,'r');
  await Promise.allSettled([approveRedemption(order.id,'周六'),cancelRedemption(order.id,'活动取消')]);
  expect((await db.redemptions.get(order.id))?.status).toBe('cancelled');
  expect((await db.ledger.toArray()).reduce((n,l)=>n+l.delta,0)).toBe(5);
  const next=await redeemPrize('p',1,'next');lockParent();
  await Promise.all([cancelRedemption(next.id),cancelRedemption(next.id)]);
  expect((await db.ledger.toArray()).reduce((n,l)=>n+l.delta,0)).toBe(5);
});
it('完整备份保留口令、陪伴记录和兑现约定，恢复后重新锁定', async () => {
  await setParentPin('246810','246810');await unlockParent('246810');
  await completeTask('t','done');await recordSupport('t','reminded');await savePrize(prize,0);
  const order=await redeemPrize('p',1,'r');await approveRedemption(order.id,'周六下午');
  const backup=await exportBackup();await restoreBackup(backup);
  expect(parentSession.unlocked).toBe(false);await unlockParent('246810');
  const restored=await exportBackup();
  expect(restored.tasks).toEqual(backup.tasks);expect(restored.redemptions).toEqual(backup.redemptions);
  const bad=structuredClone(backup);bad.redemptions[0].status='requested';
  expect(()=>validateBackup(bad)).toThrow('未确认');
});
it('旧版备份保留待领取订单，历史陪伴情况不推测填充', async () => {
  await completeTask('t','done');await savePrize(prize,0);
  const order=await redeemPrize('p',1,'r');await db.redemptions.update(order.id,{status:'pending'});
  const backup=await exportBackup();
  const old={...backup,schemaVersion:3};await restoreBackup(old);
  expect((await db.tasks.get('t'))?.support).toBeUndefined();
  unlockParentSession();await claimRedemption(order.id);
  validateBackup(await exportBackup());
});
it('真实v3数据库升级保留记录并更新写入版本', async () => {
  const name='parent-migration-'+crypto.randomUUID(),legacy=new Dexie(name);
  legacy.version(3).stores({profiles:'id',tasks:'id,date,status,planId,&[planId+occurrenceDate]',sessions:'id,status,taskId',segments:'id,sessionId,date',ledger:'key,taskId,redemptionId',orders:'date',goals:'id,status',plans:'id,goalId,status',awards:'id,&[sourceType+sourceId]',journeys:'id,companionId',bindings:'date',settlements:'date',prizes:'id',redemptions:'id,&requestId,prizeId,status,redeemedAt',rewardImages:'id',runtimeControl:'id'});
  await legacy.open();await legacy.table('tasks').add(task);await legacy.table('runtimeControl').add({id:'main',schemaVersion:3,epoch:0});legacy.close();
  const upgraded=new ForestDB(name);
  try { await upgraded.open();expect(await upgraded.tasks.get('t')).toEqual(task);expect((await upgraded.runtimeControl.get('main'))?.schemaVersion).toBe(4);await upgraded.tasks.update('t',{note:'升级后可保存'}); }
  finally { upgraded.close();await Dexie.delete(name); }
});
