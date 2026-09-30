<script setup lang="ts">
import { computed, ref } from 'vue';
import { liveQuery } from 'dexie';
import { db, type Task } from './data';
import { addDays, effectiveSchedule, occursOn, type Goal, type Plan } from './progression-model';

const props=defineProps<{today:string;planId?:string}>();
const emit=defineEmits<{(e:'open-plan',id:string):void;(e:'back'):void;(e:'open-task',id:string):void}>();
const goals=ref<Goal[]>([]),plans=ref<Plan[]>([]),tasks=ref<Task[]>([]),expanded=ref<string[]>([]);
const categoryIcons:Record<string,string>={习惯:'House',兴趣:'Palette',学习:'BookOpen',成长:'Sprout'};
function goalArt(goal:Goal){return goal.status==='done'?'./assets/'+goal.assetId+'.webp':'./assets/icons/themed/'+categoryIcons[goal.category]+'.svg';}
function planArt(plan:Plan){return plan.status==='done'?'./assets/'+plan.assetId+'.webp':'./assets/icons/themed/'+categoryIcons[plan.category]+'.svg';}
const subscription=liveQuery(async()=>({goals:await db.goals.toArray(),plans:await db.plans.toArray(),tasks:await db.tasks.toArray()})).subscribe(data=>{goals.value=data.goals;plans.value=data.plans;tasks.value=data.tasks;});
import { onUnmounted } from 'vue';
onUnmounted(()=>subscription.unsubscribe());
const selected=computed(()=>plans.value.find(p=>p.id===props.planId));
const selectedGoal=computed(()=>goals.value.find(g=>g.id===selected.value?.goalId));
const grouped=computed(()=>goals.value.map(goal=>({goal,items:plans.value.filter(p=>p.goalId===goal.id).sort((a,b)=>statusOrder(a.status)-statusOrder(b.status)||a.createdAt-b.createdAt)})).sort((a,b)=>statusOrder(a.goal.status)-statusOrder(b.goal.status)||a.goal.createdAt-b.goal.createdAt));
const orphanPlans=computed(()=>plans.value.filter(p=>!goals.value.some(g=>g.id===p.goalId)));
function statusOrder(status:string){return status==='active'?0:status==='paused'?1:2;}
function statusLabel(status:string){return status==='active'?'进行中':status==='paused'?'已暂停':'已完成';}
function scheduleLabel(plan:Plan){return plan.frequency==='daily'?'每天':plan.frequency==='once'?'一次安排':'每周 '+plan.weekdays.map(d=>['周日','周一','周二','周三','周四','周五','周六'][d]).join('、');}
function todayTask(plan:Plan){return tasks.value.find(t=>t.planId===plan.id&&t.date===props.today&&['todo','started'].includes(t.status));}
function toggle(id:string){expanded.value=expanded.value.includes(id)?expanded.value.filter(v=>v!==id):[...expanded.value,id];}
const week=computed(()=>{const date=new Date(props.today+'T00:00:00Z');const monday=addDays(props.today,-((date.getUTCDay()+6)%7));return Array.from({length:7},(_,i)=>addDays(monday,i));});
function dayInfo(plan:Plan,date:string){
 const task=tasks.value.find(t=>t.planId===plan.id&&(t.occurrenceDate??t.date)===date);
 if(task?.status==='done')return {label:'已完成',tone:'done'};
 if(task?.status==='partial')return {label:'做了一部分',tone:'partial'};
 if(task?.scheduleExcluded)return {label:'已调整',tone:'rest'};
 if(task?.status==='paused'||plan.status==='paused')return {label:'已暂停',tone:'paused'};
 if(task?.status==='ended')return {label:'已结束',tone:'rest'};
 if(!occursOn(effectiveSchedule(plan,date),date))return {label:'休息日',tone:'rest'};
 if(plan.status==='done')return {label:'计划完成',tone:'done'};
 if(date<props.today)return {label:'未记录',tone:'missed'};
 return {label:date===props.today?'今天要做':'已安排',tone:date===props.today?'today':'planned'};
}
const completed=computed(()=>tasks.value.filter(t=>t.planId===selected.value?.id&&t.status==='done').length);
const planned=computed(()=>tasks.value.filter(t=>t.planId===selected.value?.id&&!t.scheduleExcluded&&t.status!=='ended').length);
</script>

<template>
 <main class="child-plans">
  <template v-if="!planId">
   <section class="page-heading plans-heading"><div><div class="eyebrow">看见想去的地方，也看见今天的一步</div><h1>成长计划</h1><p>我的目标和小计划</p></div><img src="./assets/03-guoguo.webp" alt="" class="plans-mascot"></section>
   <section v-if="!grouped.length&&!orphanPlans.length" class="panel empty"><img src="./assets/empty-records.webp" alt="" class="empty-art"><h2>我的成长计划还在准备中</h2><p>和家长聊聊想学会的一件事，再把它变成每天能做的小行动。</p></section>
   <section v-for="{goal,items} in grouped" :key="goal.id" class="panel goal-card"><div class="goal-top"><img :src="goalArt(goal)" alt="" class="goal-art"><div><span class="goal-kicker">我的目标</span><h2>{{goal.name}}</h2><span class="plan-status" :class="goal.status">{{statusLabel(goal.status)}}</span></div></div><p class="goal-criteria">{{goal.criteria}}</p><p v-if="goal.description" class="muted small">{{goal.description}}</p><div v-if="items.length" class="goal-plans"><div class="section-heading"><h3>关联的小计划</h3><span>{{items.length}} 个</span></div><button v-for="plan in (expanded.includes(goal.id)?items:items.slice(0,1))" :key="plan.id" class="plan-preview" @click="emit('open-plan',plan.id)"><span class="plan-preview-main"><strong>{{plan.name}}</strong><small>{{scheduleLabel(plan)}} · {{plan.minutes}} 分钟</small></span><span class="plan-status" :class="plan.status">{{statusLabel(plan.status)}}</span><span aria-hidden="true">›</span></button><button v-if="items.length>1" class="quiet plan-more" @click="toggle(goal.id)">{{expanded.includes(goal.id)?'收起小计划':'还有 '+(items.length-1)+' 个小计划，展开看看'}}</button></div><p v-else class="muted plan-empty">还没有关联的小计划，和家长一起商量第一步吧。</p></section>
   <section v-if="orphanPlans.length" class="panel goal-card"><h2>其他小计划</h2><button v-for="plan in orphanPlans" :key="plan.id" class="plan-preview" @click="emit('open-plan',plan.id)"><strong>{{plan.name}}</strong><span class="plan-status" :class="plan.status">{{statusLabel(plan.status)}}</span><span aria-hidden="true">›</span></button></section>
  </template>
  <template v-else-if="selected">
   <button class="quiet plan-back" @click="emit('back')">‹ 返回成长计划</button>
   <section class="panel plan-detail-head"><div class="goal-kicker">{{selectedGoal?.name??'我的小计划'}}</div><div class="plan-detail-title"><img :src="planArt(selected)" alt=""><div><h1>{{selected.name}}</h1><span class="plan-status" :class="selected.status">{{statusLabel(selected.status)}}</span></div></div><p>{{selected.criteria}}</p><div class="plan-facts"><span>{{scheduleLabel(selected)}}</span><span>{{selected.minutes}} 分钟</span><span>{{selected.startDate}} 至 {{selected.endDate}}</span></div></section>
   <section class="panel plan-week"><div class="section-heading"><div><h2>这一周怎么做</h2><p class="muted small">{{week[0]}} — {{week[6]}}</p></div><span class="muted small">按当前安排和实际记录显示</span></div><div class="week-grid"><div v-for="(date,i) in week" :key="date" class="week-day" :class="dayInfo(selected,date).tone"><strong>{{['一','二','三','四','五','六','日'][i]}}</strong><span>{{date.slice(5)}}</span><small>{{dayInfo(selected,date).label}}</small></div></div></section>
   <section class="panel plan-action"><div><h2>今天的一步</h2><p v-if="todayTask(selected)">{{todayTask(selected)?.name}} · {{todayTask(selected)?.minutes}} 分钟</p><p v-else class="muted">{{selected.status==='paused'?'计划暂停中':selected.status==='done'?'这个计划已经完成啦':'今天没有待做的任务，看看这一周的安排吧。'}}</p></div><button v-if="todayTask(selected)" class="primary" @click="emit('open-task',todayTask(selected)!.id)">去今日行动 →</button></section>
   <p class="plan-footnote">已完成 {{completed}} 次<template v-if="planned"> · 已生成 {{planned}} 次安排</template>。完成情况以实际任务记录为准。</p>
  </template>
  <section v-else class="panel empty"><h2>这个计划暂时找不到</h2><button class="primary" @click="emit('back')">回到成长计划</button></section>
 </main>
</template>
