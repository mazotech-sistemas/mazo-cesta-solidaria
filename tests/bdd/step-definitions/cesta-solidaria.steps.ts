import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('que eu estou na página de login', async function () {
  await this.page.goto('/login');
  await this.page.waitForLoadState('domcontentloaded');
});

Given('que eu não estou autenticado', async function () {
  await this.page.goto('/login');
  await this.page.waitForLoadState('domcontentloaded');
});

When('eu preencho o email {string}', async function (_email: string) {
  await this.page.fill('input[type="email"]', _email);
});

When('eu preencho a senha {string}', async function (_password: string) {
  await this.page.fill('input[type="password"]', _password);
});

When('eu clico no botão {string}', async function (label: string) {
  await this.page.click(`button:has-text("${label}")`);
});

Then('eu devo ver uma mensagem de erro', async function () {
  await expect(this.page.locator('.badge-error')).toBeVisible({ timeout: 10000 });
});

Then('a mensagem deve conter {string}', async function (text: string) {
  const errorText = await this.page.locator('.badge-error').textContent();
  expect(errorText?.toLowerCase()).toContain(text.toLowerCase());
});

Then('eu devo ser redirecionado para o dashboard', async function () {
  await expect(this.page).toHaveURL(/.*dashboard/, { timeout: 10000 });
});

When('eu tento acessar {string}', async function (path: string) {
  await this.page.goto(path);
  await this.page.waitForLoadState('domcontentloaded');
});

Then('eu devo ser redirecionado para {string}', async function (path: string) {
  await expect(this.page).toHaveURL(new RegExp(path.replace('/', '\\/')), { timeout: 10000 });
});

Then('a URL deve conter {string}', async function (text: string) {
  const url = this.page.url();
  expect(url).toContain(text);
});

Given('que eu não estou logado', async function () {
  await this.page.goto('/suporte');
  await this.page.waitForLoadState('domcontentloaded');
});

When('eu acesso {string}', async function (path: string) {
  await this.page.goto(path);
  await this.page.waitForLoadState('domcontentloaded');
});

Then('a página deve carregar sem redirecionar para login', async function () {
  await expect(this.page).toHaveURL(/.*suporte/);
});

Then('eu devo ver {string} no título', async function (text: string) {
  await expect(this.page.locator('h1')).toContainText(text, { timeout: 10000 });
});

When('eu clico em uma pergunta do FAQ', async function () {
  const summary = this.page.locator('details summary').first();
  await summary.click();
});

Then('a resposta deve aparecer', async function () {
  const details = this.page.locator('details').first();
  await expect(details).toHaveAttribute('open');
});

Then('ao clicar novamente deve fechar', async function () {
  const summary = this.page.locator('details summary').first();
  await summary.click();
  const details = this.page.locator('details').first();
  await expect(details).not.toHaveAttribute('open');
});