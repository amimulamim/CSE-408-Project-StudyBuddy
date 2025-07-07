import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend .env.test
dotenv.config({ path: path.resolve(__dirname, '../backend/.env.test') });

/**
 * Docker-specific Playwright configuration
 * This config is optimized for running e2e tests in Docker containers
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false, // Disable parallel execution in Docker for stability
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 2,
  /* Opt out of parallel tests in Docker */
  workers: 1,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://frontend:80', // Docker service name
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Set timeout for actions */
    actionTimeout: 30000,
    
    /* Set timeout for navigations */
    navigationTimeout: 60000,
  },

  /* Configure projects for Docker testing - focus on Chromium for reliability */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      },
    },
  ],

  /* Global timeout for the entire test suite */
  globalTimeout: 30 * 60 * 1000, // 30 minutes

  /* Timeout for each test */
  timeout: 5 * 60 * 1000, // 5 minutes per test
});
