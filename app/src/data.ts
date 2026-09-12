import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import { dateSchema, goalSchema, planSchema, awardSchema, journeySchema, bindingSchema, settlementSchema, type Goal, type Plan, type Award, type Journey, type Binding, type Settlement } from './progression-model';
import { prizeSchema,redemptionSchema,rewardImageSchema,validateImage,type Prize,type Redemption,type RewardImage } from './reward-model';
import { installWriteGuard,DATA_VERSION,type RuntimeControl } from './runtime-control';
export const categories=['习惯','兴趣','学习','成长'] as const;
export const companions=[['tuantuan','团团','红熊猫'],['taotao','桃桃','粉色小狐狸'],['guoguo','果果','花栗鼠'],['zhizhi','智智','猫头鹰'],['zhuangzhuang','壮壮','棕熊'],['tiaotiao','跳跳','垂耳兔']];
export const companionImage=(id:string,stage=1)=>stage>1?`./assets/${id}-s${stage}.webp`:`./assets/0${companions.findIndex(c=>c[0]===id)+1}-${id}.webp`;
export const day=(at=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
export const taskSchema=z.object({id:z.string(),name:z.string().trim().min(1).max(40),category:z.enum(categories),date:dateSchema,criteria:z.string().trim().min(1).max(200),minutes:z.number().int().min(1).max(60),stars:z.number().int().min(0).max(99),locked:z.number().int().min(0).max(99).optional(),status:z.enum(['todo','started','done','partial','paused','ended']),createdAt:z.number(),resultAt:z.number().optional(),note:z.string().max(500).optional(),mood:z.string().optional(),planId:z.string().optional(),occurrenceDate:dateSchema.optional(),planVersion:z.number().int().optional(),rewardOverride:z.boolean().optional(),pauseSource:z.enum(['plan','user']).optional(),scheduleExcluded:z.boolean().optional()});
export type Task=z.infer<typeof taskSchema>;
const profileSchema=z.object({id:z.literal('student'),nickname:z.string().trim().min(1).max(20),grade:z.enum(['一年级','二年级','三年级']),companion:z.enum(['tuantuan','taotao','guoguo','zhizhi','zhuangzhuang','tiaotiao']),reduceMotion:z.boolean()});
export type Profile=z.infer<typeof profileSchema>;
const sessionSchema=z.object({id:z.string(),taskId:z.string(),status:z.enum(['running','paused','ended']),mode:z.enum(['countdown','up']),targetMs:z.number().nonnegative(),effectiveMs:z.number().nonnegative(),owner:z.string(),generation:z.number().int(),updatedAt:z.number(),endedAt:z.number().optional(),reason:z.string()});
export type Session=z.infer<typeof sessionSchema>;
const segmentSchema=z.object({id:z.string(),sessionId:z.string(),date:z.string(),ms:z.number().nonnegative()});
type Segment=z.infer<typeof segmentSchema>;
const legacyLedgerSchema=z.object({key:z.string(),taskId:z.string(),delta:z.number().int().min(0).max(99),at:z.number()});
const ledgerSchema=z.object({key:z.string(),taskId:z.string().optional(),redemptionId:z.string().optional(),delta:z.number().int().min(-9999).max(9999),at:z.number().int().nonnegative()});
export type Ledger=z.infer<typeof ledgerSchema>;
const orderSchema=z.object({date:z.string(),ids:z.array(z.string()),revision:z.number().int()});
type Order=z.infer<typeof orderSchema>;
export class ForestDB extends Dexie {
 profiles!:Table<Profile,string>;tasks!:Table<Task,string>;sessions!:Table<Session,string>;segments!:Table<Segment,string>;ledger!:Table<Ledger,string>;orders!:Table<Order,string>;
 goals!:Table<Goal,string>;plans!:Table<Plan,string>;awards!:Table<Award,string>;journeys!:Table<Journey,string>;bindings!:Table<Binding,string>;settlements!:Table<Settlement,string>;
 prizes!:Table<Prize,string>;redemptions!:Table<Redemption,string>;rewardImages!:Table<RewardImage,string>;runtimeControl!:Table<RuntimeControl,string>;
 readonly runtimeState={epoch:0};
 private authorized=new WeakSet<IDBTransaction>();
 allowMaintenanceTransaction(){if(!Dexie.currentTransaction)throw Error('缺少维护事务');this.authorized.add(Dexie.currentTransaction.idbtrans);}
 constructor(name='growbuddy'){
  super(name);this.version(1).stores({profiles:'id',tasks:'id,date,status',sessions:'id,status,taskId',segments:'id,sessionId,date',ledger:'key,taskId',orders:'date'});
  this.version(2).stores({tasks:'id,date,status,planId,&[planId+occurrenceDate]',goals:'id,status',plans:'id,goalId,status',awards:'id,&[sourceType+sourceId]',journeys:'id,companionId',bindings:'date',settlements:'date'});
  this.version(3).stores({prizes:'id',redemptions:'id,&requestId,prizeId,status,redeemedAt',rewardImages:'id',runtimeControl:'id',ledger:'key,taskId,redemptionId'});
  installWriteGuard(this,this.runtimeState,this.authorized);
  this.on('ready',async()=>{await this.transaction('rw',this.runtimeControl,async()=>{let control=await this.runtimeControl.get('main');if(!control){control={id:'main',schemaVersion:DATA_VERSION,epoch:this.runtimeState.epoch};await this.runtimeControl.put(control);}this.runtimeState.epoch=control.epoch;});});
 }
}
export const db=new ForestDB();
export const uid=()=>crypto.randomUUID();
export async function saveTask(input:Task){const task=taskSchema.parse(input);await db.transaction('rw',db.tasks,async()=>{const old=await db.tasks.get(task.id);if(old&&['done','partial','ended'].includes(old.status))throw Error('这项任务已经记录结果。');if(old){task.status=old.status;task.planId=old.planId;task.occurrenceDate=old.occurrenceDate;task.pauseSource=old.pauseSource;}if(old?.locked!==undefined)task.locked=old.locked;if(old?.planId&&old.stars!==task.stars)task.rewardOverride=true;await db.tasks.put(task);});}
export async function completeTask(id:string,result:'done'|'partial',note='',mood=''){
 await db.transaction('rw',[db.tasks,db.ledger,db.sessions,db.profiles,db.journeys,db.bindings],async()=>{const task=await db.tasks.get(id);if(!task)throw Error('找不到这项任务');if(['done','partial'].includes(task.status))return;if(!['todo','started'].includes(task.status))throw Error('请先恢复这项安排，再记录结果');
 const active=await db.sessions.where('taskId').equals(id).filter(s=>s.status!=='ended').toArray();if(active.some(s=>s.status==='running'))throw Error('请先暂停专注，再保存结果。');
 const at=Date.now(),stars=task.locked??task.stars;
 await db.tasks.update(id,{status:result,locked:stars,resultAt:at,note,mood});
 for(const s of active)await db.sessions.update(s.id,{status:'ended',endedAt:at});
 if(result==='done'){
  await db.ledger.add({key:'task-complete:'+id,taskId:id,delta:stars,at});
  const profile=await db.profiles.get('student');
  if(profile&&!await db.bindings.get(day(at))){
   const history=await db.journeys.where('companionId').equals(profile.companion).toArray();
   let journey=history.find(j=>!j.endedAt)??history.sort((a,b)=>b.startedAt-a.startedAt)[0];
   if(!journey){journey={id:uid(),companionId:profile.companion,stage:1,points:0,total:0,startedAt:at};await db.journeys.add(journey);}
   await db.bindings.add({date:day(at),journeyId:journey.id});
  }
 }
 });
}
export async function saveOrder(ids:string[],revision:number){await db.transaction('rw',db.orders,db.tasks,async()=>{const old=await db.orders.get(day());if((old?.revision??0)!==revision)throw Error('顺序已在另一页修改，请重新调整。');const actual=await db.tasks.where('date').equals(day()).filter(t=>['todo','started'].includes(t.status)).primaryKeys();if(ids.length!==actual.length||new Set(ids).size!==ids.length||actual.some(id=>!ids.includes(id)))throw Error('任务清单已变化，请重新调整。');await db.orders.put({date:day(),ids,revision:revision+1});});}
export async function moveToday(id:string){await db.transaction('rw',db.tasks,db.sessions,db.plans,db.goals,async()=>{const t=await db.tasks.get(id);if(!t||!['todo','started','paused'].includes(t.status))throw Error('任务已结束');if(t.planId&&t.status==='paused'){const p=await db.plans.get(t.planId),g=p?await db.goals.get(p.goalId):undefined;if(p?.status!=='active'||g?.status!=='active')throw Error('请先恢复所属目标与计划');}if(await db.sessions.where('taskId').equals(id).filter(s=>s.status==='running').count())throw Error('请先暂停该任务的专注');await db.tasks.update(id,{date:day(),status:t.locked===undefined?'todo':'started',pauseSource:undefined});});}
const progressionBackup={goals:z.array(goalSchema),plans:z.array(planSchema),awards:z.array(awardSchema),journeys:z.array(journeySchema),bindings:z.array(bindingSchema),settlements:z.array(settlementSchema)};
const legacyBackupSchema=z.object({schemaVersion:z.literal(1),appVersion:z.string(),exportedAt:z.number(),profiles:z.array(profileSchema).max(1),tasks:z.array(taskSchema),sessions:z.array(sessionSchema),segments:z.array(segmentSchema),ledger:z.array(legacyLedgerSchema),orders:z.array(orderSchema)});
const version2Backup=legacyBackupSchema.extend({schemaVersion:z.literal(2),...progressionBackup});
const rewardBackup={prizes:z.array(prizeSchema),redemptions:z.array(redemptionSchema),rewardImages:z.array(rewardImageSchema)};
export const backupSchema=z.union([
 version2Backup.extend({schemaVersion:z.literal(3),ledger:z.array(ledgerSchema),...rewardBackup}),
 version2Backup.transform(b=>({...b,schemaVersion:3 as const,prizes:[],redemptions:[],rewardImages:[]})),
 legacyBackupSchema.transform(b=>({...b,schemaVersion:3 as const,goals:[],plans:[],awards:[],journeys:[],bindings:[],settlements:[],prizes:[],redemptions:[],rewardImages:[]}))
]).transform(b=>({...b,ledger:b.ledger.map(l=>ledgerSchema.parse(l))}));
export type Backup=z.infer<typeof backupSchema>;
export function validateBackup(raw:unknown){
 const b=backupSchema.parse(raw);
 for(const [rows,key] of [[b.profiles,'id'],[b.tasks,'id'],[b.sessions,'id'],[b.segments,'id'],[b.ledger,'key'],[b.orders,'date'],[b.goals,'id'],[b.plans,'id'],[b.awards,'id'],[b.journeys,'id'],[b.bindings,'date'],[b.settlements,'date'],[b.prizes,'id'],[b.redemptions,'id'],[b.rewardImages,'id']] as const){const keys=rows.map(r=>(r as unknown as Record<string,unknown>)[key]);if(new Set(keys).size!==keys.length)throw Error('备份中存在重复记录');}
 const ids=new Set(b.tasks.map(t=>t.id)),sessions=new Set(b.sessions.map(s=>s.id)),goals=new Set(b.goals.map(g=>g.id)),plans=new Set(b.plans.map(p=>p.id)),journeys=new Set(b.journeys.map(j=>j.id));
 if(b.sessions.some(s=>!ids.has(s.taskId))||b.ledger.some(l=>l.taskId&&!ids.has(l.taskId))||b.segments.some(s=>!sessions.has(s.sessionId))||b.orders.some(o=>o.ids.some(id=>!ids.has(id)))||b.plans.some(p=>!goals.has(p.goalId))||b.tasks.some(t=>t.planId&&(!plans.has(t.planId)||!t.occurrenceDate))||b.bindings.some(x=>!journeys.has(x.journeyId))||b.settlements.some(x=>!journeys.has(x.journeyId)||!b.bindings.some(y=>y.date===x.date&&y.journeyId===x.journeyId)))throw Error('备份中的关联记录不完整');
 const occurrences=b.tasks.filter(t=>t.planId).map(t=>t.planId+':'+t.occurrenceDate);if(new Set(occurrences).size!==occurrences.length)throw Error('备份中存在重复计划任务');
 if(b.sessions.filter(s=>s.status!=='ended').length>1)throw Error('备份有多个活动计时');
 for(const t of b.tasks){const l=b.ledger.filter(l=>l.taskId===t.id);if(t.status==='done'?(t.resultAt===undefined||l.length!==1||l[0].at!==t.resultAt||l[0].delta!==(t.locked??t.stars)||l[0].key!=='task-complete:'+t.id):l.length>0)throw Error('任务与星星流水不一致');}
 for(const a of b.awards){const source=a.sourceType==='goal'?b.goals.find(g=>g.id===a.sourceId):a.sourceType==='plan'?b.plans.find(p=>p.id===a.sourceId):b.journeys.find(j=>j.id===a.sourceId);if(!source||a.id!==a.sourceType+':'+a.sourceId||('status' in source?(source.status!=='done'||source.completedAt!==a.at||source.assetId!==a.assetId):(!source.endedAt||source.endedAt!==a.at||a.assetId!=='star-'+source.companionId)))throw Error('收藏与来源记录不一致');}
 for(const g of b.goals)if(g.status==='done'&&!b.awards.some(a=>a.id==='goal:'+g.id))throw Error('已达成目标缺少成就');
 for(const p of b.plans)if(p.status==='done'&&!b.awards.some(a=>a.id==='plan:'+p.id))throw Error('已完成计划缺少勋章');
 for(const j of b.journeys)if(j.endedAt&&!b.awards.some(a=>a.id==='journey:'+j.id))throw Error('已结束旅程缺少成长之星');
 for(const j of b.journeys){let accumulated=0;for(const s of b.settlements.filter(s=>s.journeyId===j.id).sort((a,b)=>a.date.localeCompare(b.date))){const count=b.tasks.filter(t=>t.status==='done'&&t.resultAt!==undefined&&day(t.resultAt)===s.date).length;const expected=count>=4&&accumulated<60?1:0;if(s.count!==count||s.delta!==expected)throw Error('开心日与任务记录不一致');accumulated+=expected;}}
 for(const j of b.journeys){if(b.journeys.filter(other=>other.companionId===j.companionId&&!other.endedAt).length>1)throw Error('同一伙伴有多个未结束旅程');const total=b.settlements.filter(s=>s.journeyId===j.id).reduce((n,s)=>n+s.delta,0);if(total!==j.total||j.stage!==(total<10?1:total<30?2:3)||j.points!==(total<10?total:total<30?total-10:total-30)||Boolean(j.endedAt)!==(total===60))throw Error('旅程与开心日结算不一致');}
 const prizeIds=new Set(b.prizes.map(p=>p.id)),imageIds=new Set(b.rewardImages.map(i=>i.id)),orderIds=new Set(b.redemptions.map(o=>o.id));
 for(const image of b.rewardImages)validateImage(image);
 if(new Set(b.redemptions.map(o=>o.requestId)).size!==b.redemptions.length)throw Error('备份包含重复兑换请求');
 if(b.prizes.some(p=>p.imageId&&!imageIds.has(p.imageId))||b.redemptions.some(o=>!prizeIds.has(o.prizeId)||(o.imageIdSnapshot&&!imageIds.has(o.imageIdSnapshot))))throw Error('礼品或订单图片引用缺失');
 for(const l of b.ledger){if(l.taskId){if(l.redemptionId||l.key!=='task-complete:'+l.taskId)throw Error('奖励流水来源无效');}else if(!l.redemptionId||!orderIds.has(l.redemptionId)||!['redeem:'+l.redemptionId,'refund:'+l.redemptionId].includes(l.key))throw Error('奖励流水来源无效');}
 for(const o of b.redemptions){
  const debit=b.ledger.filter(l=>l.key==='redeem:'+o.id),refund=b.ledger.filter(l=>l.key==='refund:'+o.id);
  if(debit.length!==1||debit[0].delta!==-o.costSnapshot||debit[0].at!==o.redeemedAt)throw Error('兑换扣星流水不一致');
  if(o.status==='cancelled'?(refund.length!==1||refund[0].delta!==o.costSnapshot||refund[0].at!==o.cancelledAt||o.cancelledAt===undefined||o.cancelledAt<o.redeemedAt||o.claimedAt!==undefined):refund.length>0||o.cancelledAt!==undefined)throw Error('兑换退款状态不一致');
  if(o.status==='claimed'?(o.claimedAt===undefined||o.claimedAt<o.redeemedAt):o.claimedAt!==undefined)throw Error('兑换领取状态不一致');
 }
 if(b.ledger.reduce((n,l)=>n+l.delta,0)<0)throw Error('备份的星星余额不能为负');
 return b;
}
export async function exportBackup(){return db.transaction('r',db.tables,async()=>({schemaVersion:3 as const,appVersion:'0.3.0',exportedAt:Date.now(),profiles:await db.profiles.toArray(),tasks:await db.tasks.toArray(),sessions:await db.sessions.toArray(),segments:await db.segments.toArray(),ledger:await db.ledger.toArray(),orders:await db.orders.toArray(),goals:await db.goals.toArray(),plans:await db.plans.toArray(),awards:await db.awards.toArray(),journeys:await db.journeys.toArray(),bindings:await db.bindings.toArray(),settlements:await db.settlements.toArray(),prizes:await db.prizes.toArray(),redemptions:await db.redemptions.toArray(),rewardImages:await db.rewardImages.toArray()}));}

export async function beginMaintenance(reason:string){const token=uid();await db.transaction('rw',db.runtimeControl,db.sessions,async()=>{const control=await db.runtimeControl.get('main')??{id:'main' as const,schemaVersion:DATA_VERSION,epoch:db.runtimeState.epoch};if(control.epoch!==db.runtimeState.epoch)throw Error('档案已更新，请先刷新');if(control.maintenance&&control.maintenance.until>Date.now())throw Error('另一个页面正在维护记录，请稍后');if(await db.sessions.where('status').equals('running').count())throw Error('请先在所有页面暂停专注');await db.runtimeControl.put({...control,maintenance:{token,reason,until:Date.now()+30000}});});return token;}
export async function endMaintenance(token:string){await db.transaction('rw',db.runtimeControl,async()=>{const current=await db.runtimeControl.get('main');if(current?.maintenance?.token===token)await db.runtimeControl.put({...current,maintenance:undefined});});}
export async function restoreBackup(raw:unknown){
 const b=validateBackup(raw);
 if(typeof createImageBitmap==='function'){for(const image of b.rewardImages){const bytes=Uint8Array.from(atob(image.base64),c=>c.charCodeAt(0));let decoded:ImageBitmap;try{decoded=await createImageBitmap(new Blob([bytes],{type:image.mimeType}));}catch{throw Error('备份中的礼品图片无法解码');}const tooLarge=Math.max(decoded.width,decoded.height)>800;decoded.close();if(tooLarge)throw Error('备份中的礼品图片尺寸超过800像素');}}
 const token=await beginMaintenance('恢复备份');
 try{const epoch=await db.transaction('rw',db.tables,async()=>{
  const control=await db.runtimeControl.get('main');if(control?.maintenance?.token!==token||control.maintenance.until<Date.now())throw Error('维护状态已变化，请重试');db.allowMaintenanceTransaction();
  for(const table of db.tables)if(table.name!=='runtimeControl')await table.clear();
  await db.profiles.bulkAdd(b.profiles);await db.tasks.bulkAdd(b.tasks);await db.sessions.bulkAdd(b.sessions.map(s=>({...s,status:s.status==='running'?'paused':s.status,owner:'',generation:s.generation+1,reason:'从备份恢复，请手动继续'})));await db.segments.bulkAdd(b.segments);await db.ledger.bulkAdd(b.ledger);await db.orders.bulkAdd(b.orders);await db.goals.bulkAdd(b.goals);await db.plans.bulkAdd(b.plans);await db.awards.bulkAdd(b.awards);await db.journeys.bulkAdd(b.journeys);await db.bindings.bulkAdd(b.bindings);await db.settlements.bulkAdd(b.settlements);await db.prizes.bulkAdd(b.prizes);await db.redemptions.bulkAdd(b.redemptions);await db.rewardImages.bulkAdd(b.rewardImages);
  await db.runtimeControl.put({...control,epoch:control.epoch+1,maintenance:undefined});return control.epoch+1;
 });db.runtimeState.epoch=epoch;}finally{await endMaintenance(token);}
}
