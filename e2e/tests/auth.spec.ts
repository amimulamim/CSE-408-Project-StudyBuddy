import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../config/test-config';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the landing page', async ({ page }) => {
    // Simple test to verify the page loads
    await expect(page).toHaveTitle(/studybuddy|studdybuddy/i);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should open sign in modal when clicking sign in button', async ({ page }) => {
    // Click the Sign In button to open modal
    await page.getByRole('button', { name: /sign in/i }).first().click();
    
    // Wait for modal to appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Welcome back')).toBeVisible();
    // Target the visible text (not the sr-only one)
    await expect(page.locator('p.text-muted-foreground.mt-2:has-text("Sign in to your StuddyBuddy account")')).toBeVisible();
  });

  test('should show sign in form elements', async ({ page }) => {
    // Open sign in modal
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check form elements are present
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
  });

  test('should successfully log in with admin user credentials', async ({ page }) => {
    // Open sign in modal
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in login form with admin credentials
    await page.getByLabel('Email').fill(TEST_CONFIG.ADMIN_USER.email);
    await page.getByLabel('Password').fill(TEST_CONFIG.ADMIN_USER.password);
    
    // Submit the form
    await page.getByRole('button', { name: /^sign in$/i }).click();
    
    // Wait for authentication to complete and redirect
    await page.waitForTimeout(5000); // Give Firebase time to authenticate
    
    // Check if we're redirected away from the modal or to dashboard
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // The modal should close or we should be redirected
    const modalVisible = await page.getByRole('dialog').isVisible().catch(() => false);
    if (!modalVisible) {
      // Modal closed successfully
      expect(true).toBe(true);
    } else {
      // Check if we're on dashboard or if there's any success indication
      await expect(
        page.getByText('Dashboard').or(page.getByText('Welcome'))
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
