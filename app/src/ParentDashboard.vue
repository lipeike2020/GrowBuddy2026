<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue';
import { liveQuery } from 'dexie';
import { db, day, type Task } from './data';
import { recordSupport, supportLabels, supportReport, weekRange, type Support } from './support';
import { setParentPin } from './parent';
import { registerUpdateGuard } from './update-safety';
const props = defineProps<{ today: string }>();
const emit = defineEmits<{ notice: [message: string] }>();
const tasks = ref<Task[]>([]), requests = ref(0), offset = ref(0), busy = ref(false), error = ref('');
const showPin = ref(false), pin = ref(''), confirmPin = ref('');
const sub = liveQuery(async () => ({ tasks: await db.tasks.toArray(), requests: await db.redemptions.where('status').equals('requested').count() })).subscribe({ next: d => { tasks.value = d.tasks; requests.value = d.requests; }, error: e => error.value = String(e) });
onUnmounted(() => sub.unsubscribe());
onUnmounted(registerUpdateGuard(() => busy.value || showPin.value));
const dates = computed(() => weekRange(props.today, offset.value));
const report = computed(() => supportReport(tasks.value, dates.value[0], dates.value[1]));
const records = computed(() => tasks.value.filter(t => ['done', 'partial'].includes(t.status) && t.resultAt !== undefined && day(t.resultAt) >= dates.value[0] && day(t.resultAt) <= dates.value[1]).sort((a,b) => b.resultAt! - a.resultAt!));
const todayRecords = computed(() => tasks.value.filter(t => ['done', 'partial'].includes(t.status) && t.resultAt !== undefined && day(t.resultAt) === props.today));
const missing = computed(() => todayRecords.value.filter(t => !t.support || t.support === 'unrecorded').length);
async function act(fn: () => Promise<unknown>) {
  if (busy.value) return; busy.value = true; error.value = '';
  try { await fn(); } catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; }
  finally { busy.value = false; }
}
async function record(task: Task, value: Support) {
  await act(async () => { await recordSupport(task.id, value); emit('notice', value === 'together' ? '一起努力的过程也记下了' : '陪伴记录已保存，不影响星星'); });
}
</script>
<template>
 <main class="parent-dashboard">
  <section class="page-heading"><div><div class="eyebrow">看见努力，也看见慢慢独立</div><h1>家长管理</h1><p>今天完整完成 {{ todayRecords.filter(t => t.status === 'done').length }} 件，部分完成 {{ todayRecords.filter(t => t.status === 'partial').length }} 件；{{ missing }} 件尚未记录陪伴情况。</p></div></section>
  <div class="parent-links"><a class="primary" href="#/explore">管理任务与计划</a><a class="secondary" href="#/growth/rewards">礼品与兑换 · {{ requests }} 份待确认</a><a class="secondary" href="#/settings">备份与设置</a></div>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <section class="panel support-summary">
   <div class="section-heading"><h2>{{ offset === 0 ? '本周' : '这周' }}的陪伴记录</h2><div class="date-controls"><button aria-label="上一周" @click="offset--">‹</button><span>{{ dates[0] }} — {{ dates[1] }}</span><button aria-label="下一周" :disabled="offset>=0" @click="offset++">›</button></div></div>
   <p>完整完成 {{ report.total }} 次；已记录陪伴情况 {{ report.recorded }} 次，未记录 {{ report.counts.unrecorded }} 次，不适用 {{ report.counts.excluded }} 次。</p>
   <div class="support-counts"><div v-for="key in (['independent','reminded','together'] as const)" :key="key"><strong>{{ report.counts[key] }}</strong><span>{{ supportLabels[key] }}</span></div></div>
   <p class="small muted">按实际完成日期统计，只统计完整完成的任务。不比较分数，也不根据缺失记录推测进步。</p>
  </section>
  <section class="panel">
   <h2>补充陪伴情况 · 可以跳过，也可以修改</h2>
   <p class="small muted">自己完成：无需提醒，自己开始并完成。提醒后完成：提醒开始后，主要由孩子完成。一起完成：过程中有较多陪伴或帮助。亲子活动可选“不适用”。这些记录不改变奖励。</p>
   <article v-for="task in records" :key="task.id" class="support-record">
    <h3>{{ task.name }}</h3><p class="small muted">{{ day(task.resultAt) }} · {{ task.status === 'done' ? '完整完成' : '做了一部分（不计入上方统计）' }}</p>
    <div class="support-options" :aria-label="task.name+'的陪伴情况'"><button v-for="(label, value) in supportLabels" :key="value" :class="(task.support ?? 'unrecorded') === value ? 'primary' : 'secondary'" :aria-pressed="(task.support ?? 'unrecorded') === value" :disabled="busy || task.status === 'partial' && ['independent','reminded'].includes(value)" @click="record(task,value)">{{ label }}</button></div>
   </article>
   <p v-if="!records.length" class="muted">这周还没有完成记录。完成一件小事后，可以在这里留下观察。</p>
  </section>
  <section class="panel"><button class="quiet" @click="showPin=!showPin">修改家长口令</button><form v-if="showPin" @submit.prevent="act(async()=>{await setParentPin(pin,confirmPin);emit('notice','口令已修改，请重新进入家长管理')})"><label>新的6位数字口令<input v-model="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required></label><label>再次输入<input v-model="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required></label><button class="primary" :disabled="busy">保存并退出家长管理</button></form></section>
 </main>
</template>
<style>
.parent-links,.support-options{display:flex;flex-wrap:wrap;gap:10px}.parent-links{margin-bottom:24px}.parent-links a{text-decoration:none;display:inline-block;padding:12px 18px;border-radius:14px}.support-summary{margin-top:24px}.support-counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.support-counts>div{display:grid;gap:6px;text-align:center;padding:14px;background:#f1f5ec;border-radius:14px}.support-counts strong{font-size:30px}.support-record{padding:18px 0;border-top:1px solid #dde5d8}.support-record h3{margin:0;overflow-wrap:anywhere}.support-options button{min-height:44px}.parent-dashboard .section-heading{flex-wrap:wrap;gap:12px}@media(max-width:650px){.support-counts{gap:6px}.support-counts>div{padding:12px 4px}.support-counts span{font-size:13px}.parent-dashboard .date-controls{flex-wrap:wrap}.parent-links a{flex:1 1 150px;text-align:center}}
</style>
