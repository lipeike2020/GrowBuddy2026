<script setup lang="ts">
import { ref,onUnmounted } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import { beginMaintenance,endMaintenance } from './data';
import { safeToUpdate } from './update-safety';
const props=defineProps<{details?:boolean}>();
const online=ref(navigator.onLine),ready=ref(false),update=ref(false),error=ref(''),busy=ref(false);
const development=import.meta.env.DEV;
let registration:ServiceWorkerRegistration|undefined;
const network=()=>online.value=navigator.onLine;
window.addEventListener('online',network);window.addEventListener('offline',network);
onUnmounted(()=>{window.removeEventListener('online',network);window.removeEventListener('offline',network);});
if(import.meta.env.PROD)registerSW({immediate:true,onOfflineReady(){ready.value=true;},onNeedRefresh(){update.value=true;},onRegisteredSW(_url,r){registration=r;if(r?.active)ready.value=true;},onRegisterError(){error.value='离线资源尚未准备好，请联网后重试。';}});
async function apply(){
 if(busy.value)return;error.value='';if(!safeToUpdate()){error.value='请先保存或关闭编辑，并暂停专注，再更新应用。';return;}
 busy.value=true;let token:string|undefined;
 try{
  if(!registration?.waiting||!navigator.serviceWorker.controller)throw Error('更新尚未准备好，请稍后重试。');
  const count=await new Promise<number>((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();reject(Error('无法确认其他页面状态，请稍后重试。'));},3000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data.count);};navigator.serviceWorker.controller!.postMessage({type:'GROWBUDDY_CLIENTS'},[channel.port2]);});
  if(count!==1)throw Error('请先保存并关闭其他成长森林页面，再更新。');
  token=await beginMaintenance('更新应用');if(!safeToUpdate())throw Error('还有未保存的内容，请稍后更新。');
  await new Promise<void>((resolve,reject)=>{const changed=()=>{clearTimeout(timer);resolve();};const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',changed);reject(Error('更新未完成，请稍后重试。'));},15000);navigator.serviceWorker.addEventListener('controllerchange',changed,{once:true});registration!.waiting!.postMessage({type:'SKIP_WAITING'});});
  await endMaintenance(token);token=undefined;location.reload();
 }catch(e){error.value=e instanceof Error?e.message:'更新失败，请稍后重试。';}finally{if(token)await endMaintenance(token);busy.value=false;}
}
</script>
<template><aside v-if="props.details||!online||update||error" class="offline-status" role="status"><span>{{!online?'当前离线 · 记录保存在本机':ready?'离线资源已就绪':development?'开发预览 · 离线功能在正式构建中启用':'正在准备离线资源…'}}</span><button v-if="update" class="quiet" :disabled="busy" @click="apply">{{busy?'正在更新…':'发现新版本，安全更新'}}</button><p v-if="error" class="error">{{error}}</p></aside></template>
<style>.offline-status{font-size:12px;color:#647469;padding:8px 0;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.offline-status .error{width:100%;margin:0}</style>
