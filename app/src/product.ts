import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import './style.css';
import './responsive.css';
import './progression.css';
import './forest-theme.css';
import { isProductHash } from './entry';
document.title = '成长森林 · 每天进步一点点';
window.addEventListener('hashchange', () => {
  if (!isProductHash(location.hash)) location.reload();
});
const router=createRouter({history:createWebHashHistory(),scrollBehavior:()=>({top:0,left:0}),routes:[{path:'/:pathMatch(.*)*',component:{template:'<span />'}}]});
createApp(App).use(router).mount('#app');
