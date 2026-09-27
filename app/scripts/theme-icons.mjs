// Color variants of the existing Lucide assets; original paths and LICENSE are retained.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const source=fileURLToPath(new URL('../public/assets/icons/',import.meta.url));
const output=path.join(source,'themed');await mkdir(output,{recursive:true});
const colors={House:'#65814C',BookOpen:'#4C829F',Palette:'#AC773B',Sprout:'#5F8749',Clock:'#AB7934',Timer:'#8970A4',CircleCheck:'#4D8B70',Gift:'#B8794B',Compass:'#5C8C9B',Settings:'#77889A',ListChecks:'#5F8771',CalendarDays:'#7C86A4'};
for(const name of (await readdir(source)).filter(name=>name.endsWith('.svg')&&name!=='gold-star.svg')){
 const key=path.basename(name,'.svg'),stroke=colors[key]||'#6B8074';
 let svg=(await readFile(path.join(source,name),'utf8')).replaceAll('#286347',stroke).replace('stroke-width="2"','stroke-width="1.7"').replace('fill="currentColor"',`fill="${stroke}"`);
 const fillPaths=(fills)=>{let index=0;svg=svg.replace(/<path /g,match=>{const fill=fills[index++];return fill?`<path fill="${fill}" `:match;});};
 if(key==='House'||key==='BookOpen'){
  fillPaths([undefined,key==='House'?'#EEF1D9':'#DCEEF5']);
  const paths=svg.match(/<path[^>]+\/>/g);svg=svg.replace(/<path[^>]+\/>/g,'').replace('</svg>',paths.reverse().join('')+'</svg>');
 }
 if(key==='Palette'){
  fillPaths(['#FFF0D0']);let dot=0;const paints=['#DCAB69','#A5BDE0','#9FB979','#D79A87'];
  svg=svg.replace(/<circle[^>]+\/>/g,tag=>{const color=paints[dot++];return tag.replace(/fill="[^"]+"/,`fill="${color}"`).replace('/>',` stroke="${color}"/>`);});
 }
 if(key==='Sprout')fillPaths(['#D8E9BF','#E2EFCF']);
 if(key==='Gift')fillPaths([undefined,'#FFF0CF','#F1D8B1']);
 if(key==='Compass'){svg=svg.replace('<circle ','<circle fill="#E6F1F3" ');fillPaths(['#B9D9DC']);}
 if(key==='Clock')svg=svg.replace('<circle ','<circle fill="#FFF0CC" ');
 if(key==='CircleCheck')svg=svg.replace('<circle ','<circle fill="#E2F0DF" ');
 if(key==='Timer'){
  const circle=svg.match(/<circle[^>]+\/>/)[0].replace('<circle ','<circle fill="#EEE5F6" ');
  svg=svg.replace(/<circle[^>]+\/>/,'').replace(/(<svg[^>]+>)/,`$1${circle}`);
 }
 if(key==='Settings'){fillPaths(['#EAF0F5']);svg=svg.replace('<circle ','<circle fill="#FFFFFF" ');}
 await writeFile(path.join(output,name),svg);
}
console.log('Generated themed Lucide icons.');
