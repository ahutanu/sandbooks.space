import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 5,
  reporter: [
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Use bundled Chromium instead of system Chrome to avoid extra tabs
    launchOptions: {
      // Prevent Playwright from opening extra blank pages
      args: ['--disable-popup-blocking', '--no-first-run', '--no-default-browser-check'],
    },
  },

  webServer: {
    command: 'ENABLE_LOCAL_TERMINAL=true npm start',
    port: 5173,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Ensure consistent browser behavior
        contextOptions: {
          // Each test gets a fresh context, no shared state
          ignoreHTTPSErrors: true,
        },
      },
    },
  ],

  // Note: Start servers manually before running tests:
  //   Terminal 1: cd backend && npm run dev
  //   Terminal 2: npm run dev
  //   Terminal 3: npm test
});
