export const rewardIconIds=['stickers','music','dinner','bubbles','treasure','tent','board','clay','baking','movie','kite','picnic','plant','book','painting','puzzle','blocks','science','animals','wish'] as const;
export type RewardIconId=typeof rewardIconIds[number];
export const rewardIconUrl=(id:RewardIconId)=>`./assets/rewards/${id}.svg`;
const details:[string,string,number][]=[
 ['闪亮贴纸包','挑选一小包喜欢的贴纸，装饰我的成长手册。',10],
 ['家庭音乐官','选出3首喜欢的歌，开启一次家庭音乐时间。',10],
 ['晚餐点菜单','在家里商量好的菜单中，选一道我喜欢的菜。',15],
 ['泡泡欢乐时光','准备一瓶泡泡水，到户外玩一次追泡泡游戏。',15],
 ['寻宝小队长','请家长藏好5件小物品，让我跟着线索找宝藏。',20],
 ['客厅帐篷夜','用毯子搭一座小帐篷，在里面玩一次露营游戏。',20],
 ['桌游我来选','由我挑一款家里的桌游，约好时间一起玩一局。',20],
 ['彩泥创作包','挑选一份约定预算内的彩泥，做出自己的小作品。',25],
 ['小小烘焙师','和家长一起做一次饼干，设计我喜欢的形状。',30],
 ['家庭电影票','挑选一部适龄电影，安排一次家庭电影时间。',30],
 ['风筝飞行日','选个合适的天气，带着风筝一起去户外放飞。',30],
 ['公园野餐会','一起准备点心和野餐垫，到公园吃一次野餐。',35],
 ['小小园丁套装','选一盆小植物或一包种子，种下我的绿色伙伴。',35],
 ['新书心愿券','在约定预算内，挑选一本想拥有的故事书或绘本。',40],
 ['创意画画礼盒','挑选一份画笔或绘画材料，开始新的创作。',40],
 ['拼图挑战盒','选一盒适合自己的拼图，慢慢拼出完整的画面。',45],
 ['积木梦想盒','在约定预算内选一套小积木，搭出我的奇妙世界。',60],
 ['科学探索之旅','和家长约好时间，去科技馆探索一个感兴趣的主题。',70],
 ['动物观察之旅','去动物园认识喜欢的动物，记录3个有趣的发现。',80],
 ['我的心愿大奖','写下一个特别想实现的愿望，和家长约定预算、内容及兑现时间。',100],
];
export const rewardCatalog=rewardIconIds.map((iconId,index)=>{const [name,description,costStars]=details[index]!;return {iconId,name,description,costStars};});
