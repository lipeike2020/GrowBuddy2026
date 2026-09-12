import 'fake-indexeddb/auto';
import { beforeEach, afterAll, describe, it, expect } from 'vitest';
import { db, saveTask, completeTask, saveOrder, moveToday, exportBackup, restoreBackup, validateBackup, day, type Task } from '../src/data';
const task=(id='t1',stars=3):Task=>({id,name:'阅读故事',category:'学习',criteria:'读完并分享一个情节',date:day(),minutes:15,stars,status:'todo',createdAt:Date.now()});
beforeEach(async()=>{for(const table of db.tables)await table.clear();});
afterAll(()=>db.close());
describe('任务奖励与数据完整性',()=>{
 it('重复、并发完成只发一次奖励',async()=>{await saveTask(task());await Promise.all([completeTask('t1','done'),completeTask('t1','done')]);expect(await db.ledger.count()).toBe(1);expect((await db.ledger.toArray())[0].delta).toBe(3);});
 it('部分完成不发星，结果不可改成完成再发奖',async()=>{await saveTask(task());await completeTask('t1','partial');await completeTask('t1','done');expect(await db.ledger.count()).toBe(0);expect((await db.tasks.get('t1'))?.status).toBe('partial');});
 it('零星任务保留完成事实，奖励锁定不可被编辑覆盖',async()=>{await saveTask(task('zero',0));await completeTask('zero','done');expect((await db.tasks.get('zero'))?.status).toBe('done');expect((await db.ledger.toArray())[0].delta).toBe(0);await saveTask({...task('locked'),locked:5,status:'started'});await saveTask({...task('locked',9),status:'started'});await completeTask('locked','done');expect((await db.ledger.get('task-complete:locked'))?.delta).toBe(5);});
 it('运行会话阻止非原子完成',async()=>{await saveTask(task());await db.sessions.add({id:'s',taskId:'t1',status:'running',mode:'up',targetMs:3600000,effectiveMs:1000,owner:'other',generation:1,updatedAt:Date.now(),reason:''});await expect(completeTask('t1','done')).rejects.toThrow('暂停');expect(await db.ledger.count()).toBe(0);expect((await db.tasks.get('t1'))?.status).toBe('todo');});
 it('改期沿用任务ID，排序检查版本',async()=>{await saveTask({...task(),date:'2030-01-01'});await moveToday('t1');expect(await db.tasks.count()).toBe(1);expect((await db.tasks.get('t1'))?.date).toBe(day());await saveOrder(['t1'],0);await expect(saveOrder(['t1'],0)).rejects.toThrow('另一页');});
 it('备份恢复不会重复发星',async()=>{await saveTask(task());await completeTask('t1','done');const backup=await exportBackup();await restoreBackup(backup);await completeTask('t1','done');expect(await db.ledger.count()).toBe(1);expect(await exportBackup()).toMatchObject({tasks:backup.tasks,ledger:backup.ledger});});
 it('非法备份和不完整关联不改变原档案',async()=>{await saveTask(task());const backup=await exportBackup();await expect(restoreBackup({...backup,tasks:[...backup.tasks,...backup.tasks]})).rejects.toThrow('重复');expect(await db.tasks.count()).toBe(1);expect(()=>validateBackup({...backup,ledger:[{key:'bad',taskId:'missing',delta:5,at:Date.now()}]})).toThrow('关联');});
 it('拒绝篡改的奖励、越界数值和日期',async()=>{await expect(saveTask(task('invalid',-1))).rejects.toThrow();await expect(saveTask({...task(),date:'2026-02-31'})).rejects.toThrow();await saveTask(task());await completeTask('t1','done');const b=await exportBackup();b.ledger[0].delta=90;expect(()=>validateBackup(b)).toThrow('流水');});
});
