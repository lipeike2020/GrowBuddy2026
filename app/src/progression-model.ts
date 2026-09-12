import { z } from 'zod';

export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'请填写有效日期');
export const companionSchema=z.enum(['tuantuan','taotao','guoguo','zhizhi','zhuangzhuang','tiaotiao']);
const category=z.enum(['习惯','兴趣','学习','成长']);
const name=z.string().trim().min(1,'请填写名称').max(40);
const criteria=z.string().trim().min(1,'请填写完成标准').max(200);
const scheduleSchema=z.object({from:dateSchema,taskName:name,criteria,category,frequency:z.enum(['daily','weekly','once']),weekdays:z.array(z.number().int().min(0).max(6)),startDate:dateSchema,endDate:dateSchema,minutes:z.number().int().min(1).max(60),stars:z.number().int().min(0).max(99),version:z.number().int().positive()});
export const goalSchema=z.object({id:z.string(),name,category,criteria,description:z.string().max(500),dueDate:dateSchema.optional(),assetId:z.string().regex(/^A(0[1-9]|1[0-9]|20)$/),status:z.enum(['active','paused','done']),version:z.number().int().positive(),createdAt:z.number(),completedAt:z.number().optional()});
export const planSchema=z.object({id:z.string(),goalId:z.string(),name,taskName:name,criteria,category,frequency:z.enum(['daily','weekly','once']),weekdays:z.array(z.number().int().min(0).max(6)),startDate:dateSchema,endDate:dateSchema,minutes:z.number().int().min(1).max(60),stars:z.number().int().min(0).max(99),assetId:z.string().regex(/^M(0[1-9]|1[0-9]|20)$/),status:z.enum(['active','paused','done']),pausedByGoal:z.boolean().optional(),version:z.number().int().positive(),createdAt:z.number(),completedAt:z.number().optional(),templateId:z.string().optional(),scheduleHistory:z.array(scheduleSchema).optional()}).refine(p=>p.endDate>=p.startDate,'结束日期不能早于开始日期').refine(p=>p.frequency!=='weekly'||p.weekdays.length>0,'每周至少选择一天');
export const awardSchema=z.object({id:z.string(),sourceType:z.enum(['goal','plan','journey']),sourceId:z.string(),assetId:z.string(),name:z.string(),at:z.number()});
export const journeySchema=z.object({id:z.string(),companionId:companionSchema,stage:z.number().int().min(1).max(3),points:z.number().int().min(0).max(30),total:z.number().int().min(0).max(60),startedAt:z.number(),endedAt:z.number().optional()});
export const bindingSchema=z.object({date:dateSchema,journeyId:z.string()});
export const settlementSchema=z.object({date:dateSchema,journeyId:z.string(),count:z.number().int().nonnegative(),delta:z.number().int().min(0).max(1)});
export type Goal=z.infer<typeof goalSchema>;
export type Plan=z.infer<typeof planSchema>;
export type Award=z.infer<typeof awardSchema>;
export type Journey=z.infer<typeof journeySchema>;
export type Binding=z.infer<typeof bindingSchema>;
export type Settlement=z.infer<typeof settlementSchema>;
export const addDays=(date:string,count:number)=>new Date(Date.parse(date+'T00:00:00Z')+count*86400000).toISOString().slice(0,10);
export function occursOn(plan:Pick<Plan,'startDate'|'endDate'|'frequency'|'weekdays'>,date:string){return date>=plan.startDate&&date<=plan.endDate&&(plan.frequency==='daily'||(plan.frequency==='once'?date===plan.startDate:plan.weekdays.includes(new Date(date+'T00:00:00Z').getUTCDay())));}
export function scheduleSnapshot(plan:Plan,from:string){return scheduleSchema.parse({...plan,from});}
export function effectiveSchedule(plan:Plan,date:string){const revision=plan.scheduleHistory?.filter(s=>s.from<=date).sort((a,b)=>b.from.localeCompare(a.from))[0];return revision?{...plan,...revision}:plan;}
export function advanceJourney(j:Journey,at:number):Journey{if(j.endedAt)return j;const total=j.total+1,points=j.points+1,threshold=[10,20,30][j.stage-1];return {...j,total,points:points===threshold&&j.stage<3?0:points,stage:points===threshold&&j.stage<3?j.stage+1:j.stage,...(total===60?{endedAt:at}:{})};}
