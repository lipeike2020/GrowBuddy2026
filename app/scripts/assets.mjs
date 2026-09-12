import sharp from 'sharp';
import { readdir, mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('../视觉设计-V2'), out=path.resolve('public/assets');
await mkdir(out,{recursive:true});
const report=[];
for(const dir of ['伙伴','通用','成长之星','原版57张/成就','原版57张/勋章']){
 let files; try{files=await readdir(path.join(root,dir));}catch{continue;}
 for(const file of files.filter(f=>f.endsWith('.png'))){const name=file.replace('.png','.webp'); const info=await sharp(path.join(root,dir,file)).resize({width:dir==='伙伴'?512:256,withoutEnlargement:true}).webp({quality:82}).toFile(path.join(out,name));report.push({source:dir+'/'+file,file:name,bytes:info.size});}
}
await mkdir(path.join(out,'icons'),{recursive:true});
for(const file of await readdir(path.join(root,'通用/功能图标')))await copyFile(path.join(root,'通用/功能图标',file),path.join(out,'icons',file));
await writeFile('public/assets/manifest.json',JSON.stringify(report,null,2));
console.log(`${report.length} images, ${Math.round(report.reduce((n,r)=>n+r.bytes,0)/1024)} KB`);
await sharp(path.join(root,'原版57张/装饰/D07.png')).resize({width:1440,withoutEnlargement:true}).webp({quality:83}).toFile(path.join(out,'forest-day.webp'));
for(const size of [192,512])await sharp(path.join(out,'app-icon.webp')).resize(size,size).png().toFile(`public/pwa-${size}.png`);
await sharp(path.join(out,'app-icon.webp')).resize(320,320).extend({top:96,bottom:96,left:96,right:96,background:'#f7f8f2'}).png().toFile('public/pwa-maskable.png');
