import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', timeout: 60000, expect: { timeout: 10000 },
  fullyParallel: false, workers: 1, reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure', trace: 'off',
  },
  webServer: process.env.TEST_BASE_URL ? undefined : { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 30000 },
});
