import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('all 30 published images are reachable in their project, profile and experience locations', async ({ page, request }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/projects');
  const routes = ['racing-powertrain', 'racing-communication', 'ar-hud', 'whose-inner-voice', 'mediapipe-unity', 'foxrag', 'little-spirit', 'chictrip', 'inside-apart', 'symphony-of-the-soil', 'feather', 'vr-behavior', 'campus-360', 'counseling-chatbot', 'ar-map', 'gym', 'museum-360', 'baseball-analysis'];
  const sources = new Set<string>();
  async function collect() {
    for (const src of await page.locator('.panel-body img').evaluateAll(images => images.map(image => image.getAttribute('src')!))) sources.add(src);
  }
  for (const id of routes) {
    await page.evaluate(id => { location.hash = `/work/${id}`; }, id);
    await expect(page.locator('.case-media .gallery-lead')).toBeVisible();
    await expect(page.locator('.case-media')).not.toContainText('Project images to be added');
    if (id === 'counseling-chatbot') {
      await expect(page.locator('.gallery-lead img')).toHaveAttribute('src', /22-counseling-paper-email-redacted.webp$/);
      await expect(page.locator('.gallery-lead .media-note')).toHaveText('AI-edited · Emails removed');
    }
    await collect();
  }
  for (const route of ['/about', '/experience', '/education', '/projects/arcade-01', '/projects/arcade-02']) {
    await page.evaluate(route => { location.hash = route; }, route);
    await expect(page.locator('#panel-title')).toBeVisible();
    if (route === '/about') await expect(page.locator('.profile-portrait img')).toBeVisible();
    if (route === '/experience') await expect(page.locator('.media-gallery')).toHaveCount(0);
    if (route.includes('arcade-01')) {
      await expect(page.locator('.case-card').filter({ hasText: 'MediaPipe × Unity' })).toHaveCount(1);
      await expect(page.locator('.interaction-prototype')).toHaveCount(0);
    }
    if (route.includes('arcade-02')) await expect(page.locator('.supporting-research [data-media-id="32"]')).toHaveCount(1);
    await collect();
  }
  await page.evaluate(() => { location.hash = '/photography'; });
  await page.getByRole('tab', { name: 'Live broadcasts', exact: true }).click();
  await expect(page.locator('[data-media-id="34"]')).toBeVisible();
  await expect(page.locator('.credit-list details')).toHaveCount(7);
  await page.locator('.credit-list summary').filter({ hasText: 'Badminton' }).click();
  await expect(page.locator('.credit-list details[open] li')).toHaveCount(3);
  await collect();
  const ids = new Set([...sources].map(src => src.match(/\/(\d{2})-[^/]+\.(?:webp|svg)$/)?.[1]).filter(Boolean));
  const expectedIds = Array.from({ length: 38 }, (_, i) => i + 1).filter(id => id < 8 || id > 15).map(id => String(id).padStart(2, '0'));
  expect([...ids].sort()).toEqual(expectedIds);
  for (const src of sources) {
    const response = await request.get(src);
    expect(response.ok(), src).toBe(true);
    expect(response.headers()['content-type']).toContain(src.endsWith('.svg') ? 'image/svg+xml' : 'image/webp');
  }
  expect(errors).toEqual([]);
});

test('gallery opens full images, changes slides and closes without leaving the project', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/work/ar-hud');
  const opener = page.getByRole('button', { name: 'Enlarge image：AUO AR HUD product illustration', exact: true });
  await opener.click();
  const viewer = page.getByRole('dialog', { name: 'Image viewer', exact: true });
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('img')).toHaveAttribute('src', /06-auo-hud-illustration.webp$/);
  await expect.poll(() => viewer.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole('button', { name: 'Close image', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('img')).toHaveAttribute('src', /05-auo-internship.webp$/);
  await viewer.getByRole('button', { name: 'Actual size', exact: true }).click();
  await expect(viewer.locator('.image-viewer-canvas')).toHaveClass(/zoomed/);
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(page.locator('.content-dialog')).toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page).toHaveURL(/#\/work\/ar-hud$/);
  await page.locator('.content-dialog').getByRole('button', { name: 'Switch to Chinese' }).click();
  await page.getByRole('button', { name: '放大圖片：AUO AR HUD 產品示意圖', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '圖片檢視器', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '關閉圖片', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.content-dialog')).not.toBeVisible();
});

test('phone galleries keep full proportions, support enlargement and recover from missing images', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await mkdir('output/preview', { recursive: true });
  await page.goto('/#/work/ar-map');
  await page.getByRole('button', { name: 'Enlarge image：Traces of Fengcheng — China Design Award certificate', exact: true }).tap();
  const viewer = page.getByRole('dialog', { name: 'Image viewer', exact: true });
  await expect.poll(() => viewer.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const geometry = await viewer.locator('img').evaluate((image: HTMLImageElement) => ({ rendered: image.clientWidth / image.clientHeight, natural: image.naturalWidth / image.naturalHeight }));
  expect(Math.abs(geometry.rendered - geometry.natural)).toBeLessThan(.02);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/preview/media-mobile-viewer.png' });
  await viewer.getByRole('button', { name: 'Close image', exact: true }).tap();
  await page.locator('.content-dialog').getByRole('button', { name: 'Switch to Chinese' }).tap();
  await page.evaluate(() => { location.hash = '/work/racing-communication'; });
  await expect(page.locator('.gallery-lead img')).toHaveAttribute('src', /37-racing-international-exchange.webp$/);
  await expect(page.locator('.gallery-lead figcaption')).toContainText('與其他國家的學校交流');
  await page.locator('.gallery-lead').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.gallery-lead img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: 'output/preview/media-mobile-racing.png' });
  await page.getByRole('button', { name: '放大圖片：賽道上的車輛影像拍攝紀錄', exact: true }).tap();
  const replacement = page.getByRole('dialog', { name: '圖片檢視器', exact: true }).locator('img');
  await expect(replacement).toHaveAttribute('src', /19-racing-filming-hq.webp$/);
  await expect.poll(() => replacement.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1800);
  await page.getByRole('button', { name: '關閉圖片', exact: true }).tap();
  expect(await page.locator('.panel-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.evaluate(() => { location.hash = '/work/little-spirit'; });
  await expect(page.locator('.case-media .gallery-item')).toHaveCount(1);
  await page.getByRole('button', { name: '放大圖片：Little Spirit：資料輸入（左）與職涯建議卡片（右）', exact: true }).tap();
  const paired = page.getByRole('dialog', { name: '圖片檢視器', exact: true });
  await expect(paired.locator('img')).toHaveAttribute('src', /38-little-spirit-input-and-result.svg$/);
  await expect.poll(() => paired.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(paired.getByRole('button', { name: '下一張圖片', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'output/preview/little-spirit-combined-mobile.png' });
  await page.getByRole('button', { name: '關閉圖片', exact: true }).tap();
  await page.evaluate(() => { location.hash = '/work/counseling-chatbot'; });
  await expect(page.locator('.gallery-lead .media-note')).toHaveText('AI 處理：已移除 Email');
  await page.locator('.gallery-lead').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.gallery-lead img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: 'output/preview/paper-redaction-mobile.png' });
  await page.locator('.gallery-lead button').tap();
  await expect(page.locator('.image-viewer-bottom .media-note')).toHaveText('AI 處理：已移除 Email');
  await page.getByRole('button', { name: '關閉圖片', exact: true }).tap();
  await page.route('**/07-foxrag-interface.webp', route => route.abort());
  await page.evaluate(() => { location.hash = '/work/foxrag'; });
  await expect(page.locator('.gallery-lead .image-unavailable')).toContainText('圖片暫時無法載入');
  await expect(page.locator('.project-facts')).toContainText('114 學年度上學期');
  await context.close();
});
