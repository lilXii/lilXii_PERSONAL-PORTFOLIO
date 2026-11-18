import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function ready(page: Page, path = '/?debug=1') {
  await page.goto(path);
  await expect.poll(() => page.evaluate(() => window.__garage?.().loaded), { timeout: 30000 }).toBe(3);
  // Let the finite intro finish; checking visibility and then clicking races its removal.
  await expect.poll(() => page.evaluate(() => window.__garage?.().transitioning)).toBe(false);
}

test('desktop: all three GLBs render, object picking and returning do not replay intro', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const models: string[] = [];
  page.on('response', response => { if (response.url().endsWith('.glb') && response.ok()) models.push(response.url()); });
  await ready(page);
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(models).toHaveLength(3);
  await mkdir('tmp/screenshots', { recursive: true });
  await page.screenshot({ path: 'tmp/screenshots/desktop.png', fullPage: true });
  const box = await page.getByTestId('scene').boundingBox();
  const objects = await page.evaluate(() => window.__garage!().objectScreens);
  for (const target of objects) {
    const current = await page.evaluate(id => window.__garage!().objectScreens.find(item => item.id === id)!, target.id);
    await page.mouse.click(box!.x + current.x, box!.y + current.y);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(target.id));
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__garage!().transitioning)).toBe(false);
    expect(await page.evaluate(() => window.__garage!().intro)).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('direct routes, persistent language, history, unknown routes and keyboard focus', async ({ page }) => {
  await ready(page, '/?debug=1#/projects/arcade-01');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#panel-title')).toHaveText('Interactive Development.');
  await page.getByRole('dialog').getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(page).toHaveURL(/projects\/arcade-01/);
  await expect(page.locator('#panel-title')).toHaveText('互動開發.');
  await page.reload();
  await expect(page.locator('#panel-title')).toHaveText('互動開發.');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: '看作品', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '看作品', exact: true })).toBeFocused();
  await page.goBack();
  await expect(page.locator('#panel-title')).toHaveText('作品.');
  await page.goto('/#/projects/unknown');
  await expect(page.locator('#panel-title')).toHaveText('找不到這個展示區.');
  await page.getByRole('button', { name: '瀏覽作品', exact: true }).click();
  await expect(page.locator('#panel-title')).toHaveText('作品.');
});

test('rapid route changes settle on the last selection, orbit and transitions stay outside models', async ({ page }) => {
  await ready(page);
  const scene = await page.getByTestId('scene').boundingBox();
  for (const [dx, dy] of [[500, 0], [-800, 100], [500, -400], [800, 900]]) {
    await page.mouse.move(scene!.x + scene!.width / 2, scene!.y + scene!.height / 2);
    await page.mouse.down(); await page.mouse.move(scene!.x + scene!.width / 2 + dx, scene!.y + scene!.height / 2 + dy, { steps: 20 }); await page.mouse.up();
    await page.mouse.wheel(0, -4000);
    const state = await page.evaluate(() => window.__garage!());
    expect(state.collision).toBe(false); expect(state.distance).toBeGreaterThanOrEqual(11.49);
    expect(state.polar).toBeGreaterThanOrEqual(Math.PI * 0.18 - 0.01);
    expect(state.polar).toBeLessThanOrEqual(Math.PI * 0.40 + 0.01);
  }
  const samples = await page.evaluate(async () => {
    const collisions = [];
    for (const hash of ['/cars/car-a', '/projects/arcade-02', '/cars/car-b', '/projects/xr-lab']) {
      location.hash = hash;
      for (let i = 0; i < 6; i++) { await new Promise(resolve => setTimeout(resolve, 25)); collisions.push(window.__garage!().collision); }
    }
    return collisions;
  });
  expect(samples.some(Boolean)).toBe(false);
  await expect(page.locator('#panel-title')).toHaveText('XR Experiences.');
  await expect.poll(() => page.evaluate(() => window.__garage!().selected)).toBe('xr-lab');
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__garage!().transitioning)).toBe(false);
  expect(await page.evaluate(() => window.__garage!().collision)).toBe(false);
});

test('mobile retains 3D, touch gestures, navigation and readable panels without overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await ready(page);
  expect(await page.evaluate(() => window.__garage!().quality)).toBe('low');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/screenshots/mobile.png', fullPage: true });
  const scene = await page.getByTestId('scene').boundingBox();
  const session = await context.newCDPSession(page);
  const initial = await page.evaluate(() => window.__garage!().camera);
  // Orbit on the clear floor and verify gestures do not accidentally open a project.
  const gestureY = scene!.y + scene!.height * 0.78;
  expect(await page.evaluate(y => document.elementFromPoint(150, y)?.tagName, gestureY)).toBe('CANVAS');
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: gestureY, id: 0 }] });
  for (let i = 0; i < 10; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150 + i * 10, y: gestureY, id: 0 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => window.__garage!().camera)).not.toEqual(initial);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const distance = await page.evaluate(() => window.__garage!().distance);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 145, y: gestureY, id: 0 }, { x: 245, y: gestureY, id: 1 }] });
  for (let i = 1; i <= 5; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 145 - i * 8, y: gestureY, id: 0 }, { x: 245 + i * 8, y: gestureY, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => window.__garage!().distance)).toBeLessThan(distance);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Toggle navigation' }).tap();
  await page.getByRole('navigation').getByRole('button', { name: 'Work', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /03.*Interactive Development/ }).tap();
  await expect(page.locator('#panel-title')).toHaveText('Interactive Development.');
  expect(await page.evaluate(() => document.querySelector('dialog')!.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/screenshots/mobile-panel.png', fullPage: true });
  await context.close();
});

test('reduced motion bypasses entrance and camera animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await expect(page.getByRole('button', { name: 'Skip intro', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: /01.*FORMULA STUDENT.*Team & Projects/ }).click();
  await expect(page.locator('#panel-title')).toHaveText('Racing & Project Management.');
  await expect.poll(() => page.evaluate(() => window.__garage!().transitioning)).toBe(false);
});

test('failed GLB loading is recoverable and content stays available', async ({ page }) => {
  await page.route('**/*.glb', route => route.abort());
  await page.goto('/?debug=1');
  await expect(page.getByText('The garage needs a moment.')).toBeVisible();
  await page.getByRole('button', { name: 'View projects', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.unroute('**/*.glb');
  await page.getByRole('button', { name: 'Reload 3D', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__garage?.().loaded), { timeout: 30000 }).toBe(3);
});

test('WebGL unavailable keeps HTML browsing usable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return original.call(this, type as '2d', ...args as []);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.getByText('The garage needs a moment.')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Résumé' }).click();
  await expect(page.getByRole('link', { name: 'Download résumé' })).toHaveAttribute('download', 'ChenShi Liu.pdf');
});

test('skip works while models load and sound remains opt-in', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*.glb', async route => { await gate; await route.continue(); });
  await page.goto('/?debug=1');
  await page.getByRole('button', { name: 'Skip intro', exact: true }).click();
  release();
  await expect.poll(() => page.evaluate(() => window.__garage?.().loaded), { timeout: 30000 }).toBe(3);
  expect(await page.evaluate(() => window.__garage!().intro)).toBe(false);
  const sound = page.getByRole('button', { name: 'Enable sound', exact: true });
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(page.getByRole('button', { name: 'Mute sound', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('WebGL context loss recovers with a fresh renderer', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const context = document.querySelector('canvas')!.getContext('webgl2')!;
    context.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.getByText('The garage needs a moment.')).toBeVisible();
  await page.getByRole('button', { name: 'Reload 3D', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__garage?.().loaded), { timeout: 30000 }).toBe(3);
});

test('blocked localStorage does not break language switching', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } }); });
  await page.goto('/#/contact');
  await expect(page.locator('#panel-title')).toHaveText('Contact.');
  await page.getByRole('dialog').getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(page.locator('#panel-title')).toHaveText('聯絡.');
});
