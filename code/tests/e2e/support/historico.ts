import { expect, type Locator, type Page } from '@playwright/test';

/** Linhas da lista de compras do historico (o painel da lista e o unico com divide-y). */
export const LINHAS_HISTORICO = 'div.panel.overflow-hidden.divide-y > div';

async function abrirHistorico(page: Page) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      await page.goto('/historico', { waitUntil: 'domcontentloaded', timeout: 30000 });
      return;
    } catch (e) {
      if (tentativa === 3) throw e;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Abre o historico filtrado pelo nome do produto de teste e devolve a primeira linha.
 * O filtro de busca casa com o nome do item dentro do JSON `itens`, entao a lista fica
 * restrita a compra da execucao e nao a "primeira linha" de outra compra.
 */
export async function filtrarHistoricoPorProduto(page: Page, nome: string): Promise<Locator> {
  await abrirHistorico(page);
  const busca = page.locator('input[aria-label="Buscar por produto"]');
  await expect(busca).toBeVisible({ timeout: 20000 });
  await busca.fill(nome);

  const linhas = page.locator(LINHAS_HISTORICO);
  await expect(linhas.first()).toBeVisible({ timeout: 20000 });
  return linhas.first();
}

/**
 * Remove a compra criada pelo teste pelo mesmo caminho da tela: historico filtrado pelo
 * produto, expandir a linha, confirmar o dialogo nativo e clicar em Excluir.
 * Retorna quantas compras foram removidas.
 */
export async function excluirComprasPorProduto(page: Page, nome: string): Promise<number> {
  await filtrarHistoricoPorProduto(page, nome);

  const linhas = page.locator(LINHAS_HISTORICO);
  const total = await linhas.count();

  for (let removidas = 0; removidas < total; removidas++) {
    const linha = linhas.first();
    await linha.locator('button[aria-label="Expandir detalhes"]').click();
    await expect(linha.locator(`text=${nome}`).first()).toBeVisible();
    page.once('dialog', (dialogo) => dialogo.accept());
    await linha.locator('button:has-text("Excluir")').click();
    await expect(linhas).toHaveCount(total - removidas - 1, { timeout: 20000 });
  }

  return total;
}
