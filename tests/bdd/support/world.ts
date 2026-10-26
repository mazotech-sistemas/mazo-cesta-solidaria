import { Browser, chromium } from '@playwright/test';

export class CustomWorld {
  page: any = null;
  browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    const context = await this.browser.newContext();
    this.page = await context.newPage();
  }

  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
  }
}