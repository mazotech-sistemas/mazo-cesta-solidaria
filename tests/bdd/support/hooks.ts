import { Before, After, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, chromium } from '@playwright/test';
import type { CestaWorld } from '../world';

let browser: Browser | null = null;
// Roda contra a porta local em dev; em CI, aponta para a produção ou um dev
// server subido antes. Nunca hard-codeado aqui: vem do ambiente.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

class CestaWorldImpl implements CestaWorld {
  page: Page = null as unknown as Page;
  context: BrowserContext = null as unknown as BrowserContext;
  dados: Record<string, unknown> = {};

  async init() {
    if (!browser) {
      browser = await chromium.launch({ headless: true });
    }
    this.context = await browser!.newContext({ baseURL: BASE_URL });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
    }
  }
}

setWorldConstructor(CestaWorldImpl);

Before(async function () {
  await this.init();
});

After(async function () {
  await this.cleanup();
});

// Encerra o navegador uma única vez no fim da suíte
process.on('exit', async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
});