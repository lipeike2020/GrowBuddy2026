const fs=require('fs'), path=require('path');
const pkg='C:/Users/huawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/lucide';
const l=require(pkg);
const root='E:/GrowBuddy/视觉设计-V2/通用/功能图标';
fs.mkdirSync(root,{recursive:true});
const icons={House:'今日行动',Compass:'探索发现',ChartColumn:'我的成长',Repeat:'习惯',Palette:'兴趣',BookOpen:'学习',Sprout:'成长',ListChecks:'选择任务',ArrowUpDown:'调整顺序',ArrowUp:'上移',ArrowDown:'下移',Timer:'专注计时',Play:'开始',Pause:'暂停',Square:'结束',Check:'完成',ChevronLeft:'返回',ChevronRight:'详情',Plus:'创建',Pencil:'编辑',CalendarDays:'日期',Star:'星星',Gift:'我的奖励',Settings:'设置',Download:'导出',Upload:'导入',Trash2:'已删除项',RotateCcw:'取消退回',CircleCheck:'已领取',Clock:'待领取',Search:'搜索',X:'关闭',Volume2:'声音',ImagePlus:'选择图片',CircleAlert:'提示',Save:'保存'};
const out=[];
for(const [id,name] of Object.entries(icons)){
const nodes=l[id]||l.icons?.[id]; if(!Array.isArray(nodes)) throw Error(id+' missing');
const content=nodes.map(([tag,attrs])=>'<'+tag+' '+Object.entries(attrs).map(([k,v])=>k+'="'+String(v).replaceAll('&','&amp;').replaceAll('"','&quot;')+'"').join(' ')+'/>').join('');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#286347" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+content+'</svg>';
fs.writeFileSync(path.join(root,id+'.svg'),svg);
out.push({id,name,file:'通用/功能图标/'+id+'.svg',source:'Lucide 1.8.0',license:'ISC'});
}
fs.copyFileSync(path.join(pkg,'LICENSE'),path.join(root,'LICENSE'));
fs.writeFileSync(path.join(root,'图标清单.json'),JSON.stringify(out,null,2));
console.log(out.length+' icons exported');

