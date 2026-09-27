// Run against a local dev/preview server. Uses a fresh, disposable browser context.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const browser = await chromium.launch(process.env.GROWBUDDY_BROWSER ? { executablePath: process.env.GROWBUDDY_BROWSER } : { channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion:'reduce' });
const page = await context.newPage(), errors=[];
page.on('pageerror', e => errors.push(e.message));
const base = process.env.GROWBUDDY_TEST_URL || 'http://127.0.0.1:4173';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('UI smoke tests require a local server');
const output='test-results/parent-smoke';await fs.mkdir(output,{recursive:true});
const shot=async name=>{await page.screenshot({path:`${output}/${name}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);};
const unlock=async()=>{await page.getByRole('button',{name:'家长入口',exact:true}).click();await page.getByLabel('6位数字口令',{exact:true}).fill('246810');await page.getByRole('button',{name:'进入家长管理',exact:true}).click();await expect(page.getByRole('heading',{name:'家长管理',exact:true})).toBeVisible();};
try {
 await page.goto(base+'/#/today');
 await page.getByLabel('怎么称呼你？').fill('测试小芽');await page.getByRole('button',{name:'一起出发',exact:true}).click();
 await expect(page.getByRole('heading',{name:'今日行动',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'选择任务',exact:true})).toHaveCount(0);
 await page.goto(base+'/#/explore');await expect(page.getByRole('heading',{name:'家长入口',exact:true})).toBeVisible();
 await page.getByLabel('6位数字口令',{exact:true}).fill('246810');await page.getByLabel('再次输入口令').fill('246810');await page.getByRole('button',{name:'保存家长口令',exact:true}).click();
 await expect(page.getByRole('heading',{name:'输入家长口令',exact:true})).toBeVisible();
 await page.getByLabel('6位数字口令',{exact:true}).fill('111111');await page.getByRole('button',{name:'进入家长管理',exact:true}).click();await expect(page.getByRole('alert')).toContainText('口令不正确');
 await page.getByLabel('6位数字口令',{exact:true}).fill('246810');await page.getByRole('button',{name:'进入家长管理',exact:true}).click();
 await page.getByRole('link',{name:'管理任务与计划',exact:true}).click();await page.getByRole('button',{name:'创建独立任务',exact:true}).click();
 await page.getByLabel('我想做什么',{exact:true}).fill('整理书包');await page.getByLabel('做到什么就算完成',{exact:true}).fill('按课表放好课本');await page.getByLabel('完整完成获得星星').fill('5');await page.getByRole('button',{name:'保存安排',exact:true}).click();
 await page.getByRole('button',{name:'家长管理',exact:true}).click();await page.getByRole('link',{name:/礼品与兑换/}).click();await page.getByRole('button',{name:'奖品设置',exact:true}).click();await page.getByRole('button',{name:'添加礼品',exact:true}).click();
 await page.getByLabel('礼品名称').fill('公园野餐');await page.getByLabel('礼品说明').fill('周末一起去公园');await page.getByLabel('需要多少颗星星').fill('3');await page.getByRole('button',{name:'保存礼品',exact:true}).click();
 await page.getByRole('button',{name:'返回孩子界面',exact:true}).click();await page.getByRole('button',{name:'记录完成',exact:true}).click();await page.getByRole('button',{name:'记好这次努力',exact:true}).click();
 await page.getByRole('link',{name:'我的奖励',exact:true}).click();await expect(page.getByRole('button',{name:'奖品设置',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'申请兑换',exact:true}).click();await page.getByRole('button',{name:'提交申请',exact:true}).click();await expect(page.getByRole('article').getByText('等家长确认',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'记录兑现',exact:true})).toHaveCount(0);await shot('01-child-request');
 await unlock();await page.getByRole('button',{name:'自己完成',exact:true}).click();await expect(page.getByRole('button',{name:'自己完成',exact:true})).toHaveAttribute('aria-pressed','true');
 await shot('02-parent-mobile');await page.setViewportSize({width:1280,height:900});await shot('03-parent-desktop');await page.setViewportSize({width:390,height:844});
 await page.getByRole('link',{name:/礼品与兑换/}).click();await page.getByRole('button',{name:'兑换记录',exact:true}).click();await page.getByRole('button',{name:'确认申请',exact:true}).click();await page.getByLabel('兑现时间或约定').fill('周六下午一起去公园');await page.getByRole('button',{name:'确认并保存约定',exact:true}).click();await expect(page.getByText('兑现约定：周六下午一起去公园')).toBeVisible();await shot('04-approved');
 await page.getByRole('button',{name:'返回孩子界面',exact:true}).click();await page.getByRole('link',{name:'我的奖励',exact:true}).click();await page.getByRole('button',{name:'兑换记录',exact:true}).click();await expect(page.getByRole('button',{name:'记录兑现',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'取消并退星',exact:true})).toHaveCount(0);
 await unlock();await page.getByRole('link',{name:/礼品与兑换/}).click();await page.getByRole('button',{name:'兑换记录',exact:true}).click();await page.getByRole('button',{name:'记录兑现',exact:true}).click();await page.getByRole('button',{name:'确认已兑现',exact:true}).click();await expect(page.getByRole('article').getByText('已领取',{exact:true})).toBeVisible();
 const other=await context.newPage();await other.goto(base+'/#/settings');await expect(other.getByRole('heading',{name:'家长入口',exact:true})).toBeVisible();await other.close();
 await page.reload();await expect(page.getByRole('button',{name:'家长入口',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'奖品设置',exact:true})).toHaveCount(0);
 await unlock();await page.clock.install();await page.clock.fastForward(301_000);await expect(page.getByRole('heading',{name:'家长入口',exact:true})).toBeVisible();
 expect(errors).toEqual([]);console.log('PASS: child/parent routes, PIN, task, support, reward approval/claim, reload and tab isolation, mobile/desktop layout; no page errors.');
} catch(error) { await page.screenshot({path:`${output}/failure.png`,fullPage:true});console.error('Page:',await page.locator('body').innerText());console.error('Runtime errors:',errors);throw error; }
finally { await browser.close(); }
