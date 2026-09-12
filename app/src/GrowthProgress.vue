<script setup lang="ts">
import { registerUpdateGuard } from "./update-safety";
import { ref,computed,onUnmounted } from 'vue';
import { liveQuery } from 'dexie';
import { db,companions,companionImage,day,type Profile } from './data';
import { type Journey,type Award,type Binding,type Settlement,type Goal,type Plan } from './progression-model';
import { selectCompanion,maintainProgress } from './progression';
const props=defineProps<{profile:Profile;from:string;to:string}>();
const mode=ref('收获概览'),collection=ref('成就'),journeys=ref<Journey[]>([]),awards=ref<Award[]>([]),binding=ref<Binding>(),settlements=ref<Settlement[]>([]),goals=ref<Goal[]>([]),plans=ref<Plan[]>([]),completed=ref(0),error=ref(''),busy=ref(false),confirmNew=ref(false);
const sub=liveQuery(async()=>({journeys:await db.journeys.toArray(),awards:await db.awards.toArray(),binding:await db.bindings.get(day()),settlements:await db.settlements.toArray(),goals:await db.goals.toArray(),plans:await db.plans.toArray(),completed:await db.tasks.filter(t=>t.status==='done'&&!!t.resultAt&&day(t.resultAt)===day()).count()})).subscribe({next:d=>{journeys.value=d.journeys;awards.value=d.awards;binding.value=d.binding;settlements.value=d.settlements;goals.value=d.goals;plans.value=d.plans;completed.value=d.completed;},error:e=>error.value=String(e)});onUnmounted(()=>sub.unsubscribe());
const inRange=(date:string)=>date>=props.from&&date<=props.to;
const current=computed(()=>journeys.value.find(j=>j.companionId===props.profile.companion&&!j.endedAt)??journeys.value.filter(j=>j.companionId===props.profile.companion).sort((a,b)=>b.startedAt-a.startedAt)[0]);
const companionName=(id:string)=>companions.find(c=>c[0]===id)?.[1]??id;
const currentImage=computed(()=>!current.value||current.value.stage===1?companionImage(props.profile.companion):`./assets/${props.profile.companion}-s${current.value.stage}.webp`);
const periodAwards=computed(()=>awards.value.filter(a=>inRange(day(a.at))).sort((a,b)=>b.at-a.at));
const list=computed(()=>periodAwards.value.filter(a=>a.sourceType===({成就:'goal',勋章:'plan',成长之星:'journey'} as const)[collection.value as '成就']));
const todayCompanion=computed(()=>journeys.value.find(j=>j.id===binding.value?.journeyId));
const periodHappy=computed(()=>settlements.value.filter(s=>inRange(s.date)).reduce((n,s)=>n+s.delta,0));
async function act(fn:()=>Promise<void>){if(busy.value)return;busy.value=true;error.value='';try{await fn();confirmNew.value=false;}catch(e){error.value=e instanceof Error?e.message:'保存失败，请重试';}finally{busy.value=false;}}
onUnmounted(registerUpdateGuard(()=>busy.value||confirmNew.value));
</script>
<template>
 <section class="progress-intro">
  <div class="section-heading"><h2>收获与伙伴</h2><span class="small muted">全部方向 · 沿用上方时间范围</span></div>
  <div class="growth-links"><button v-for="m in ['收获概览','伙伴旅程','成就与勋章']" :key="m" :class="mode===m?'primary':'secondary'" @click="mode=m">{{m}}</button></div>
  <p v-if="error" class="error" role="alert">{{error}}</p>
  <template v-if="mode==='收获概览'">
   <div class="stats"><div class="panel"><strong>{{periodAwards.filter(a=>a.sourceType==='goal').length}}</strong><span>本期达成目标</span></div><div class="panel"><strong>{{periodAwards.filter(a=>a.sourceType==='plan').length}}</strong><span>本期完成计划</span></div><div class="panel"><strong>{{periodHappy}}</strong><span>本期新增开心值</span></div><div class="panel"><strong>{{periodAwards.filter(a=>a.sourceType==='journey').length}}</strong><span>本期成长之星</span></div></div>
   <section class="panel"><h3>本期目标与计划回顾</h3><div v-for="a in periodAwards.filter(a=>a.sourceType!=='journey')" :key="a.id" class="record-row"><div>{{a.name}}<small>{{day(a.at)}} · {{a.sourceType==='goal'?'目标达成':'计划完成'}}</small></div><img :src="'./assets/'+a.assetId+'.webp'" alt="获得的收藏" width="64" height="64"></div><p v-if="!periodAwards.some(a=>a.sourceType!=='journey')" class="muted">这个时间范围还没有达成记录。</p><p class="small muted">当前进行中：{{goals.filter(g=>g.status==='active').length}} 个目标、{{plans.filter(p=>p.status==='active').length}} 项计划。到探索发现查看和回顾。</p></section>
  </template>
  <template v-if="mode==='伙伴旅程'">
   <section class="panel"><div class="journey-stage"><img :src="currentImage" :alt="companionName(profile.companion)"><div><span class="eyebrow">当前伙伴</span><h2>{{companionName(profile.companion)}} · {{current?['幼年期','少年期','成熟期'][current.stage-1]:'幼年期'}}</h2><p>{{current?.endedAt?'这段旅程已经完成啦':`本阶段开心值 ${current?.points??0} / ${[10,20,30][(current?.stage??1)-1]}`}}</p><progress :value="current?.points??0" :max="[10,20,30][(current?.stage??1)-1]" aria-label="当前阶段开心值"></progress><p class="small">本段旅程 {{current?.total??0}} / 60 个开心日</p></div></div>
    <p>今天：{{['休息中','初醒','活跃','满意','开心'][Math.min(completed,4)]}} · 已完整完成 {{completed}} 项</p><p v-if="todayCompanion?.endedAt" class="criteria">今天归属的旅程已结束，任务和星星照常记录。新旅程从下一个成长日开始积累。</p><p v-else-if="completed>=4&&todayCompanion" class="criteria">今日已达成，日结后增加1点开心值。</p><p v-else class="muted">一天完整完成4项，日结时增加1点。无需连续，也不用每天都达到。</p><p v-if="todayCompanion" class="small">今天的成长记给{{companionName(todayCompanion.companionId)}}。更换伙伴立即改变陪伴，今天的归属保持不变。</p><p v-else class="small muted">今天首次完整完成时，确定当天成长归属。</p>
    <div v-if="current?.endedAt"><button class="secondary" @click="confirmNew=!confirmNew">开启新的伙伴旅程</button><div v-if="confirmNew" class="criteria"><p>为{{companionName(profile.companion)}}开启新旅程，从幼年期开始。已有成长之星与记录会保留。</p><button class="primary" :disabled="busy" @click="act(()=>selectCompanion(profile.companion,true))">确认开启新旅程</button></div></div>
    <div class="companion-grid"><button v-for="c in companions" :key="c[0]" class="companion-option" :class="{selected:profile.companion===c[0]}" :disabled="busy" @click="act(async()=>{await maintainProgress();await selectCompanion(c[0] as Profile['companion'])})"><img :src="companionImage(c[0]!)" :alt="c[2]"><strong>{{c[1]}}</strong></button></div>
   </section>
   <section class="panel journey-history"><h3>我的伙伴旅程</h3><p>全部伙伴终身开心日：{{journeys.reduce((n,j)=>n+j.total,0)}} 天</p><div v-for="j in journeys" :key="j.id" class="record-row"><div>{{companionName(j.companionId)}} · {{j.endedAt?'已完成':'成长中'}}<small>{{day(j.startedAt)}}开始 · {{j.total}} 个开心日</small></div><img v-if="j.endedAt" :src="'./assets/star-'+j.companionId+'.webp'" alt="成长之星"></div></section>
  </template>
  <template v-if="mode==='成就与勋章'">
   <div class="segmented planning-tabs"><button v-for="c in ['成就','勋章','成长之星']" :key="c" :class="{active:collection===c}" @click="collection=c">{{c}}</button></div>
   <p class="muted">本期获得 {{list.length}} 次 · 全部已收集 {{new Set(awards.filter(a=>a.sourceType===({成就:'goal',勋章:'plan',成长之星:'journey'} as Record<string,string>)[collection]).map(a=>a.assetId)).size}} 种</p>
   <div class="collection-grid"><article v-for="a in list" :key="a.id" class="panel collection-card"><img :src="'./assets/'+a.assetId+'.webp'" :alt="collection"><h3>{{a.sourceType==='journey'?companionName(journeys.find(j=>j.id===a.sourceId)?.companionId??'')+'的成长之星':a.name}}</h3><small>{{day(a.at)}}</small><small>{{a.sourceType==='goal'?'目标达成':a.sourceType==='plan'?'计划完成':'旅程完成'}}</small></article></div><section v-if="!list.length" class="panel empty"><img src="./assets/empty-records.webp" alt="" class="empty-art"><p>这个时间里还没有{{collection}}，慢慢积累就好。</p></section>
  </template>
 </section>
</template>
