import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function expectLogosInsideFrames(page: Page) {
  const misplaced = await page.locator('.organization-logo img, .school-logo img').evaluateAll(images => images.filter(image => {
    const frame = image.parentElement!; const box = frame.getBoundingClientRect(); const rect = image.getBoundingClientRect(); const style = getComputedStyle(frame);
    return rect.left < box.left + parseFloat(style.paddingLeft) - 1 || rect.right > box.right - parseFloat(style.paddingRight) + 1
      || rect.top < box.top + parseFloat(style.paddingTop) - 1 || rect.bottom > box.bottom - parseFloat(style.paddingBottom) + 1
      || Math.abs(rect.left + rect.width / 2 - box.left - box.width / 2) > 1 || Math.abs(rect.top + rect.height / 2 - box.top - box.height / 2) > 1;
  }).map(image => image.getAttribute('alt')));
  expect(misplaced).toEqual([]);
}

test('theme collections, FoxRAG deep link, language persistence and related research', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug=1#/projects/arcade-01');
  await expect(page.locator('.case-card')).toHaveCount(6);
  await page.locator('.case-card').filter({ hasText: 'FoxRAG' }).click();
  await expect(page).toHaveURL(/#\/work\/foxrag$/);
  await expect(page.getByText('Prototype Design and Development', { exact: false })).toBeVisible();
  await expect(page.getByText('neither the web version nor the LINE Bot was officially launched', { exact: false })).toBeVisible();
  await expect(page.locator('.project-facts')).toContainText('Fall 2025');
  await expect(page.locator('.case-media .gallery-item')).toHaveCount(1);
  await expect(page.locator('.case-media .media-status')).toHaveText('Video / demo link to be added');
  await page.getByRole('dialog').getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(page.locator('.project-facts')).toContainText('114 學年度上學期');
  await page.reload();
  await expect(page.locator('#panel-title')).toHaveText('陽明交大竹狐小幫手.');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  await page.locator('.breadcrumb').click();
  await expect(page.locator('#panel-title')).toHaveText('互動開發.');
  await page.goBack();
  await expect(page.locator('#panel-title')).toHaveText('陽明交大竹狐小幫手.');
  await page.evaluate(() => { location.hash = '/projects/xr-lab'; });
  await expect(page.locator('.case-card')).toHaveCount(7);
  await page.locator('.case-card').filter({ hasText: 'VR 臉部表情與眼動分析' }).click();
  await expect(page).toHaveURL(/#\/work\/vr-behavior$/);
  await expect(page.locator('.breadcrumb')).toContainText('使用者研究與分析');
  await expect(page.locator('.project-facts')).toContainText('Python');
  expect(errors).toEqual([]);
});

test('all case routes and profile sections contain real supplied content in both languages', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/projects');
  await expect(page.locator('.case-card')).toHaveCount(3);
  await expect(page.locator('.theme-row')).toHaveCount(6);
  const ids = ['racing-powertrain', 'racing-communication', 'ar-hud', 'whose-inner-voice', 'mediapipe-unity', 'foxrag', 'little-spirit', 'chictrip', 'inside-apart', 'symphony-of-the-soil', 'feather', 'vr-behavior', 'campus-360', 'counseling-chatbot', 'ar-map', 'gym', 'museum-360', 'baseball-analysis'];
  for (const id of ids) {
    await page.evaluate(id => { location.hash = `/work/${id}`; }, id);
    await expect(page).toHaveURL(new RegExp(`/work/${id}$`));
    await expect(page.locator('.project-facts')).toBeVisible();
    await expect(page.locator('.panel-body')).not.toContainText('This bay is empty');
    await expect(page.locator('.case-media')).toContainText('Video / demo link to be added');
  }
  await page.evaluate(() => { location.hash = '/work/little-spirit'; });
  await expect(page.locator('.case-media .gallery-item')).toHaveCount(1);
  await expect(page.locator('.gallery-lead img')).toHaveAttribute('src', /38-little-spirit-input-and-result.svg$/);
  await expect(page.locator('.project-facts')).toContainText('AI-User Interaction');
  await expect(page.locator('.project-facts')).toContainText('Backend development');
  await expect(page.locator('.detail-section').filter({ hasText: 'Integration & deployment' })).toContainText('Deployed the application on Render');
  await page.evaluate(() => { location.hash = '/about'; });
  await expect(page.locator('.current-role')).toContainText('ITRI');
  await expect(page.locator('.skills-grid section')).toHaveCount(5);
  await page.getByRole('dialog').getByRole('button', { name: 'Switch to Chinese' }).click();
  await page.evaluate(() => { location.hash = '/experience'; });
  await expect(page.locator('.timeline>li')).toHaveCount(10);
  await expect(page.locator('.timeline .organization-logo img')).toHaveCount(9);
  await expect.poll(() => page.locator('.timeline .organization-logo img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expectLogosInsideFrames(page);
  await expect(page.locator('.timeline .media-gallery')).toHaveCount(0);
  await expect(page.locator('.timeline')).toContainText('中華民國自行車騎士協會');
  await expect(page.locator('.education-list')).toHaveCount(0);
  await page.getByRole('button', { name: '關閉面板', exact: true }).click();
  await page.getByRole('navigation', { name: '主要導覽' }).getByRole('button', { name: '教育背景', exact: true }).click();
  await expect(page).toHaveURL(/#\/education$/);
  await expect(page.locator('#panel-title')).toHaveText('教育背景.');
  await expect(page.locator('.education-list')).toContainText('傳播研究所碩士班');
  await expect(page.locator('.education-list')).not.toContainText('碩士畢業');
  await page.reload();
  await expect(page.locator('.education-list>article')).toHaveCount(2);
  await expectLogosInsideFrames(page);
  await page.evaluate(() => { location.hash = '/resume'; });
  await expect(page.locator('.award-list>li')).toHaveCount(8);
  const resumeDownload = page.getByRole('link', { name: '下載履歷' });
  await expect(resumeDownload).toHaveAttribute('download', 'ChenShi Liu.pdf');
  const downloadEvent = page.waitForEvent('download');
  await resumeDownload.click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('ChenShi Liu.pdf');
  expect(await download.failure()).toBeNull();
  await expect(page.locator('.award-list>li').filter({ hasText: 'MOD 電影創作大賽' })).toContainText('2019');
  await expect(page.locator('.award-list')).toContainText('團隊獎項');
  await page.evaluate(() => { location.hash = '/contact'; });
  await expect(page.getByRole('link', { name: 'charlie011215@gmail.com' })).toHaveAttribute('href', 'mailto:charlie011215@gmail.com');
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/chenshiliu-lilxii/');
  expect(errors).toEqual([]);
});

test('phone content and long titles fit; desktop and mobile preview screenshots', async ({ browser, page }) => {
  await mkdir('output/preview', { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?debug=1');
  await expect.poll(() => page.evaluate(() => window.__garage?.().loaded), { timeout: 30000 }).toBe(3);
  await page.getByRole('button', { name: 'Switch to Chinese', exact: true }).click();
  await page.screenshot({ path: 'output/preview/content-home.png', fullPage: true });
  await page.getByRole('button', { name: '看作品', exact: true }).click();
  await expect.poll(() => page.locator('.case-card img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: 'output/preview/content-directory.png' });
  await page.evaluate(() => { location.hash = '/work/foxrag'; });
  await expect(page.locator('#panel-title')).toHaveText('陽明交大竹狐小幫手.');
  await page.screenshot({ path: 'output/preview/content-foxrag.png' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const phone = await context.newPage();
  await phone.goto('/#/projects/arcade-02');
  await expect(phone.locator('.case-card')).toHaveCount(4);
  await phone.screenshot({ path: 'output/preview/content-mobile-research.png' });
  await phone.locator('.case-card').filter({ hasText: 'National Taiwan Museum' }).tap();
  await expect(phone.locator('#panel-title')).toContainText('National Taiwan Museum');
  expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.panel-body')!.scrollWidth <= document.querySelector('.panel-body')!.clientWidth)).toBe(true);
  await phone.getByRole('dialog').getByRole('button', { name: 'Switch to Chinese' }).tap();
  await expect(phone.locator('#panel-title')).toHaveText('國立臺灣博物館 360° 線上展覽.');
  await phone.screenshot({ path: 'output/preview/content-mobile-case.png' });
  await phone.evaluate(() => { location.hash = '/experience'; });
  await expect(phone.locator('.timeline')).toContainText('中華民國自行車騎士協會');
  await expectLogosInsideFrames(phone);
  expect(await phone.evaluate(() => document.querySelector('.panel-body')!.scrollWidth <= document.querySelector('.panel-body')!.clientWidth)).toBe(true);
  await phone.screenshot({ path: 'output/preview/experience-logos-mobile.png' });
  await phone.evaluate(() => { location.hash = '/contact'; });
  await expect(phone.getByRole('link', { name: 'charlie011215@gmail.com' })).toBeVisible();
  expect(await phone.evaluate(() => document.querySelector('.panel-body')!.scrollWidth <= document.querySelector('.panel-body')!.clientWidth)).toBe(true);
  await phone.screenshot({ path: 'output/preview/contact-mobile.png' });
  await phone.keyboard.press('Escape');
  await expect(phone.getByRole('dialog')).not.toBeVisible();
  await context.close();
});
