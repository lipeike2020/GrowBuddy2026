import { db, day, uid, type Profile, type Task } from './data';
import { goalSchema, planSchema, dateSchema, addDays, occursOn, advanceJourney, scheduleSnapshot, effectiveSchedule, type Goal, type Plan } from './progression-model';
export { addDays, occursOn } from './progression-model';

export async function saveGoal(input:Goal,expectedVersion=0){const goal=goalSchema.parse({...input,version:expectedVersion+1});await db.transaction('rw',db.goals,async()=>{const old=await db.goals.get(goal.id);if((old?.version??0)!==expectedVersion)throw Error('目标已在其他页面更新，请重新打开');if(old?.status==='done')throw Error('已达成目标只能查看');await db.goals.put({...goal,status:old?.status??'active',createdAt:old?.createdAt??goal.createdAt,version:expectedVersion+1});});}

async function generateWindow(today:string){let count=0;for(const plan of await db.plans.where('status').equals('active').toArray()){
 const goal=await db.goals.get(plan.goalId);if(goal?.status!=='active')continue;
 for(let n=0;n<7;n++){const date=addDays(today,n),rule=effectiveSchedule(plan,date);if(!occursOn(rule,date))continue;if(await db.tasks.where('[planId+occurrenceDate]').equals([plan.id,date]).count())continue;
 const task:Task={id:plan.id+':'+date,planId:plan.id,occurrenceDate:date,planVersion:rule.version,name:rule.taskName,category:rule.category,criteria:rule.criteria,date,minutes:rule.minutes,stars:rule.stars,status:'todo',createdAt:Date.now()};await db.tasks.add(task);count++;}}
 return count;
}
export async function generateTasks(today=day()){dateSchema.parse(today);return db.transaction('rw',db.goals,db.plans,db.tasks,()=>generateWindow(today));}
export async function savePlan(input:Plan,expectedVersion=0,effectiveDate=day()){
 const plan=planSchema.parse({...input,version:expectedVersion+1});dateSchema.parse(effectiveDate);if(effectiveDate<day())throw Error('修改不能追溯到过去');
 return db.transaction('rw',db.goals,db.plans,db.tasks,async()=>{const goal=await db.goals.get(plan.goalId);if(!goal||goal.status!=='active')throw Error('请先选择一个进行中的目标');const old=await db.plans.get(plan.id);if((old?.version??0)!==expectedVersion)throw Error('计划已更新，请重新打开');if(old?.status==='done')throw Error('已完成计划只能查看');if(old&&old.goalId!==plan.goalId)throw Error('已创建计划不能更换所属目标');
 const next:Plan={...plan,category:goal.category,status:old?.status??'active',version:expectedVersion+1,createdAt:old?.createdAt??plan.createdAt};
 next.scheduleHistory=old?[...(old.scheduleHistory??[scheduleSnapshot(old,'0001-01-01')]).filter(s=>s.from<effectiveDate),scheduleSnapshot(next,effectiveDate)]:[scheduleSnapshot(next,'0001-01-01')];
 await db.plans.put(next);
 let updated=0;if(old){for(const t of await db.tasks.where('planId').equals(plan.id).toArray()){if(t.date<effectiveDate||t.locked!==undefined||!['todo','paused'].includes(t.status)||t.pauseSource==='user')continue;if(!occursOn(next,t.occurrenceDate!)){await db.tasks.update(t.id,{status:'ended',scheduleExcluded:true});}else await db.tasks.update(t.id,{name:next.taskName,criteria:next.criteria,minutes:next.minutes,stars:t.rewardOverride?t.stars:next.stars,planVersion:next.version});updated++;}}
 const generated=await generateWindow(day());return {updated,generated};});
}
async function changePlanState(plan:Plan,paused:boolean,byGoal=false){
 if(plan.status==='done')return;
 if(paused){if(plan.status==='paused')return;await db.plans.update(plan.id,{status:'paused',pausedByGoal:byGoal,version:plan.version+1});for(const t of await db.tasks.where('planId').equals(plan.id).toArray())if(t.date>=day()&&t.status==='todo'&&t.locked===undefined)await db.tasks.update(t.id,{status:'paused',pauseSource:'plan'});
 }else{if(plan.status!=='paused'||(byGoal&&!plan.pausedByGoal))return;await db.plans.update(plan.id,{status:'active',pausedByGoal:false,version:plan.version+1});for(const t of await db.tasks.where('planId').equals(plan.id).toArray())if(t.status==='paused'&&t.pauseSource==='plan')await db.tasks.update(t.id,{status:t.locked===undefined?'todo':'started',pauseSource:undefined});}
}
export async function setPlanPaused(id:string,paused:boolean){await db.transaction('rw',db.goals,db.plans,db.tasks,async()=>{const plan=await db.plans.get(id);if(!plan)throw Error('找不到计划');const goal=await db.goals.get(plan.goalId);if(!paused&&goal?.status!=='active')throw Error('请先恢复所属目标');await changePlanState(plan,paused);if(!paused)await generateWindow(day());});}
export async function setGoalPaused(id:string,paused:boolean){await db.transaction('rw',db.goals,db.plans,db.tasks,async()=>{const goal=await db.goals.get(id);if(!goal||goal.status==='done')throw Error('目标已结束');await db.goals.update(id,{status:paused?'paused':'active',version:goal.version+1});for(const p of await db.plans.where('goalId').equals(id).toArray())await changePlanState(p,paused,true);if(!paused)await generateWindow(day());});}
export async function setTaskPaused(id:string,paused:boolean){await db.transaction('rw',db.tasks,db.plans,db.goals,db.sessions,async()=>{const t=await db.tasks.get(id);if(!t||['done','partial','ended'].includes(t.status))throw Error('任务已经结束');if(await db.sessions.where('taskId').equals(id).filter(s=>s.status==='running').count())throw Error('请先暂停正在运行的专注');if(!paused&&t.planId){const p=await db.plans.get(t.planId),g=p?await db.goals.get(p.goalId):undefined;if(p?.status!=='active'||g?.status!=='active')throw Error('请先恢复所属目标与计划');}await db.tasks.update(id,{status:paused?'paused':t.locked===undefined?'todo':'started',pauseSource:paused?'user':undefined});});}

export async function completePlan(id:string,expectedVersion:number,closeRemaining:boolean){await db.transaction('rw',db.plans,db.tasks,db.awards,db.sessions,async()=>{const plan=await db.plans.get(id);if(!plan)throw Error('找不到计划');if(plan.status==='done')return;if(plan.version!==expectedVersion)throw Error('计划已经修改，请重新回顾');const tasks=await db.tasks.where('planId').equals(id).toArray(),remaining=tasks.filter(t=>!['done','partial','ended'].includes(t.status));if(remaining.some(t=>t.locked!==undefined))throw Error('还有开始过的任务，请先记录结果');if(remaining.length&&!closeRemaining)throw Error('请确认结束尚未开始的安排');const taskIds=new Set(tasks.map(t=>t.id));if(await db.sessions.filter(s=>taskIds.has(s.taskId)&&s.status!=='ended').count())throw Error('请先结束关联的专注');const at=Date.now();for(const t of remaining)await db.tasks.update(t.id,{status:'ended',scheduleExcluded:true});await db.plans.update(id,{status:'done',completedAt:at,version:plan.version+1});await db.awards.add({id:'plan:'+id,sourceType:'plan',sourceId:id,assetId:plan.assetId,name:plan.name,at});});}
export async function completeGoal(id:string,expectedVersion:number){await db.transaction('rw',db.goals,db.plans,db.awards,async()=>{const goal=await db.goals.get(id);if(!goal)throw Error('找不到目标');if(goal.status==='done')return;if(goal.version!==expectedVersion)throw Error('目标已经修改，请重新回顾');if(await db.plans.where('goalId').equals(id).filter(p=>p.status!=='done').count())throw Error('请先回顾并完成关联计划，再确认目标');const at=Date.now();await db.goals.update(id,{status:'done',completedAt:at,version:goal.version+1});await db.awards.add({id:'goal:'+id,sourceType:'goal',sourceId:id,assetId:goal.assetId,name:goal.name,at});});}

export async function selectCompanion(companionId:Profile['companion'],newJourney=false){await db.transaction('rw',db.profiles,db.journeys,async()=>{const profile=await db.profiles.get('student');if(!profile)throw Error('请先建立档案');const history=await db.journeys.where('companionId').equals(companionId).toArray();if(!history.some(j=>!j.endedAt)&&(!history.length||newJourney))await db.journeys.add({id:uid(),companionId,stage:1,points:0,total:0,startedAt:Date.now()});await db.profiles.update('student',{companion:companionId});});}
export async function settleDays(today=day()){await db.transaction('rw',db.tasks,db.bindings,db.settlements,db.journeys,db.awards,async()=>{
 for(const binding of (await db.bindings.toArray()).filter(b=>b.date<today).sort((a,b)=>a.date.localeCompare(b.date))){if(await db.settlements.get(binding.date))continue;const count=await db.tasks.filter(t=>t.status==='done'&&t.resultAt!==undefined&&day(t.resultAt)===binding.date).count(),journey=await db.journeys.get(binding.journeyId);if(!journey)throw Error('旅程记录缺失');const delta=count>=4&&!journey.endedAt?1:0;await db.settlements.add({date:binding.date,journeyId:journey.id,count,delta});if(delta){const at=Date.parse(addDays(binding.date,1)+'T00:00:00+08:00'),next=advanceJourney(journey,at);await db.journeys.put(next);if(next.endedAt)await db.awards.add({id:'journey:'+journey.id,sourceType:'journey',sourceId:journey.id,assetId:'star-'+journey.companionId,name:'伙伴成长之星',at});}}
 });}
let maintenance:Promise<void>|undefined;
export function maintainProgress(){if(!maintenance)maintenance=(async()=>{await settleDays();await db.transaction('rw',db.profiles,db.journeys,async()=>{const profile=await db.profiles.get('student');if(profile&&!await db.journeys.where('companionId').equals(profile.companion).count())await db.journeys.add({id:uid(),companionId:profile.companion,stage:1,points:0,total:0,startedAt:Date.now()});});await generateTasks();})().finally(()=>maintenance=undefined);return maintenance;}

export const templates=[
 {id:'reading-v1',name:'读懂一本喜欢的书',taskName:'阅读一段故事',category:'学习' as const,criteria:'读完一段，说说最喜欢的情节。',goalCriteria:'读完一本书，分享人物和最喜欢的故事。',minutes:15,asset:'11'},
 {id:'bag-v1',name:'学会自己整理书包',taskName:'整理明天的书包',category:'习惯' as const,criteria:'对照课表装好课本、文具和水杯。',goalCriteria:'能自己按课表准备好第二天的物品。',minutes:5,asset:'01'},
 {id:'drawing-v1',name:'画出我的小世界',taskName:'画一幅观察日记',category:'兴趣' as const,criteria:'画下今天发现的一件有趣的事。',goalCriteria:'完成一组观察画，并介绍自己的发现。',minutes:20,asset:'06'},
 {id:'help-v1',name:'成为家里的小帮手',taskName:'做一件力所能及的家务',category:'成长' as const,criteria:'选一件家务，独立完成并收好工具。',goalCriteria:'学会一种家务，能独立完成。',minutes:10,asset:'16'}
];
export interface TemplateOptions {name:string;goalCriteria:string;taskName:string;criteria:string;minutes:number;frequency:Plan['frequency'];weekdays:number[]}
export async function useTemplate(templateId:string,startDate:string,endDate:string,stars:number,custom?:TemplateOptions){
 const source=templates.find(t=>t.id===templateId);if(!source)throw Error('找不到模板');
 const t={...source,...custom};
 const goal:Goal=goalSchema.parse({id:uid(),name:t.name,category:source.category,criteria:t.goalCriteria,description:'',assetId:'A'+source.asset,status:'active',version:1,createdAt:Date.now()});
 const plan:Plan=planSchema.parse({id:uid(),goalId:goal.id,name:t.taskName.slice(0,38)+'计划',taskName:t.taskName,category:source.category,criteria:t.criteria,frequency:custom?.frequency??'daily',weekdays:custom?.weekdays??[],startDate,endDate,minutes:t.minutes,stars,assetId:'M'+source.asset,status:'active',version:1,createdAt:Date.now(),templateId});
 return db.transaction('rw',db.goals,db.plans,db.tasks,async()=>{await db.goals.add(goal);await db.plans.add(plan);return generateWindow(day());});
}
