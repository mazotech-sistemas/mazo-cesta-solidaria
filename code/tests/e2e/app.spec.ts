import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('deve redirecionar para login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'errado@email.com');
    await page.fill('input[type="password"]', 'senhaerrada');
    await page.click('button[type="submit"]');
    await expect(page.locator('.badge-error')).toBeVisible();
  });
});

test.describe('Página de Suporte', () => {
  test('deve ser acessível sem autenticação', async ({ page }) => {
    await page.goto('/suporte');
    await expect(page).toHaveURL(/.*suporte/);
  });

  test('deve ter FAQ funcionando', async ({ page }) => {
    await page.goto('/suporte');
    const faqItems = page.locator('details');
    const count = await faqItems.count();
    expect(count).toBeGreaterThan(0);
    if (count > 0) {
      await faqItems.first().click();
      await expect(faqItems.first().locator('summary')).toBeVisible();
    }
  });
});

test.describe('Acessibilidade Básica', () => {
  test('login page deve ter labels corretos', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
  });

  test('dashboard redireciona para login sem sessão', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('estoque redireciona para login sem sessão', async ({ page }) => {
    await page.goto('/estoque');
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Simulador redireciona sem sessão', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/simulador');
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Histórico redireciona sem sessão', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/historico');
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Configurações redireciona sem sessão', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/configuracoes');
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Usuários redireciona sem sessão', () => {
  test('deve redirecionar para login', async ({ page }) => {
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/.*login/);
  });
});