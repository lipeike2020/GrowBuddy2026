<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue';
import type { Profile } from './data';
import { setParentPin, unlockParent } from './parent';
import { registerUpdateGuard } from './update-safety';
const props = defineProps<{ profile: Profile }>();
const emit = defineEmits<{ unlocked: [] }>();
const pin = ref(''), confirmation = ref(''), busy = ref(false), error = ref(''), message = ref('');
watch(() => props.profile.parentPin?.hash, () => { pin.value = ''; confirmation.value = ''; });
onUnmounted(registerUpdateGuard(() => busy.value || !!pin.value));
async function submit() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    if (props.profile.parentPin) { await unlockParent(pin.value); pin.value = ''; emit('unlocked'); }
    else { await setParentPin(pin.value, confirmation.value); pin.value = ''; confirmation.value = ''; message.value = '口令已保存，请输入口令进入家长管理。'; }
  } catch (e) { error.value = e instanceof Error ? e.message : '操作失败，请重试'; }
  finally { busy.value = false; }
}
</script>
<template>
  <main class="parent-gate">
    <section class="page-heading"><div><div class="eyebrow">把规则交给家长，把行动留给孩子</div><h1>家长入口</h1></div></section>
    <form class="panel" @submit.prevent="submit">
      <h2>{{ profile.parentPin ? '输入家长口令' : '请家长设置口令' }}</h2>
      <p>{{ profile.parentPin ? '解锁后可以管理安排、确认兑换和补充陪伴记录。' : '首次设置请由家长完成。口令用于保护本机的管理操作，请妥善记住。' }}</p>
      <label>6位数字口令<input v-model="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" :autocomplete="profile.parentPin ? 'current-password' : 'new-password'" required></label>
      <label v-if="!profile.parentPin">再次输入口令<input v-model="confirmation" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="message" role="status">{{ message }}</p>
      <button class="primary wide" :disabled="busy">{{ busy ? '请稍候…' : profile.parentPin ? '进入家长管理' : '保存家长口令' }}</button>
      <p class="small muted">仅在当前页面解锁，5分钟无操作后自动退出；交给孩子前请点“返回孩子界面”。口令随完整备份保存，当前不支持找回口令。</p>
      <a href="#/today">返回今日行动</a>
    </form>
  </main>
</template>
<style>.parent-gate{max-width:640px;margin:auto}.parent-gate form{margin-top:24px}</style>
