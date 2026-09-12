import 'fake-indexeddb/auto';
import { describe,it,expect,vi } from 'vitest';
import { elapsedDelta,splitInterval,startFocus,pauseFocus,resumeFocus,finishFocus,focus } from '../src/focus';
import { db,saveTask,day } from '../src/data';
describe('专注计时边界',()=>{
 it('正常时间采用单调差值，休眠和系统改时不补算',()=>{expect(elapsedDelta(1000,1001)).toBe(1000);expect(elapsedDelta(90000,90000)).toBe(0);expect(elapsedDelta(1000,60000)).toBe(0);expect(elapsedDelta(-1,1)).toBe(0);});
 it('跨上海午夜按实际日期分开，重试无需使用重试时间',()=>{const end=Date.parse('2026-09-13T00:00:03+08:00');expect(splitInterval(end-5000,end)).toEqual([{date:'2026-09-12',ms:2000},{date:'2026-09-13',ms:3000}]);});
 it('6分钟加9分钟只有15分钟，暂停不进入片段',()=>{const start=Date.parse('2026-09-12T09:00:00+08:00');const slices=[...splitInterval(start,start+360000),...splitInterval(start+480000,start+1020000)];expect(slices.reduce((n,s)=>n+s.ms,0)).toBe(900000);});
 it('会话事务保存两段时间，暂停空档不累计，阻止第二会话',async()=>{for(const table of db.tables)await table.clear();let mono=1000,wall=Date.parse('2026-09-12T09:00:00+08:00');vi.spyOn(performance,'now').mockImplementation(()=>mono);vi.spyOn(Date,'now').mockImplementation(()=>wall);try{await saveTask({id:'focus-task',name:'专注测试',category:'学习',criteria:'读一段',date:day(),minutes:15,stars:3,status:'todo',createdAt:wall});await startFocus('focus-task','countdown');await expect(startFocus('focus-task','up')).rejects.toThrow('还有一段');mono+=4000;wall+=4000;await pauseFocus();mono+=120000;wall+=120000;await resumeFocus();mono+=3000;wall+=3000;await finishFocus();const session=(await db.sessions.toArray())[0];expect(session.status).toBe('ended');expect(session.effectiveMs).toBe(7000);expect((await db.segments.toArray()).reduce((n,s)=>n+s.ms,0)).toBe(7000);expect((await db.tasks.get('focus-task'))?.locked).toBe(3);expect(await db.ledger.count()).toBe(0);}finally{vi.restoreAllMocks();focus.session=null;}});
});
