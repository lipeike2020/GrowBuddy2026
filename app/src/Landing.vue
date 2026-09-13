<script setup lang="ts">
import { ref } from 'vue';
const menuOpen = ref(false);
const steps = [
  { name: '目标', question: '我想成为怎样的自己？', example: '我想养成阅读习惯', text: '从孩子的愿望出发，一起找到值得尝试的方向。' },
  { name: '计划', question: '我准备怎样慢慢做到？', example: '每周选三天阅读', text: '把大目标拆成小安排，为行动留出合适的时间。' },
  { name: '任务', question: '今天，我可以做什么？', example: '今天读 15 分钟', text: '一次专心做好一件事，完成后记录感受与收获。' },
];
const areas = [
  { name: '习惯', icon: 'Repeat', text: '整理书桌、规律作息', detail: '让生活里的小事，成为自己的好习惯。' },
  { name: '兴趣', icon: 'Palette', text: '篮球、游泳、编程', detail: '为好奇心留一扇门，试试自己喜欢的事。' },
  { name: '学习', icon: 'BookOpen', text: '阅读、英语、知识探索', detail: '从一个问题、一段故事，走向更大的世界。' },
  { name: '成长', icon: 'Sprout', text: '回顾努力、认识自己', detail: '看见自己的尝试，也接纳每一天的不同。' },
];
const buddies = [
  { name: '团团', image: '01-tuantuan', role: '陪你迈出第一步', text: '小小的行动，也值得认真对待。' },
  { name: '桃桃', image: '02-taotao', role: '和你好奇地探索', text: '去发现一件让自己眼睛发亮的事。' },
  { name: '果果', image: '03-guoguo', role: '收藏生活的小美好', text: '每一点积累，都有自己的意义。' },
  { name: '智智', image: '04-zhizhi', role: '一起发现新知识', text: '多问一个为什么，再试一种方法。' },
  { name: '壮壮', image: '05-zhuangzhuang', role: '给你动手的勇气', text: '认真试一试，就是不错的开始。' },
  { name: '跳跳', image: '06-tiaotiao', role: '温柔地陪在你身边', text: '开心或有点累，都可以慢慢说。' },
];
</script>
<template>
<div class="website">
  <a class="skip-link" href="#content">跳到正文</a>
  <header class="site-header">
    <a class="brand" href="#top" aria-label="GrowBuddy 成长森林首页"><img src="./assets/app-icon.webp" alt="" width="44" height="44"><span>GrowBuddy <small>成长森林</small></span></a>
    <button class="menu-toggle" :aria-expanded="menuOpen" aria-controls="site-nav" @click="menuOpen = !menuOpen">{{ menuOpen ? '收起' : '导航' }}</button>
    <nav id="site-nav" :class="{ open: menuOpen }" aria-label="官网导航" @click="menuOpen = false">
      <a href="#method">成长方法</a><a href="#companions">六位伙伴</a><a href="#philosophy">设计理念</a><a href="#contact">交流建议</a><a class="button compact" href="./#/">开始使用 <img src="./assets/icons/ChevronRight.svg" alt=""></a>
    </nav>
  </header>
  <main id="content">
    <section id="top" class="hero"><div class="hero-inner wrap">
      <div class="hero-copy"><p class="eyebrow">森林里的第一小步</p><h1>让每一小步，<br>长成自己的力量。</h1><p class="hero-description">从目标到计划，从计划到今天的任务。<br class="desktop-break">和六位森林伙伴一起，在习惯、兴趣、学习中看见成长。</p><div class="actions"><a class="button" href="./#/">开始使用 <img src="./assets/icons/ChevronRight.svg" alt=""></a><a class="button secondary" href="./#/today">回到今日任务</a></div><p class="hero-note">好习惯，像小树一样，<br>在每天的行动中慢慢长大。</p></div>
      <div class="hero-product" aria-label="今日行动界面示例"><img class="hero-buddy" src="./assets/01-tuantuan.webp" alt="团团背着绿色背包，邀请你开始成长旅程" width="512" height="512" fetchpriority="high"><div class="product-preview"><div class="preview-heading"><h2>今日行动</h2><span>产品示例</span></div><div class="preview-task"><img src="./assets/icons/BookOpen.svg" alt=""><div><strong>阅读 15 分钟</strong><small>读一段，讲讲喜欢的故事。</small></div></div><div class="preview-task"><img src="./assets/icons/ListChecks.svg" alt=""><div><strong>整理自己的书桌</strong><small>给书本和文具找个家。</small></div></div><a class="button preview-start" href="./#/today">去安排今天的任务 <img src="./assets/icons/ChevronRight.svg" alt=""></a><p>从一件小事开始。</p></div></div>
    </div></section>
    <section id="method" class="section wrap method"><div class="section-heading"><p class="eyebrow">目标 · 计划 · 任务</p><h2>把一个愿望，<br class="mobile-break">变成今天能做的小事。</h2><p>让目标不再遥远。从想法走向行动，在每一天积累成长。</p></div><img class="method-art" src="./website/method.webp" alt="从目标靶心，到计划清单，再到今天要读的书" width="1500" height="420" loading="lazy"><div class="steps"><article v-for="(step, i) in steps" :key="step.name"><span class="step-number">0{{ i + 1 }}</span><h3>{{ step.name }}</h3><p class="step-question">{{ step.question }}</p><p class="step-example">{{ step.example }}</p><p>{{ step.text }}</p></article></div></section>
    <section class="areas-section"><div class="section wrap"><div class="section-heading"><p class="eyebrow">不止是学习清单</p><h2>成长，发生在生活的每一个角落。</h2><p>在喜欢的事里探索，在日常的行动中积累，发现更多可能的自己。</p></div><div class="areas"><article v-for="area in areas" :key="area.name"><img :src="`./assets/icons/${area.icon}.svg`" alt="" width="48" height="48" loading="lazy"><h3>{{ area.name }}</h3><p class="area-examples">{{ area.text }}</p><p>{{ area.detail }}</p></article></div></div></section>
    <section id="companions" class="section wrap companions"><div class="section-heading"><p class="eyebrow">认识你的森林伙伴</p><h2>六位小伙伴，<br class="mobile-break">陪你走自己的成长路。</h2><p>选一位喜欢的伙伴，在行动、记录和回顾中，一起慢慢成长。</p></div><div class="buddy-grid"><article v-for="buddy in buddies" :key="buddy.name"><img :src="`./assets/${buddy.image}.webp`" :alt="buddy.name" width="512" height="512" loading="lazy"><h3>{{ buddy.name }}</h3><p class="buddy-role">{{ buddy.role }}</p><p>{{ buddy.text }}</p></article></div></section>
    <section id="philosophy" class="philosophy-section"><div class="section wrap philosophy"><div class="philosophy-intro"><p class="eyebrow">我们为什么这样设计</p><h2>有方法的陪伴，<br>给成长留出空间。</h2><p>孩子需要的不只是“完成了多少”，也需要有机会选择、尝试，并理解自己的努力。</p><p>GrowBuddy 希望成为亲子之间温和的工具：一起商量目标，把行动变小，让回顾成为交流。</p></div><div class="principles"><article><span>01</span><div><h3>自主选择</h3><p>和孩子一起决定目标，听听“我想做什么”，让孩子参与自己的成长安排。</p></div></article><article><span>02</span><div><h3>小步行动</h3><p>让计划具体、力所能及。把注意力放在今天可以开始的一步，给尝试留出余地。</p></div></article><article><span>03</span><div><h3>温和回顾</h3><p>关注努力、方法与感受。一起聊聊哪里顺利、哪里困难，下次想怎样调整。</p></div></article></div><div class="research-note">设计参考：<a href="https://selfdeterminationtheory.org/topics/application-education/" target="_blank" rel="noopener noreferrer">自我决定理论</a>中的自主、胜任与关系支持，以及<a href="https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation" target="_blank" rel="noopener noreferrer">元认知与自我调节</a>中的计划、监控与回顾。以上是设计出发点，不代表本产品已获得教育效果验证。</div></div></section>
    <section class="section wrap faq"><div class="section-heading"><p class="eyebrow">开始之前</p><h2>你可能还想了解</h2></div><details><summary>第一次使用，从哪里开始？</summary><p>点击“开始使用”，在当前设备创建成长档案、选择喜欢的伙伴，再一起定一个小目标。已经有档案时，直接进入今日任务。</p></details><details><summary>需要每天完成所有任务吗？</summary><p>不必把完成数量当作评价孩子的标准。根据实际情况调整计划，允许暂停，也给休息、玩耍和自由探索留出时间。</p></details><details><summary>星星、勋章和礼品应该怎么使用？</summary><p>把它们作为记录努力、分享喜悦的方式。亲子一起商量礼品约定，避免拿奖励施压或和其他孩子比较，也多聊聊过程中的发现与感受。</p></details><details><summary>记录存在哪里？换设备怎么办？</summary><p>当前版本使用本机成长档案，记录保存在当前浏览器中，没有云端账号同步。请在产品设置中定期导出备份；换设备后，可在新设备导入备份。清理浏览器数据可能会移除记录。</p></details><details><summary>没有网络时可以使用吗？</summary><p>联网打开产品，等待离线资源就绪后，可以继续使用已缓存的功能。第一次使用和获取更新需要联网；建议把产品安装到桌面，方便下次打开。</p></details></section>
    <section class="closing"><div class="wrap"><p class="eyebrow">每个孩子，都有自己的节奏</p><h2>今天，种下一个小目标。</h2><p>不急着长成大树，先认真对待这一小步。</p><div class="actions"><a class="button" href="./#/">开始使用 <img src="./assets/icons/ChevronRight.svg" alt=""></a><a class="button secondary" href="./#/today">回到今日任务</a></div></div></section>
    <section id="contact" class="section wrap contact"><div><p class="eyebrow">一起把 GrowBuddy 变得更好</p><h2>聊聊产品，<br>也聊聊如何陪孩子长大。</h2><p>欢迎添加微信，分享使用中的想法、提出优化建议，或交流育儿中的发现与困惑。</p><p class="phone-label">联系电话</p><a class="phone" href="tel:13036394464">130 3639 4464</a><p class="contact-note">点击号码即可拨打。期待听到你的真实体验。</p></div><figure class="wechat"><a href="./website/wechat.jpg" target="_blank" rel="noopener" aria-label="打开微信二维码原图"><img src="./website/wechat.jpg" alt="微信交流二维码，扫码添加微信，交流产品建议与育儿心得" width="728" height="710" loading="lazy"></a><figcaption><strong>扫码加微信，一起交流</strong><span>手机端可打开原图，保存后到微信扫一扫中选择相册识别。</span><a href="./website/wechat.jpg" target="_blank" rel="noopener">打开二维码原图</a></figcaption></figure></section>
  </main>
  <footer class="site-footer wrap"><a class="brand" href="#top"><img src="./assets/app-icon.webp" width="36" height="36" alt=""><span>GrowBuddy <small>成长森林</small></span></a><p>每一小步，都值得被看见。</p><a href="./#/">进入产品</a></footer>
</div>
</template>
