import { Before, After, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, chromium } from '@playwright/test';

let browser: Browser | null = null;
const BASE_URL = 'http://localhost:3000';

class CustomWorld {
  page: any = null;
  browser: Browser | null = null;

  async init() {
    if (!browser) {
      browser = await chromium.launch({ headless: true });
    }
    this.browser = browser;
    const context = await browser.newContext({ baseURL: BASE_URL });
    this.page = await context.newPage();
  }

  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
  }
}

setWorldConstructor(CustomWorld);

Before(async function () {
  await this.init();
});

After(async function () {
  await this.cleanup();
});