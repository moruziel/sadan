// SADAN E2E — Playwright config.
// Default target: LOCAL full stack (Playwright starts backend+frontend itself) —
// immune to the corporate network, tests the exact same code.
// Remote run (pre-rehearsal, from an open network): BASE_URL=https://sadan-demo.duckdns.org
const { defineConfig } = require('@playwright/test')
const path = require('path')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const IS_REMOTE = BASE_URL.includes('duckdns')
const ROOT = path.resolve(__dirname, '../..')

module.exports = defineConfig({
  testDir: './specs',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1, // wall bus is shared state — run specs serially
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
  ],
  // Local target: Playwright boots the full stack itself (reuses if already up)
  webServer: IS_REMOTE ? undefined : [
    {
      command: 'python -m uvicorn backend.main:app --port 8000',
      cwd: ROOT,
      url: 'http://localhost:8000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --port 5173',
      cwd: path.join(ROOT, 'frontend'),
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  use: {
    baseURL: BASE_URL,
    // Intel-managed machines intercept TLS (corporate MITM) — Chromium then
    // rejects the resigned cert. Tests-only bypass.
    ignoreHTTPSErrors: true,
    httpCredentials: IS_REMOTE ? { username: 'mor', password: '0528942575' } : undefined,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
})
