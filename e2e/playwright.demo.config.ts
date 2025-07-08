import { defineConfig, devices } from '@playwright/test';

/**
 * Demo configuration for Playwright tests
 * Optimized for presentations and demos to non-technical audiences
 * Features:
 * - Slower execution for better visibility
 * - Single worker for sequential test execution
 * - Larger browser window
 * - Visible browser with devtools
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Single worker for demo - tests run one at a time */
  workers: 1,
  /* Reporter for demo mode */
  reporter: [
    ['list'], // Shows test progress in terminal
    ['html', { outputFolder: 'playwright-report-demo' }]
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video for demo purposes */
    video: 'retain-on-failure',
    
    /* Slower actions for better visibility */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-demo',
      use: { 
        ...devices['Desktop Chrome'],
        // Larger viewport for better demo visibility
        viewport: { width: 1920, height: 1080 },
        // Slower actions for demo
        actionTimeout: 8000, // Reduced from 5000 for better loading state detection
        // Show browser for demo
        headless: false,
        // Slow down for better visibility
        launchOptions: {
          slowMo: 800, // Reduced from 1000ms for better loading state detection
          devtools: false, // Keep devtools closed for cleaner demo
          args: [
            '--start-maximized',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'echo "Make sure frontend and backend are running on localhost:3000 and localhost:8000"',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
