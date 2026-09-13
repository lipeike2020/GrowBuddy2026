# 成长森林 · GrowBuddy

面向低年级孩子的成长记录应用：把学习、习惯、兴趣与成长目标拆成小行动，用伙伴陪伴和星星奖励记录每一份努力。

首次发布版本：**v0.3.0**，本地优先的试用版本。

## 已有功能

- 今日行动：任务创建、排序、改期、完整/部分完成与心情记录。
- 专注计时：正计时、倒计时、暂停与中断恢复。
- 目标与计划：每日、每周及单次安排，模板和阶段回顾。
- 成长记录：区间统计、六位伙伴成长、成就与勋章收藏。
- 礼品兑换：自定义礼品图片、扣星兑换、领取与取消退款。
- 数据与离线：IndexedDB 本地存储、完整 JSON 备份恢复、CSV 导出、PWA 资源缓存及手动更新。
- 森林主题界面，适配桌面和手机屏幕。

## 本地运行

需要 Node.js 22.12+，推荐 Node.js 24。

```sh
cd app
npm ci
npm run dev
```

仓库已包含可运行的压缩素材。修改原始素材后可执行 `npm run assets` 重新生成。

```sh
npm test
npm run build
npm exec vite -- preview --host 127.0.0.1 --port 4173
```

PWA 离线功能只在正式构建中启用。第一次联网打开并完成资源缓存后可离线使用；线上部署需要 HTTPS。不同域名、浏览器或端口各自保存独立档案。

## GitHub Pages 部署

官网与产品共用同一套构建和域名：`https://www.growbuddy.fun/` 展示官网，`/#/` 进入产品，`/#/today` 进入今日任务。首次使用会先创建本机成长档案；现有档案继续使用原来的 IndexedDB 数据。官网的 `#method`、`#companions` 等锚点不进入产品路由。安装到桌面的 PWA 从 `/#/today` 启动。

官网源码为 `app/src/Landing.vue` 和 `app/src/website.css`，插画与微信二维码位于 `app/public/website/`。联系电话及微信交流区由产品所有者授权公开展示。应用原有启动代码保留在 `app/src/product.ts`，与官网分开加载样式和功能。

仓库 Settings → Pages → Source 使用 **GitHub Actions**。工作流 `.github/workflows/pages.yml` 在推送 `main` 的应用变更时，进入 `app` 执行 `npm ci`、`npm test` 和构建，再发布 `app/dist`；也可以在 Actions 页面手动运行。

构建使用相对资源路径，同时支持仓库子目录及自定义域名，保留 Hash 路由与 PWA 缓存支持。当前 Pages 自定义域名为 `https://www.growbuddy.fun/`；原始入口为 `https://lipeike2020.github.io/GrowBuddy2026/`。网站档案与本地预览的档案独立；需要迁移时使用导出/导入备份。

## 目录

- `app/`：Vue 3 + TypeScript 应用、测试及运行素材。
- `视觉设计-V2/`：主要视觉素材与页面参考稿。
- 根目录中文文档：产品方案、系统设计与技术实现方案。
- `RELEASE_NOTES.md`：首次发布范围与已知限制。

记录保存在设备浏览器中，没有云端账号或自动同步。清理浏览器或更换设备前请导出备份。请勿将个人档案备份提交到仓库。

当前已有 20 个勋章和 20 个成就素材。讨论中的新增体育、英语和编程等标识尚未制作，未计入本次发布。
