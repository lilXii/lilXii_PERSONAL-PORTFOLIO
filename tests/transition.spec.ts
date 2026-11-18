import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const [device, viewport] of [
  ['desktop', { width: 914, height: 883 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`entrance stays continuous across facade fade and orbit handoff on ${device}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, isMobile: device === 'mobile', hasTouch: device === 'mobile' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const epoch = new Date('2026-11-18T00:00:00Z');
    await page.clock.install({ time: epoch });
    await page.goto('/?debug=1');
    await expect.poll(() => page.evaluate(() => window.__garage?.().loaded), { timeout: 30000 }).toBe(3);
    // Let React's lazy import/Suspense timers finish before freezing time.
    // Leave room for the DevTools round trip on a busy machine; 30ms can already
    // be in the past by the time pauseAt reaches Chrome.
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    const startElapsed = await page.evaluate(() => window.__garage!().entrance.elapsed!);
    expect(startElapsed).toBeLessThan(2000);
    // Sample every rendered frame, including the CSS/React change after intro.
    await page.evaluate(() => {
      const samples: unknown[] = [];
      (window as unknown as { transitionSamples: unknown[] }).transitionSamples = samples;
      const sample = () => {
        const state = window.__garage!();
        const host = document.querySelector('.scene-canvas')!;
        const rect = host.getBoundingClientRect();
        const canvas = host.querySelector('canvas')!;
        samples.push({ time: performance.now(), intro: state.intro, camera: state.camera,
          box: [rect.x, rect.y, rect.width, rect.height, canvas.width, canvas.height],
          background: getComputedStyle(host).backgroundColor, quality: state.quality,
          surfaces: state.entrance.surfaces });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await mkdir('output/preview', { recursive: true });
    // Clock stepping freezes the actual rendered frame while screenshots are saved.
    for (const [delta, label] of [[2200, 'fade-start'], [240, 'fade-before-hide'], [32, 'fade-after-hide'],
      [1180, 'before-orbit'], [80, 'after-orbit'], [320, 'free-view']] as const) {
      await page.clock.runFor(label === 'fade-start' ? delta - startElapsed : delta);
      await page.screenshot({ path: `output/preview/transition-${device}-${label}.png` });
    }
    const samples = await page.evaluate(() => (window as unknown as { transitionSamples: {
      time: number; intro: boolean; camera: number[]; box: number[]; background: string; quality: string;
      surfaces: { opacity: number; depthWrite: boolean; castShadow: boolean }[];
    }[] }).transitionSamples);
    expect(samples.length).toBeGreaterThan(100);
    expect(samples.some(sample => sample.intro)).toBe(true);
    expect(samples.at(-1)!.intro).toBe(false);
    // No canvas reset, reposition, background switch or quality swap at either boundary.
    expect(new Set(samples.map(sample => JSON.stringify(sample.box))).size).toBe(1);
    expect(new Set(samples.map(sample => sample.background)).size).toBe(1);
    expect(new Set(samples.map(sample => sample.quality)).size).toBe(1);
    const fading = samples.filter(sample => sample.surfaces[0].opacity > 0 && sample.surfaces[0].opacity < 1);
    expect(fading.length).toBeGreaterThan(5);
    for (const sample of fading) {
      expect(sample.surfaces.every(surface => !surface.depthWrite && !surface.castShadow)).toBe(true);
      expect(new Set(sample.surfaces.map(surface => surface.opacity)).size).toBe(1);
    }
    const handoff = samples.findIndex((sample, index) => index > 0 && !sample.intro && samples[index - 1].intro);
    expect(handoff).toBeGreaterThan(0);
    expect(Math.hypot(...samples[handoff].camera.map((value, axis) => value - samples[handoff - 1].camera[axis]))).toBeLessThan(0.05);
    const resting = samples.slice(handoff + 2);
    for (const sample of resting) expect(Math.hypot(...sample.camera.map((value, axis) => value - resting[0].camera[axis]))).toBeLessThan(0.000001);
    // Control really resumes; the first drag must move the camera without opening a panel.
    const box = await page.getByTestId('scene').boundingBox();
    const before = await page.evaluate(() => window.__garage!().camera);
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.82);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 65, box!.y + box!.height * 0.82, { steps: 8 });
    await page.mouse.up();
    await page.clock.runFor(200);
    expect(await page.evaluate(() => window.__garage!().camera)).not.toEqual(before);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });
}
