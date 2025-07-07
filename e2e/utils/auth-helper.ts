import { Page, expect } from '@playwright/test';
import { TEST_CONFIG } from '../config/test-config';
import path from 'path';

export class AuthHelper {
  constructor(private page: Page) {}

  async goToLandingPage() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async openSignInModal() {
    await this.page.getByRole('button', { name: /sign in/i }).first().click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async loginAsAdmin() {
    await this.openSignInModal();
    await this.page.getByLabel('Email').fill(TEST_CONFIG.ADMIN_USER.email);
    await this.page.getByLabel('Password').fill(TEST_CONFIG.ADMIN_USER.password);
    await this.page.getByRole('button', { name: /^sign in$/i }).click();
    await this.page.waitForTimeout(5000); // Wait for authentication
  }

  async loginAsRegularUser() {
    await this.openSignInModal();
    await this.page.getByLabel('Email').fill(TEST_CONFIG.REGULAR_USER.email);
    await this.page.getByLabel('Password').fill(TEST_CONFIG.REGULAR_USER.password);
    await this.page.getByRole('button', { name: /^sign in$/i }).click();
    await this.page.waitForTimeout(5000); // Wait for authentication
  }

  // New method for persistent login
  async loginAndSaveState(userType: 'admin' | 'regular' = 'regular'): Promise<string> {
    await this.goToLandingPage();
    
    if (userType === 'admin') {
      await this.loginAsAdmin();
    } else {
      await this.loginAsRegularUser();
    }

    // Wait for login to complete
    await this.waitForAuthentication();
    
    // Save authentication state
    const storageStatePath = path.join(__dirname, `../auth-states/${userType}-auth.json`);
    await this.page.context().storageState({ path: storageStatePath });
    
    return storageStatePath;
  }

  // New method to wait for authentication completion
  async waitForAuthentication() {
    try {
      // Wait for modal to disappear
      await this.page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    } catch {
      // If modal check fails, check for dashboard/profile indicators
      await expect(
        this.page.getByText('Dashboard').or(this.page.getByText('Profile')).or(this.page.getByText('Welcome'))
      ).toBeVisible({ timeout: 10000 });
    }
  }

  async logout() {
    // Check if user menu exists and click logout
    const userMenu = this.page.locator('[data-testid="user-menu"], .user-menu, [aria-label*="user"], [aria-label*="account"]').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      const logoutButton = this.page.getByRole('button', { name: /logout|sign out/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
    }
  }

  async isLoggedIn(): Promise<boolean> {
    // Check for indicators that user is logged in
    const indicators = [
      this.page.locator('[data-testid="user-menu"]'),
      this.page.locator('.user-menu'),
      this.page.getByText('Dashboard'),
      this.page.getByText('Profile')
    ];

    for (const indicator of indicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return true;
      }
    }

    return false;
  }
}

export default AuthHelper;
