import { Page, expect } from '@playwright/test';
import { TEST_CONFIG } from '../config/test-config';

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
