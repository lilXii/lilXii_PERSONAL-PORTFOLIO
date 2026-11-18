import { build } from 'vite';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

await build();
await build({ base: '/garage-test/', build: { outDir: 'dist-subpath' } });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const subpath = url.pathname.startsWith('/garage-test/');
  const root = resolve(subpath ? 'dist-subpath' : 'dist');
  const path = url.pathname.slice(subpath ? '/garage-test/'.length : 1) || 'index.html';
  const file = resolve(root, decodeURIComponent(path));
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try { const bytes = await readFile(file); response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); response.end(bytes); }
  catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(4274, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const prefix of ['', '/garage-test']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const failures = []; const models = []; const errors = [];
    page.on('response', response => {
      if (response.status() >= 400) failures.push(response.url());
      if (response.url().endsWith('.glb') && response.ok()) models.push(response.url());
    });
    page.on('pageerror', error => errors.push(error.message));
    const start = performance.now();
    await page.goto(`http://127.0.0.1:4274${prefix}/?debug=1#/photography`);
    await page.waitForFunction(() => window.__garage?.().loaded === 3);
    const loadMs = Math.round(performance.now() - start);
    await page.getByRole('heading', { name: 'Video & Live Production.' }).waitFor();
    await page.evaluate(() => { location.hash = '/work/little-spirit'; });
    await page.getByRole('heading', { name: 'Little Spirit.' }).waitFor();
    await page.locator('.gallery-lead').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const image = document.querySelector('.gallery-lead img');
      return image?.complete && image.naturalWidth > 0;
    });
    assert((await page.locator('.gallery-lead img').getAttribute('src')).startsWith(prefix ? `${prefix}/images/` : './images/'), 'Project image uses the wrong base path');
    await page.reload();
    await page.getByRole('heading', { name: 'Little Spirit.' }).waitFor();
    await page.waitForFunction(() => window.__garage?.().loaded === 3);
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.waitForFunction(() => !window.__garage?.().transitioning);
    assert.equal(failures.length, 0, `Failed resources: ${failures}`); assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(models.length, 6); assert(models.every(url => url.includes(`${prefix}/models/`)));
    const resumeResponse = await fetch('http://127.0.0.1:4274' + prefix + '/documents/chenshi-liu-resume.pdf');
    assert(resumeResponse.ok && resumeResponse.headers.get('content-type') === 'application/pdf');
    assert(Buffer.from(await resumeResponse.arrayBuffer()).subarray(0, 5).equals(Buffer.from('%PDF-')));
    const aerialResponse = await fetch('http://127.0.0.1:4274' + prefix + '/images/video/aerial-basketball-opening.gif');
    assert(aerialResponse.ok && aerialResponse.headers.get('content-type') === 'image/gif');
    const diagnostics = await page.evaluate(() => window.__garage());
    const graphics = await page.evaluate(() => {
      const context = document.querySelector('canvas').getContext('webgl2');
      const info = context.getExtension('WEBGL_debug_renderer_info');
      return { browser: navigator.userAgent, renderer: info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable', dpr: devicePixelRatio };
    });
    results.push({ path: prefix || '/', loadMs, diagnostics, graphics, failedResources: failures.length, javascriptErrors: errors.length });
    await page.close();
  }
  const files = await readdir('dist', { recursive: true });
  assert(!files.some(file => /resume-source|references|car-.-reference/.test(file)), 'Private source leaked into build');
  const publishedPdfs = files.map(file => file.replaceAll('\\', '/')).filter(file => /\.pdf$/i.test(file));
  assert.deepEqual(publishedPdfs, ['documents/chenshi-liu-resume.pdf'], 'Only the explicitly approved résumé PDF may be published');
  const media = JSON.parse(await readFile('src/data/media-assets.json', 'utf8'));
  const expectedImages = Object.values(media).flatMap(image => [image.src, image.thumbnail]);
  const publishedImages = files.map(file => file.replaceAll('\\', '/')).filter(file => /^images\/portfolio\/.*\.(webp|svg)$/.test(file));
  assert.deepEqual(publishedImages.sort(), expectedImages.sort(), 'Published assets must match the current media list without removed screenshots');
  let bytes = 0; for (const file of files) { const info = await stat(resolve('dist', file)); if (info.isFile()) bytes += info.size; }
  await mkdir('tmp', { recursive: true });
  await writeFile('tmp/production-validation.json', JSON.stringify({ results, buildBytes: bytes, buildFiles: files }, null, 2));
  console.log(JSON.stringify({ results, buildBytes: bytes }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
