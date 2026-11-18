import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('closed entrance hides the room from the first frame, then reveals larger clickable exhibits', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*.glb', async route => { await gate; await route.continue(); });
  await page.goto('/?debug=1');
  await expect.poll(() => page.evaluate(() => window.__garage?.().entrance.visible), { timeout: 30000 }).toBe(true);
  const initial = await page.evaluate(() => window.__garage!());
  expect(initial.camera[0]).toBe(0);
  expect(initial.camera[1]).toBe(2.25);
  expect(initial.entrance.doorHeight).toBe(0);
  expect(initial.entrance.occluded.length).toBe(3);
  expect(initial.entrance.occluded.every(object => object.blocked)).toBe(true);
  await expect(page.getByRole('button', { name: 'Open Arcade 01', exact: true })).not.toBeVisible();
  await mkdir('output/preview', { recursive: true });
  await page.screenshot({ path: 'output/preview/entrance-closed.png' });
  release();
  await expect.poll(() => page.evaluate(() => window.__garage?.().loaded), { timeout: 30000 }).toBe(3);
  const openingSamples = await page.evaluate(async () => {
    const samples = [];
    while (window.__garage!().intro) {
      const state = window.__garage!();
      samples.push({ height: state.entrance.doorHeight, camera: state.camera, collision: state.collision });
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    return samples;
  });
  expect(openingSamples.some(sample => sample.height > 0 && sample.height < 4.79)).toBe(true);
  for (const sample of openingSamples.filter(sample => sample.height < 4.79)) {
    expect(sample.camera[0]).toBe(0); expect(sample.camera[1]).toBe(2.25);
  }
  expect(openingSamples.some(sample => sample.collision)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__garage?.().intro)).toBe(false);
  await expect(page.locator('.scene-label, .object-tooltip')).toHaveCount(0);
  await page.setViewportSize({ width: 914, height: 883 });
  await expect(page.locator('#hero-title')).toHaveText('AI · XR& UX.');
  await page.screenshot({ path: 'output/preview/desktop-hover-idle-en.png', fullPage: true });
  const scene = (await page.getByTestId('scene').boundingBox())!;
  const objects = await page.evaluate(() => window.__garage!().objectScreens);
  for (const object of objects) {
    await page.mouse.move(scene.x + object.x, scene.y + object.y);
    await expect(page.locator('.object-tooltip')).toHaveAttribute('data-object', object.id);
    await expect(page.locator('.object-tooltip')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.mouse.move(10, 10);
    await expect(page.locator('.object-tooltip')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Switch to Chinese', exact: true }).click();
  await expect(page.locator('#hero-title')).toHaveText('AI · XR& UX.');
  await page.screenshot({ path: 'output/preview/desktop-hover-idle-zh.png', fullPage: true });
  const arcade = objects.find(object => object.id === 'arcade-01')!;
  await page.mouse.move(scene.x + arcade.x, scene.y + arcade.y);
  await expect(page.locator('.object-tooltip')).toContainText('互動開發');
  await page.screenshot({ path: 'output/preview/desktop-hover-active.png', fullPage: true });
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await page.mouse.click(scene.x + arcade.x, scene.y + arcade.y);
  await expect(page.locator('#panel-title')).toHaveText('Interactive Development.');
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__garage?.().transitioning)).toBe(false);
  expect(await page.evaluate(() => window.__garage!().entrance.visible)).toBe(false);
  // The ordinary object directory remains a keyboard entry point without floating buttons.
  const keyboardEntry = page.locator('.object-index').getByRole('button', { name: /04.*User Research/ });
  await keyboardEntry.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#panel-title')).toHaveText('User Research & Analysis.');
  await page.keyboard.press('Escape');
  await expect(keyboardEntry).toBeFocused();
});

test('phone entrance hides the room and exhibits open by direct touch without hover labels', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*.glb', async route => { await gate; await route.continue(); });
  await page.goto('/?debug=1');
  await expect.poll(() => page.evaluate(() => window.__garage?.().entrance.visible), { timeout: 30000 }).toBe(true);
  await expect(page.getByRole('button', { name: 'Skip intro', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => window.__garage!().entrance.occluded.every(object => object.blocked))).toBe(true);
  await page.screenshot({ path: 'output/preview/entrance-mobile.png' });
  release();
  await expect.poll(() => page.evaluate(() => window.__garage?.().intro)).toBe(false);
  await expect(page.locator('.scene-label, .object-tooltip')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/preview/mobile-hover-revised.png', fullPage: true });
  const scene = (await page.getByTestId('scene').boundingBox())!;
  const xr = await page.evaluate(() => window.__garage!().objectScreens.find(object => object.id === 'xr-lab')!);
  await page.touchscreen.tap(scene.x + xr.x, scene.y + xr.y);
  await expect(page.locator('#panel-title')).toHaveText('XR Experiences.');
  await expect(page.locator('.object-tooltip')).toHaveCount(0);
  await context.close();
});
