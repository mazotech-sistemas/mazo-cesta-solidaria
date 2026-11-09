import type { Page, BrowserContext } from '@playwright/test';

// World da suíte BDD: cada cenário recebe uma instância com `page`
// (e o `context` para limpar cookies entre cenários). Os hooks em
// `support/hooks.ts` criam e destroem estas instâncias.
export interface CestaWorld {
  page: Page;
  context: BrowserContext;
  // Estado livre por cenário (ex.: ids de produto criado pelo teste)
  dados: Record<string, unknown>;
}