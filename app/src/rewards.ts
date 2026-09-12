import { db,uid,day,type Ledger } from './data';
import { prizeSchema,validateImage,type Prize,type RewardImage,type Redemption } from './reward-model';

export class PrizeChangedError extends Error {constructor(){super('礼品已经修改，请按最新内容重新确认');}}
export async function savePrize(input:Prize,expectedVersion:number,image?:RewardImage){
 const prize=prizeSchema.parse({...input,version:expectedVersion+1,updatedAt:Date.now()});
 if(image){validateImage(image);prize.imageId=image.id;}
 await db.transaction('rw',db.prizes,db.rewardImages,async()=>{
  const old=await db.prizes.get(prize.id);if((old?.version??0)!==expectedVersion)throw new PrizeChangedError();
  if(image)await db.rewardImages.add(image);
  if(prize.imageId&&!await db.rewardImages.get(prize.imageId))throw Error('礼品图片未保存，请重新选择');
  await db.prizes.put({...prize,createdAt:old?.createdAt??prize.createdAt});
 });
}
export async function redeemPrize(prizeId:string,expectedVersion:number,requestId:string){
 if(!requestId)throw Error('请重新打开兑换确认');
 return db.transaction('rw',db.prizes,db.redemptions,db.ledger,async()=>{
  const existing=await db.redemptions.where('requestId').equals(requestId).first();
  if(existing){if(existing.prizeId!==prizeId)throw Error('兑换请求与礼品不一致');return existing;}
  const prize=await db.prizes.get(prizeId);if(!prize||!prize.enabled)throw Error('这个礼品已停用，请选择其他礼品');
  if(prize.version!==expectedVersion)throw new PrizeChangedError();
  const balance=(await db.ledger.toArray()).reduce((n,l)=>n+l.delta,0);if(balance<prize.costStars)throw Error(`还差 ${prize.costStars-balance} 颗星星，慢慢积累就好`);
  const at=Date.now(),order:Redemption={id:uid(),requestId,prizeId,prizeVersion:prize.version,nameSnapshot:prize.name,descriptionSnapshot:prize.description,imageIdSnapshot:prize.imageId,costSnapshot:prize.costStars,status:'pending',redeemedAt:at};
  await db.redemptions.add(order);await db.ledger.add({key:'redeem:'+order.id,redemptionId:order.id,delta:-order.costSnapshot,at});return order;
 });
}
export async function claimRedemption(id:string){await db.transaction('rw',db.redemptions,async()=>{const order=await db.redemptions.get(id);if(!order)throw Error('找不到兑换记录');if(order.status==='claimed')return;if(order.status!=='pending')throw Error('这笔兑换已取消，不能记录领取');await db.redemptions.update(id,{status:'claimed',claimedAt:Date.now()});});}
export async function cancelRedemption(id:string){await db.transaction('rw',db.redemptions,db.ledger,async()=>{const order=await db.redemptions.get(id);if(!order)throw Error('找不到兑换记录');if(order.status==='cancelled')return;if(order.status!=='pending')throw Error('这笔兑换已领取，不能再取消');const at=Date.now();await db.ledger.add({key:'refund:'+id,redemptionId:id,delta:order.costSnapshot,at});await db.redemptions.update(id,{status:'cancelled',cancelledAt:at});});}

export function rewardReport(ledger:Ledger[],orders:Redemption[],from:string,to:string){const within=(at:number)=>{const date=day(at);return date>=from&&date<=to;};const period=ledger.filter(l=>within(l.at));const earned=period.filter(l=>l.taskId).reduce((n,l)=>n+l.delta,0),spent=-period.filter(l=>l.key.startsWith('redeem:')).reduce((n,l)=>n+l.delta,0),refunded=period.filter(l=>l.key.startsWith('refund:')).reduce((n,l)=>n+l.delta,0);return {balance:ledger.reduce((n,l)=>n+l.delta,0),earned,spent,refunded,net:spent-refunded,claimed:orders.filter(o=>o.claimedAt!==undefined&&within(o.claimedAt)).length};}

export async function prepareRewardImage(file:File):Promise<RewardImage>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPEG、PNG 或 WebP 图片');
 if(file.size>5*1024*1024)throw Error('原图片不能超过5MB');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('这张图片无法打开，请换一张');}
 try{
  if(bitmap.width*bitmap.height>40_000_000)throw Error('图片尺寸太大，请选择较小的图片');
  const scale=Math.min(1,800/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('图片处理暂时不可用');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let blob:Blob|null=null;for(const quality of [.85,.7,.5,.3]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=500*1024)break;}
  if(!blob||blob.size>500*1024)throw Error('图片还太大，请换一张简单些的图片');
  const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('图片读取失败'));reader.readAsDataURL(blob!);});
  return validateImage({id:uid(),mimeType:blob.type as RewardImage['mimeType'],base64:url.split(',')[1],createdAt:Date.now()});
 }finally{bitmap.close();}
}
