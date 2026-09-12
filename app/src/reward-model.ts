import { z } from 'zod';

const timestamp=z.number().int().nonnegative();
export const prizeSchema=z.object({id:z.string().min(1),name:z.string().trim().min(1,'请填写礼品名称').max(40,'名称最多40字'),description:z.string().max(500,'说明最多500字'),costStars:z.number().int('星星数需要是整数').min(1,'至少需要1颗星星').max(9999,'最多9999颗星星'),enabled:z.boolean(),version:z.number().int().positive(),imageId:z.string().optional(),createdAt:timestamp,updatedAt:timestamp});
export const redemptionSchema=z.object({id:z.string().min(1),requestId:z.string().min(1),prizeId:z.string().min(1),prizeVersion:z.number().int().positive(),nameSnapshot:z.string().min(1).max(40),descriptionSnapshot:z.string().max(500),imageIdSnapshot:z.string().optional(),costSnapshot:z.number().int().min(1).max(9999),status:z.enum(['pending','claimed','cancelled']),redeemedAt:timestamp,claimedAt:timestamp.optional(),cancelledAt:timestamp.optional()});
export const rewardImageSchema=z.object({id:z.string().min(1),mimeType:z.enum(['image/jpeg','image/png','image/webp']),base64:z.string().min(1).max(683000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),createdAt:timestamp});
export type Prize=z.infer<typeof prizeSchema>;
export type Redemption=z.infer<typeof redemptionSchema>;
export type RewardImage=z.infer<typeof rewardImageSchema>;
export function imageUrl(image:RewardImage|undefined){return image?`data:${image.mimeType};base64,${image.base64}`:'./assets/gift-default.webp';}
export function validateImage(image:RewardImage){
 const value=rewardImageSchema.parse(image),bytes=atob(value.base64);
 if(bytes.length>500*1024)throw Error('礼品图片超过500KB');
 const valid=value.mimeType==='image/png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):value.mimeType==='image/jpeg'?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';
 if(!valid)throw Error('礼品图片内容与格式不一致');return value;
}
