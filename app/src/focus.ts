import { registerUpdateGuard } from './update-safety';
import { reactive } from 'vue';
import { db, day, uid, type Session } from './data';
const owner=uid();
export const focus=reactive({session:null as Session|null,error:''});
let lastMono=0,lastWall=0,pending=0,segmentId='',busy=false;
registerUpdateGuard(()=>busy||pending>0||focus.session?.status==='running'||!!focus.error);
let pendingSlices:{date:string;ms:number}[]=[];
export function elapsedDelta(mono:number,wall:number){return mono<0||mono>5500||Math.abs(mono-wall)>2000?0:mono;}
export async function startFocus(taskId:string,mode:'countdown'|'up'){
 await db.transaction('rw',[db.tasks,db.sessions],async()=>{if(await db.sessions.filter(s=>s.status!=='ended').count())throw Error('还有一段专注，请先继续或结束它。');const t=await db.tasks.get(taskId);if(!t||!['todo','started'].includes(t.status))throw Error('这项任务已经结束。');await db.tasks.update(taskId,{status:'started',locked:t.locked??t.stars});const s:Session={id:uid(),taskId,status:'running',mode,targetMs:mode==='countdown'?t.minutes*60000:3600000,effectiveMs:0,owner,generation:1,updatedAt:Date.now(),reason:''};await db.sessions.add(s);focus.session=s;});resetClock();
}
function resetClock(){lastMono=performance.now();lastWall=Date.now();pending=0;pendingSlices=[];segmentId=uid();}
export async function hydrateFocus(){if(pending>0||busy)return;const s=await db.sessions.filter(s=>s.status!=='ended').first();focus.session=s??null;if(s?.status==='running'&&s.owner!==owner&&Date.now()-s.updatedAt>12000){await db.transaction('rw',db.sessions,async()=>{const current=await db.sessions.get(s.id);if(current&&current.status==='running'&&Date.now()-current.updatedAt>12000){await db.sessions.update(s.id,{status:'paused',generation:current.generation+1,reason:'上次专注中断，已保留最近保存的时间'});}});focus.session=(await db.sessions.get(s.id))??null;}}
export function splitInterval(start:number,end:number){const slices:{date:string;ms:number}[]=[];let cursor=start;while(cursor<end){const date=day(cursor),next=Math.min(end,Date.parse(date+'T00:00:00+08:00')+86400000);slices.push({date,ms:next-cursor});cursor=next;}return slices;}
function accumulate(){const s=focus.session;if(!s||s.owner!==owner||s.status!=='running')return;const now=performance.now(),wall=Date.now(),delta=elapsedDelta(now-lastMono,wall-lastWall);lastMono=now;lastWall=wall;if(delta===0){s.reason='检测到休眠或时间变化，已自动暂停';return false;}const amount=Math.max(0,Math.min(delta,s.targetMs-s.effectiveMs));pending+=amount;pendingSlices.push(...splitInterval(wall-amount,wall));s.effectiveMs+=amount;return true;}
export async function checkpoint(status:'running'|'paused'|'ended'='running',reason=''){
 const s=focus.session;if(!s)return;if(s.owner!==owner)throw Error('请先继续专注以接续本页，再暂停或结束。');if(busy)throw Error('正在保存专注，请稍后重试');busy=true;
 try{const amount=pending,slices=[...pendingSlices],effectiveMs=s.effectiveMs,now=Date.now();await db.transaction('rw',db.sessions,db.segments,async()=>{const stored=await db.sessions.get(s.id);if(!stored||stored.owner!==owner||stored.generation!==s.generation||stored.status==='ended')throw Error('专注已由其他页面接续，请刷新记录');
 for(const slice of slices){const id=segmentId+':'+slice.date,old=await db.segments.get(id);await db.segments.put({id,sessionId:s.id,date:slice.date,ms:(old?.ms??0)+slice.ms});}
 await db.sessions.update(s.id,{effectiveMs,status,updatedAt:now,reason, ...(status==='ended'?{endedAt:now}:{})});});pending-=amount;pendingSlices.splice(0,slices.length);s.status=status;s.updatedAt=now;s.reason=reason;focus.error='';if(status==='ended')s.endedAt=now;
 }catch(e){s.status='paused';focus.error=e instanceof Error?e.message:'尚未保存，请重试';throw e;}finally{busy=false;}
}
export async function pauseFocus(reason='主动暂停'){if(busy)throw Error('正在保存专注，请稍后重试');if(focus.session?.status==='paused'&&focus.session.owner!==owner)return;accumulate();await checkpoint('paused',reason);}
export async function finishFocus(){if(busy)throw Error('正在保存专注，请稍后重试');const s=focus.session;if(s&&s.owner!==owner){await db.transaction('rw',db.sessions,async()=>{const stored=await db.sessions.get(s.id);if(!stored||stored.status!=='paused')throw Error('请先在正在专注的页面暂停');const claimed={...stored,owner,generation:stored.generation+1};await db.sessions.put(claimed);focus.session=claimed;});}accumulate();await checkpoint('ended','手动结束');focus.session=null;}
export async function resumeFocus(){const s=focus.session;if(!s)return;if(pending>0){await checkpoint('paused','已补存');}
 await db.transaction('rw',db.sessions,async()=>{const stored=await db.sessions.get(s.id);if(!stored||stored.status==='ended')throw Error('这一段专注已经结束');if(stored.status==='running'&&stored.owner!==owner&&Date.now()-stored.updatedAt<12000)throw Error('另一页正在专注，请在那一页暂停后再继续');const next={...stored,owner,generation:stored.generation+1,status:'running' as const,updatedAt:Date.now(),reason:''};await db.sessions.put(next);focus.session=next;});focus.error='';resetClock();}
setInterval(async()=>{if(busy)return;const s=focus.session;if(!s||s.status!=='running')return;if(s.owner!==owner){void hydrateFocus().catch(e=>focus.error=String(e));return;}try{const normal=accumulate();if(!normal)await checkpoint('paused',s.reason);else if(s.effectiveMs>=s.targetMs){await checkpoint('ended',s.mode==='countdown'?'倒计时已到点':'已经专注60分钟，休息一下');focus.session=null;}else if(pending>=5000)await checkpoint();}catch{/* visible error stays in focus.error */}},1000);
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden&&focus.session?.status==='running'&&focus.session.owner===owner)void pauseFocus('离开页面，自动暂停').catch(()=>{});else if(!document.hidden&&!pending)void hydrateFocus();});
