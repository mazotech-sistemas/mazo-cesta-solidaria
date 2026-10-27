import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@cestasolidaria.org');
  await page.fill('input[type="password"]', 'senha123');
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/dashboard');
}

test.describe('Estoque - Preco Opcional', () => {
  test('preço não é obrigatório no formulário de novo produto', async ({ page }) => {
    await login(page);
    await page.goto('/estoque');

    // Abrir formulário de novo produto
    await page.click('button:has-text("Novo Produto")');
    await expect(page.locator('text=Novo Produto')).toBeVisible();

    // Verificar que o campo preço NÃO tem required
    const precoInput = page.locator('#prod-preco');
    await expect(precoInput).nottoHaveAttribute('required');

    // Preencher apenas campos obrigatórios (sem preço)
    await page.fill('#prod-nome', 'Arroz Teste 5kg');
    await page.fill('#prod-estoque', '10');
    await page.fill('#prod-qtd', '1');

    // Submit sem preço deve funcionar (ou dar erro de rede, mas não de validação)
    await page.click('button:has-text("Criar Produto")');
    await page.waitForTimeout(2000);

    // Verificar que não há erro de "Preencha preço"
    const erroPreco = await page.locator('.badge-error:has-text("preço")').count();
    expect(erroPreco).toBe(0);
  });
});

test.describe('Estoque - Buscar Token Tenda', () => {
  test('botão de buscar token aparece no formulário', async ({ page }) => {
    await login(page);
    await page.goto('/estoque');

    await page.click('button:has-text("Novo Produto")');
    await expect(page.locator('text=Novo Produto')).toBeVisible();

    // Botão "Buscar Token" deve estar presente
    const buscarBtn = page.locator('button:has-text("Buscar Token")');
    await expect(buscarBtn).toBeVisible();

    // Deve estar desabilitado sem termo de busca
    await expect(buscarBtn).toBeDisabled();

    // Digitar termo deve habilitar
    await page.fill('#prod-termo', 'arroz');
    await expect(buscarBtn).toBeEnabled();
  });
});

test.describe('Estoque - Importar/Exportar CSV', () => {
  test('botões de CSV aparecem para admin', async ({ page }) => {
    await login(page);
    await page.goto('/estoque');

    // Botões de CSV devem estar presentes
    await expect(page.locator('button:has-text("Exportar CSV")')).toBeVisible();
    await expect(page.locator('text=Importar CSV')).toBeVisible();
  });
});

test.describe('Configuracoes - Scraper Manual', () => {
  test('botão de executar scraper aparece em configurações', async ({ page }) => {
    await login(page);
    await page.goto('/configuracoes');

    // Botão "Executar Scraper Agora" deve estar presente
    await expect(page.locator('button:has-text("Executar Scraper Agora")')).toBeVisible();
  });
});

test.describe('Historico - Sem erro de join', () => {
  test('página de histórico carrega sem erro de relacionamento', async ({ page }) => {
    await login(page);
    await page.goto('/historico');

    // Não deve haver erro de "Could not find a relationship"
    const erroRelacionamento = await page.locator('.badge-error:has-text("Could not find")').count();
    expect(erroRelacionamento).toBe(0);

    // Não deve haver erro de "relationship between"
    const erroRelacionamento2 = await page.locator('.badge-error:has-text("relationship")').count();
    expect(erroRelacionamento2).toBe(0);
  });
});

test.describe('Suporte - Telefone atualizado', () => {
  test('telephone number na página de suporte', async ({ page }) => {
    await page.goto('/suporte');

    // Verificar que o telefone atualizado aparece
    await expect(page.locator('text=(19) 99837-4154')).toBeVisible();
  });
});