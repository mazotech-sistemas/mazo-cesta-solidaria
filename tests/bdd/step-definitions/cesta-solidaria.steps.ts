import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { CestaWorld } from '../world';
import {
  custoCesta,
  cestasPossiveisEstoque,
  cestasPossiveisOrcamento,
  faltandoComprar,
} from '../../../src/lib/planner';
import { precoDesatualizado } from '../../../src/lib/preco-stale';

interface ProdutoSim {
  id: number;
  nome: string;
  unidade?: string;
  qtd_por_cesta: number;
  estoque_atual: number;
  preco_atual: number;
  ativo?: boolean;
}

let proximoId = 1;

function parseNumBR(v: string | undefined, def = 0): number {
  if (v === undefined || v.trim() === '') return def;
  const limpo = v.trim().replace(/\./g, '').replace(',', '.');
  return Number(limpo) || def;
}

function produtosDoCenario(linhas: Array<Record<string, string>>): ProdutoSim[] {
  proximoId = 1;
  return linhas.map((l) => ({
    id: proximoId++,
    nome: l['nome']?.trim() || '',
    unidade: l['unidade'],
    qtd_por_cesta: Number.parseInt(l['qtd_por_cesta'] || '1', 10) || 1,
    estoque_atual: Number.parseInt(l['estoque'] || '0', 10) || 0,
    preco_atual: parseNumBR(l['preco']),
  }));
}

// ===== Login / Navegacao =====

Given('que eu estou na página de login', async function (this: CestaWorld) {
  await this.page.goto('/login');
  await this.page.waitForLoadState('domcontentloaded');
});

Given('que eu não estou autenticado', async function (this: CestaWorld) {
  await this.page.context().clearCookies();
  await this.page.goto('/login');
  await this.page.waitForLoadState('domcontentloaded');
});

When('eu preencho o email {string}', async function (this: CestaWorld, email: string) {
  await this.page.getByLabel(/email/i).fill(email);
});

When('eu preencho a senha {string}', async function (this: CestaWorld, senha: string) {
  await this.page.getByLabel(/senha/i).fill(senha);
});

When('eu clico no botão {string}', async function (this: CestaWorld, rotulo: string) {
  await this.page.getByRole('button', { name: rotulo }).click();
});

Then('eu devo ver uma mensagem de erro', async function (this: CestaWorld) {
  await expect(this.page.locator('.badge-error')).toBeVisible({ timeout: 15000 });
});

Then('a mensagem deve conter {string}', async function (this: CestaWorld, texto: string) {
  await expect(this.page.locator('.badge-error')).toContainText(texto, { timeout: 15000 });
});

Then('eu devo ser redirecionado para o dashboard', async function (this: CestaWorld) {
  await expect(this.page).toHaveURL(/.*dashboard/, { timeout: 15000 });
});

When('eu tento acessar {string}', async function (this: CestaWorld, rota: string) {
  await this.page.context().clearCookies();
  await this.page.goto(rota);
  await this.page.waitForLoadState('domcontentloaded');
});

Then('eu devo ser redirecionado para {string}', async function (this: CestaWorld, rota: string) {
  const padrao = new RegExp(rota.replace(/\//g, '\\/'));
  await expect(this.page).toHaveURL(padrao, { timeout: 15000 });
});

Then('a URL deve conter {string}', async function (this: CestaWorld, texto: string) {
  expect(this.page.url()).toContain(texto);
});

Given('que eu não estou logado', async function (this: CestaWorld) {
  await this.page.context().clearCookies();
  await this.page.goto('/suporte');
  await this.page.waitForLoadState('domcontentloaded');
});

When('eu acesso {string}', async function (this: CestaWorld, rota: string) {
  await this.page.goto(rota);
  await this.page.waitForLoadState('domcontentloaded');
});

Then('a página deve carregar sem redirecionar para login', async function (this: CestaWorld) {
  await expect(this.page).toHaveURL(/.*suporte/);
});

Then('eu devo ver {string} no título', async function (this: CestaWorld, texto: string) {
  await expect(this.page.locator('h1')).toContainText(texto, { timeout: 15000 });
});

When('eu clico em uma pergunta do FAQ', async function (this: CestaWorld) {
  const resumo = this.page.locator('details summary').first();
  await resumo.click();
});

Then('a resposta deve aparecer', async function (this: CestaWorld) {
  const item = this.page.locator('details').first();
  await expect(item).toHaveAttribute('open');
});

Then('ao clicar novamente deve fechar', async function (this: CestaWorld) {
  const item = this.page.locator('details').first();
  await item.locator('summary').click();
  await expect(item).not.toHaveAttribute('open');
});

// ===== Estoque - Validacao =====

Given('que eu crio um produto', function (this: CestaWorld, tabela: any) {
  const linhas = tabela.hashes();
  this.dados['produto'] = {
    nome: linhas[0]['nome']?.trim() || '',
    unidade: linhas[0]['unidade'],
    qtd_por_cesta: Number.parseInt(linhas[0]['qtd_por_cesta'] ?? '1', 10),
    estoque_atual: Number.parseInt(linhas[0]['estoque'] ?? '0', 10),
    preco_atual: parseNumBR(linhas[0]['preco']),
    url_tenda: linhas[0]['url_tenda'],
  };
});

When('eu valido o produto', function (this: CestaWorld) {
  const p = this.dados['produto'] as Record<string, unknown>;
  const erros: string[] = [];

  if (!p.nome) erros.push('Nome é obrigatório');
  if (!p.unidade) erros.push('Unidade é obrigatória');
  const qtd = Number(p.qtd_por_cesta);
  if (!(qtd > 0)) erros.push('qtd_por_cesta deve ser > 0');
  const estoque = Number(p.estoque_atual);
  if (estoque < 0) erros.push('estoque_atual não pode ser negativo');
  const preco = Number(p.preco_atual);
  if (preco < 0) erros.push('preco_atual não pode ser negativo');
  if (p.url_tenda && typeof p.url_tenda === 'string' && p.url_tenda.trim() !== '') {
    const url = String(p.url_tenda).trim();
    if (!/^https?:\/\/(www\.)?tendaatacado\.com\.br\/produto\//.test(url)) {
      erros.push('url_tenda deve apontar para a Tenda Atacado');
    }
  }

  this.dados['erros'] = erros;
});

Then('o produto deve ser válido', function (this: CestaWorld) {
  expect((this.dados['erros'] as string[])).toEqual([]);
});

Then('o produto deve ser inválido', function (this: CestaWorld) {
  expect((this.dados['erros'] as string[]).length).toBeGreaterThan(0);
});

Then('deve haver {int} erro de validacao', function (this: CestaWorld, n: number) {
  expect((this.dados['erros'] as string[]).length).toBe(n);
});

// ===== Simulador - Planner =====

Given('que eu tenho produtos', function (this: CestaWorld, tabela: any) {
  this.dados['produtos'] = produtosDoCenario(tabela.hashes());
});

Then('o custo da cesta deve ser {float},{float} BRL', function (this: CestaWorld, intPart: number, decPart: number) {
  const custo = custoCesta(this.dados['produtos'] as ProdutoSim[]);
  const alvo = intPart + decPart / 100;
  expect(custo).toBeCloseTo(alvo, 2);
});

Then('as cestas possiveis com o estoque devem ser {int}', function (this: CestaWorld, esperado: number) {
  const cestas = cestasPossiveisEstoque(this.dados['produtos'] as ProdutoSim[]);
  expect(cestas).toBe(esperado);
});

Then('com um orcamento de {float},{float} BRL as cestas possiveis devem ser {int}', function (this: CestaWorld, intPart: number, decPart: number, esperado: number) {
  const alvo = intPart + decPart / 100;
  const cestas = cestasPossiveisOrcamento(this.dados['produtos'] as ProdutoSim[], alvo);
  expect(cestas).toBe(esperado);
});

Then('para {int} cestas o custo de reposicao deve ser {float},{float} BRL', function (this: CestaWorld, cestas: number, intPart: number, decPart: number) {
  const faltantes = faltandoComprar(this.dados['produtos'] as ProdutoSim[], cestas);
  const total = faltantes.reduce((acc, f) => acc + f.custo_reposicao, 0);
  const alvo = intPart + decPart / 100;
  expect(total).toBeCloseTo(alvo, 2);
});

Then('para {int} cestas nada deve faltar', function (this: CestaWorld, cestas: number) {
  const faltantes = faltandoComprar(this.dados['produtos'] as ProdutoSim[], cestas);
  expect(faltantes.length).toBe(0);
});

Then('para {int} cestas devem faltar {int} itens', function (this: CestaWorld, cestas: number, esperado: number) {
  const faltantes = faltandoComprar(this.dados['produtos'] as ProdutoSim[], cestas);
  expect(faltantes.length).toBe(esperado);
});

// ===== Precos - Stale =====

Given('que a ultima atualizacao de preco foi ha {int} dia\\(s\\)', function (this: CestaWorld, dias: number) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  this.dados['ultima'] = data.toISOString();
});

When('eu considero um tolerancia de {int} dia\\(s\\)', function (this: CestaWorld, dias: number) {
  const ultima = this.dados['ultima'] as string;
  this.dados['stale'] = precoDesatualizado(ultima, dias);
});

Then('o preço NÃO deve estar desatualizado', function (this: CestaWorld) {
  expect(this.dados['stale']).toBe(false);
});

Then('o preço deve estar desatualizado', function (this: CestaWorld) {
  expect(this.dados['stale']).toBe(true);
});