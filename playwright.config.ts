import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 100_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: { baseURL: 'http://localhost:5173', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI },
});
