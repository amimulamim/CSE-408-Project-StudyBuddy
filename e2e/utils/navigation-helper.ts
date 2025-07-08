import { Page, expect } from '@playwright/test';

export class NavigationHelper {
  constructor(private page: Page) {}

  async goToDashboard() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async goToChatbot() {
    await this.page.goto('/chatbot');
    await this.page.waitForLoadState('networkidle');
  }

  async goToBilling() {
    await this.page.goto('/dashboard/billing');
    await this.page.waitForLoadState('networkidle');
  }

  async goToProfile() {
    await this.page.goto('/profile');
    await this.page.waitForLoadState('networkidle');
  }

  async goToContentLibrary() {
    await this.page.goto('/dashboard/content');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateViaMenu(menuItem: string) {
    const menuButton = this.page.getByRole('button', { name: new RegExp(menuItem, 'i') });
    await menuButton.click();
  }

  async navigateViaLink(linkText: string) {
    const link = this.page.getByRole('link', { name: new RegExp(linkText, 'i') });
    await link.click();
  }

  async waitForPageToLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async verifyCurrentPage(expectedUrl: string | RegExp) {
    if (typeof expectedUrl === 'string') {
      expect(this.page.url()).toContain(expectedUrl);
    } else {
      expect(this.page.url()).toMatch(expectedUrl);
    }
  }
}

export default NavigationHelper;
