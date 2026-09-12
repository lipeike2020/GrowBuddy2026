import Dexie, { type DBCoreTransaction } from 'dexie';

export interface RuntimeControl { id:'main'; schemaVersion:number; epoch:number; maintenance?:{token:string;reason:string;until:number} }
export const DATA_VERSION=3;

/** Serializes writes with maintenance changes inside the same IndexedDB transaction. */
export function installWriteGuard(database:Dexie,state:{epoch:number},authorized:WeakSet<DBCoreTransaction>){
 database.use({stack:'dbcore',name:'growbuddy-maintenance',level:0,create(down){
  if(!down.schema.tables.some(t=>t.name==='runtimeControl'))return down;
  const control=down.table('runtimeControl');
  return {...down,
   transaction(stores,mode,options){return down.transaction(mode==='readwrite'?[...new Set([...stores,'runtimeControl'])]:stores,mode,options);},
   table(name){const table=down.table(name);if(name==='runtimeControl')return table;return {...table,async mutate(request){
    const current=await control.get({trans:request.trans,key:'main'}) as RuntimeControl|undefined;
    if(current?.schemaVersion&&current.schemaVersion!==DATA_VERSION)throw Error('数据版本已更新，请关闭此页并重新打开');
    if(!authorized.has(request.trans)){
     if(current&&current.epoch!==state.epoch)throw Error('档案已在另一页恢复，请刷新后再操作');
     if(current?.maintenance&&current.maintenance.until>Date.now())throw Error('正在'+current.maintenance.reason+'，请稍后再试');
    }
    return table.mutate(request);
   }};}
  };
 }});
}
