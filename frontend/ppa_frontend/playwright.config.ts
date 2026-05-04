import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const frontendPort = Number(process.env.PPA_E2E_FRONTEND_PORT || 8000);
const backendPort = Number(process.env.PPA_E2E_BACKEND_PORT || 3101);
const frontendBaseURL = `http://127.0.0.1:${frontendPort}`;
const backendBaseURL = `http://127.0.0.1:${backendPort}`;
const e2eDbPath =
  process.env.PPA_E2E_DB_PATH || path.resolve(__dirname, '.tmp/ppa-e2e.db');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: frontendBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command:
        'node tests/e2e/support/prepareE2eDatabase.js && node ../../server/index.js',
      cwd: __dirname,
      url: `${backendBaseURL}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'e2e',
        PORT: String(backendPort),
        DB_PATH: e2eDbPath,
        AI_LOG_ENABLED: 'false',
        EXPORT_LOG_ENABLED: 'false',
      },
    },
    {
      command: 'yarn dev',
      cwd: __dirname,
      url: frontendBaseURL,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        API_PROXY_TARGET: backendBaseURL,
        BROWSER: 'none',
        PORT: String(frontendPort),
      },
    },
  ],
});
