import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { limparDadosDeTeste, marcadorExecucao } from './support/limpeza';
import { excluirComprasPorProduto, filtrarHistoricoPorProduto } from './support/historico';

/**
 * Verificacao dos pontos corrigidos nas ultimas rodadas, rodando contra producao.
 * Tudo que cria produto passa por `criados` e sai no afterEach.
 */

const RUN = marcadorExecucao();
const AXE = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');
const ADMIN_EMAIL = process.env.CESTA_E2E_ADMIN_EMAIL || 'admin@cestasolidaria.org';
const ADMIN_SENHA = process.env.CESTA_E2E_ADMIN_SENHA || 'senha123';

let criados: string[] = [];

test.beforeEach(() => {
  criados = [];
});

test.afterEach(async () => {
  const removidos = await limparDadosDeTeste(criados);
  if (removidos.produtos !== criados.length) {
    throw new Error(`Limpeza incompleta: ${removidos.produtos} de ${criados.length} produtos removidos`);
  }
});

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_SENHA);
  await page.click('button:has-text("Entrar")');
  await page.waitForURL('**/dashboard');
}

async function criarProduto(
  page: Page,
  nome: string,
  extras: { marca?: string; unidade?: string; preco?: string; estoque?: string } = {}
) {
  criados.push(nome);
  await page.goto('/estoque');
  await page.click('button:has-text("Novo Produto")');
  await expect(page.locator('h2:has-text("Novo Produto")')).toBeVisible({ timeout: 10000 });
  await page.fill('#prod-nome', nome);
  if (extras.marca) await page.fill('#prod-marca', extras.marca);
  if (extras.unidade) await page.fill('#prod-unidade', extras.unidade);
  await page.fill('#prod-estoque', extras.estoque ?? '50');
  await page.fill('#prod-preco', extras.preco ?? '12.50');
  await page.fill('#prod-qtd', '1');
  await page.click('button:has-text("Criar Produto")');
  await page.waitForURL('**/estoque');
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function irPara(page: Page, caminho: string) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      await page.goto(caminho, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return;
    } catch (e) {
      if (tentativa === 3) throw e;
      await page.waitForTimeout(1000);
    }
  }
}

test.describe.configure({ mode: 'serial' });

test('estoque: coluna Acoes dentro da viewport em 375, 390, 768 e 1024', async ({ page }) => {
  await login(page);
  const nome = `Produto E2E-${RUN}-acoes`;
  await criarProduto(page, nome);

  for (const width of [375, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await irPara(page, '/estoque');
    await page.waitForTimeout(800);

    // Rola a linha do produto para a área visível antes de medir
    const row = page.locator('tr', { hasText: nome }).first();
    await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const rolagem = page.locator('table').first().locator('xpath=..');
    const overflow = await rolagem.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
      return { clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft };
    });
    await page.waitForTimeout(300);

    const medida = await page.evaluate((alvo) => {
      const botao = document.querySelector(`button[aria-label="Excluir ${alvo}"]`);
      if (!botao) return null;
      const r = botao.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const acertado = document.elementFromPoint(cx, cy);
      return {
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        width: Math.round(r.width),
        altura: Math.round(r.height),
        viewport: window.innerWidth,
        viewportH: window.innerHeight,
        paginaRolaHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
        dentro: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight,
        acertado: acertado ? `${acertado.tagName}${acertado.getAttribute('aria-label') ? '[' + acertado.getAttribute('aria-label') + ']' : ''}` : null,
        clicavel: !!acertado && (acertado === botao || botao.contains(acertado)),
      };
    }, nome);

    expect(medida, `botao de excluir ausente em ${width}px`).not.toBeNull();
    console.log(
      `LARGURA ${width}: left=${medida!.left} right=${medida!.right} top=${medida!.top} bottom=${medida!.bottom} largura=${medida!.width} altura=${medida!.altura} ` +
        `viewport=${medida!.viewport}x${medida!.viewportH} dentro=${medida!.dentro} clicavel=${medida!.clicavel} ` +
        `tabela=${overflow.clientWidth}/${overflow.scrollWidth} scrollLeft=${overflow.scrollLeft} ` +
        `paginaRolaHorizontal=${medida!.paginaRolaHorizontal} alvo=${medida!.acertado}`
    );
    expect(medida!.dentro, `botao fora da viewport em ${width}px`).toBe(true);
    expect(medida!.clicavel, `elementFromPoint nao devolveu o botao em ${width}px`).toBe(true);
    expect(medida!.paginaRolaHorizontal, `pagina rola na horizontal em ${width}px`).toBe(false);
  }
});

test('estoque: editar abre preenchido, salva e atualiza a linha sem reload', async ({ page }) => {
  await login(page);
  const nome = `Produto E2E-${RUN}-editar`;
  await criarProduto(page, nome, { marca: 'Marca Original', unidade: 'kg', preco: '12.50' });

  await page.locator(`button[aria-label="Editar ${nome}"]`).click();
  await expect(page.locator('h2:has-text("Editar Produto")')).toBeVisible();

  const preenchido = {
    nome: await page.locator('#editar-prod-nome').inputValue(),
    marca: await page.locator('#editar-prod-marca').inputValue(),
    unidade: await page.locator('#editar-prod-unidade').inputValue(),
    estoque: await page.locator('#editar-prod-estoque').inputValue(),
    preco: await page.locator('#editar-prod-preco').inputValue(),
    qtd: await page.locator('#editar-prod-qtd').inputValue(),
  };
  console.log('EDITAR preenchido:', JSON.stringify(preenchido));
  expect(preenchido.nome).toBe(nome);
  expect(preenchido.marca).toBe('Marca Original');
  expect(preenchido.unidade).toBe('kg');
  expect(Number(preenchido.preco)).toBeCloseTo(12.5, 2);

  // marca sobrevive a atualizacao da linha apenas se nao houve reload completo
  await page.evaluate(() => {
    (window as unknown as { __semReload?: string }).__semReload = 'vivo';
  });

  const novoNome = `${nome}-editado`;
  criados.push(novoNome);
  await page.fill('#editar-prod-nome', novoNome);
  await page.fill('#editar-prod-preco', '19.90');
  await page.click('button[type="submit"]:has-text("Salvar")');
  await expect(page.locator('h2:has-text("Editar Produto")')).not.toBeVisible({ timeout: 10000 });

  await expect(page.locator(`table tr:has-text("${novoNome}")`)).toBeVisible();
  const linha = await page.locator(`table tr:has-text("${novoNome}")`).innerText();
  console.log('EDITAR linha depois:', linha.replace(/\s+/g, ' ').trim());
  expect(linha.replace(/\s+/g, ' ')).toContain('19,90');

  const semReload = await page.evaluate(() => (window as unknown as { __semReload?: string }).__semReload);
  console.log('EDITAR marcador de sessao apos salvar:', semReload);
  expect(semReload).toBe('vivo');

  // a edicao persiste no servidor
  await page.reload();
  await expect(page.locator(`table tr:has-text("${novoNome}")`)).toBeVisible();
  criados = [novoNome];
});

test('estoque: excluir pede confirmacao com nome, foca Cancelar e remove da lista', async ({ page }) => {
  await login(page);
  const nome = `Produto E2E-${RUN}-excluir`;
  await criarProduto(page, nome);

  await page.locator(`button[aria-label="Excluir ${nome}"]`).click();
  await expect(page.locator('h2:has-text("Excluir produto")')).toBeVisible();

  const textoDialogo = await page.locator('[role="dialog"]').innerText();
  expect(textoDialogo).toContain(nome);

  const confirmar = page.locator('[data-testid="confirmar-exclusao"]');
  const classeConfirmar = await confirmar.getAttribute('class');
  console.log('EXCLUIR classe do confirmar:', classeConfirmar);
  expect(classeConfirmar).toContain('bg-danger');

  await page.waitForTimeout(300);
  const foco = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? { tag: el.tagName, texto: (el.innerText || '').trim() } : null;
  });
  console.log('EXCLUIR foco inicial:', JSON.stringify(foco));
  expect(foco?.texto).toBe('Cancelar');

  await confirmar.click();
  await expect(page.locator('h2:has-text("Excluir produto")')).not.toBeVisible({ timeout: 10000 });
  await expect(page.locator(`table tr:has-text("${nome}")`)).toHaveCount(0);
  await expect(page.locator('text=Produto excluído do estoque').first()).toBeVisible();

  await page.reload();
  await expect(page.locator(`table tr:has-text("${nome}")`)).toHaveCount(0);
  // a tela faz soft delete (ativo = false): mantem o nome em criados para o afterEach apagar a linha
});

test('foco e placeholder: contraste medido no navegador', async ({ page }) => {
  await login(page);

  const medirFoco = (escopo: string) => {
    const parse = (str: string) => {
      const m = String(str).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map((v) => parseFloat(v));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lin = (c: { r: number; g: number; b: number }) => {
      const conv = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * conv(c.r) + 0.7152 * conv(c.g) + 0.0722 * conv(c.b);
    };
    const contraste = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
      const la = lin(a);
      const lb = lin(b);
      return Number(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2));
    };
    // compoe os fundos com alpha, de tras para frente, sobre branco
    const fundoComposto = (el: HTMLElement) => {
      const camadas: Array<{ r: number; g: number; b: number; a: number }> = [];
      let no: HTMLElement | null = el;
      while (no) {
        const c = parse(getComputedStyle(no).backgroundColor);
        if (c && c.a > 0) camadas.push(c);
        if (c && c.a >= 1) break;
        no = no.parentElement;
      }
      let base = { r: 255, g: 255, b: 255 };
      for (let i = camadas.length - 1; i >= 0; i--) {
        const c = camadas[i];
        base = {
          r: c.r * c.a + base.r * (1 - c.a),
          g: c.g * c.a + base.g * (1 - c.a),
          b: c.b * c.a + base.b * (1 - c.a),
        };
      }
      return base;
    };
    const arred = (c: { r: number; g: number; b: number }) => ({
      r: Math.round(c.r),
      g: Math.round(c.g),
      b: Math.round(c.b),
    });

    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    if (escopo === 'navy' && !el.closest('.navy-panel, .stat-panel, .card-navy')) return null;

    const estilo = getComputedStyle(el);
    if (!estilo.boxShadow || estilo.boxShadow === 'none') return null;
    // custom property pode vir como hex: resolve via sonda para rgba
    const resolverCor = (valor: string) => {
      if (!valor) return null;
      const sonda = document.createElement('div');
      sonda.style.color = valor;
      document.body.appendChild(sonda);
      const cor = parse(getComputedStyle(sonda).color);
      sonda.remove();
      return cor;
    };
    const anel = resolverCor(estilo.getPropertyValue('--focus-ring').trim());
    const offset = resolverCor(estilo.getPropertyValue('--focus-offset').trim());
    if (!anel || !offset) return null;

    const fundo = fundoComposto(el);
    const luzFundo = lin(fundo);
    if (escopo === 'paper' && luzFundo < 0.5) return null;
    if (escopo === 'navy' && luzFundo > 0.15) return null;

    return {
      alvo: (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40),
      anel: arred(anel),
      offset: arred(offset),
      fundo: arred(fundo),
      sombra: estilo.boxShadow,
      razaoOffset: contraste(anel, offset),
      razaoFundo: contraste(anel, fundo),
    };
  };

  const varrer = async (rota: string, escopo: 'paper' | 'navy') => {
    await irPara(page, rota);
    await page.waitForTimeout(800);
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const achado = await page.evaluate(medirFoco, escopo);
      if (achado) return achado as { alvo: string; razaoOffset: number; razaoFundo: number };
    }
    return null;
  };

  const focoPaper = await varrer('/estoque', 'paper');
  console.log('FOCO papel:', JSON.stringify(focoPaper));
  expect(focoPaper, 'nao achei anel de foco sobre papel').not.toBeNull();
  expect(Math.min(focoPaper!.razaoOffset, focoPaper!.razaoFundo)).toBeGreaterThanOrEqual(3);

  const focoNavy = await varrer('/dashboard', 'navy');
  console.log('FOCO navy:', JSON.stringify(focoNavy));
  expect(focoNavy, 'nao achei anel de foco dentro de painel navy').not.toBeNull();
  expect(Math.min(focoNavy!.razaoOffset, focoNavy!.razaoFundo)).toBeGreaterThanOrEqual(3);

  const placeholder = await page.evaluate(() => {
    const parse = (str: string) => {
      const m = String(str).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map((v) => parseFloat(v));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lin = (c: { r: number; g: number; b: number }) => {
      const conv = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * conv(c.r) + 0.7152 * conv(c.g) + 0.0722 * conv(c.b);
    };
    const contraste = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
      const la = lin(a);
      const lb = lin(b);
      return Number(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2));
    };
    const alvo = document.createElement('input');
    alvo.className = 'input';
    alvo.placeholder = 'placeholder de medicao';
    document.body.appendChild(alvo);
    const cor = parse(getComputedStyle(alvo, '::placeholder').color);
    const fundo = parse(getComputedStyle(alvo).backgroundColor);
    const razao = cor && fundo ? contraste(cor, fundo) : null;
    alvo.remove();
    return {
      cor: cor ? { r: cor.r, g: cor.g, b: cor.b } : null,
      fundo: fundo ? { r: fundo.r, g: fundo.g, b: fundo.b } : null,
      razao,
    };
  });
  console.log('PLACEHOLDER:', JSON.stringify(placeholder));
  expect(placeholder.razao).not.toBeNull();
  expect(placeholder.razao as number).toBeGreaterThanOrEqual(4.5);
});

test('hidratacao: zero erro React #418 nas 4 telas em producao', async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  const nome = `Produto E2E-${RUN}-hidra`;
  await criarProduto(page, nome);

  for (const rota of ['/historico', '/estoque', '/dashboard', '/simulador']) {
    const erros: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') erros.push(msg.text());
    });
    page.on('pageerror', (err) => erros.push('pageerror: ' + err.message));

    await irPara(page, rota);
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);

    const hidratacao = erros.filter((e) => /418|hydrat|did not match|Minified React error/i.test(e));
    console.log(`HIDRATACAO ${rota}:`, JSON.stringify(hidratacao));
    console.log(`HIDRATACAO ${rota} total:`, erros.length, JSON.stringify(erros.slice(0, 5)));
    expect(hidratacao, `hidratacao falhou em ${rota}`).toEqual([]);
  }
});

test('axe: WCAG 2.0/2.1 A e AA nas 8 telas autenticado', async ({ page }) => {
  test.setTimeout(300000);
  await login(page);
  await criarProduto(page, `Produto E2E-${RUN}-axe`);

  const telas: Array<{ nome: string; rota: string; publica?: boolean }> = [
    { nome: 'login', rota: '/login', publica: true },
    { nome: 'suporte', rota: '/suporte', publica: true },
    { nome: 'dashboard', rota: '/dashboard' },
    { nome: 'estoque', rota: '/estoque' },
    { nome: 'simulador', rota: '/simulador' },
    { nome: 'historico', rota: '/historico' },
    { nome: 'usuarios', rota: '/usuarios' },
    { nome: 'configuracoes', rota: '/configuracoes' },
  ];

  const resumo: Record<string, { wcag20: number; wcag21: number; ids: string[] }> = {};

  for (const tela of telas) {
    if (tela.publica) {
      await page.context().clearCookies();
    } else {
      await login(page);
    }
    await irPara(page, tela.rota);
    await page.waitForTimeout(1500);
    await page.addScriptTag({ path: AXE });

    const rodar = async (tags: string[]) =>
      page.evaluate(
        ([t]) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).axe.run(document, {
            runOnly: { type: 'tag', values: t },
            resultTypes: ['violations'],
          }),
        [tags]
      );

    const r20 = await rodar(['wcag2a', 'wcag2aa']);
    const r21 = await rodar(['wcag21a', 'wcag21aa']);
    const ids = [...r20.violations, ...r21.violations].map(
      (v: { id: string; nodes: unknown[] }) => `${v.id}(${v.nodes.length})`
    );
    resumo[tela.nome] = { wcag20: r20.violations.length, wcag21: r21.violations.length, ids };
    console.log(`AXE ${tela.nome}: wcag20=${r20.violations.length} wcag21=${r21.violations.length} ${JSON.stringify(ids)}`);
    if (r20.violations.length || r21.violations.length) {
      for (const v of [...r20.violations, ...r21.violations]) {
        console.log(
          `AXE DETALHE ${tela.nome} ${v.id} impact=${v.impact} alvos=${JSON.stringify(
            v.nodes.slice(0, 3).map((n: { target: string[] }) => n.target.join(' '))
          )}`
        );
      }
    }
  }

  const total = Object.values(resumo).reduce((acc, r) => acc + r.wcag20 + r.wcag21, 0);
  console.log('AXE RESUMO:', JSON.stringify(resumo));
  expect(total).toBe(0);
});

test('simulador: todo checkbox tem nome acessivel', async ({ page }) => {
  await login(page);
  await criarProduto(page, `Produto E2E-${RUN}-checkbox`);
  await irPara(page, '/simulador');
  await page.waitForTimeout(1500);

  const resultado = await page.evaluate(() => {
    const caixas = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    const semNome = caixas
      .map((el) => {
        const rotulo =
          (el.labels && el.labels.length > 0 ? el.labels[0].innerText : '') ||
          el.getAttribute('aria-label') ||
          (el.getAttribute('aria-labelledby')
            ? (document.getElementById(el.getAttribute('aria-labelledby') as string)?.innerText ?? '')
            : '') ||
          el.getAttribute('title') ||
          '';
        return { id: el.id, nome: rotulo.trim() };
      })
      .filter((c) => !c.nome);
    return { total: caixas.length, semNome };
  });

  console.log('CHECKBOX total:', resultado.total, 'sem nome:', JSON.stringify(resultado.semNome));
  expect(resultado.total).toBeGreaterThan(0);
  expect(resultado.semNome).toEqual([]);
});

test('regressao: criar, editar, simular, salvar compra, historico, CSV, usuarios, configuracoes', async ({ page }) => {
  await login(page);

  // criar
  const nome = `Produto E2E-${RUN}-regressao`;
  await criarProduto(page, nome, { marca: 'Marca Regressao', unidade: 'kg', preco: '10.00', estoque: '20' });
  await expect(page.locator(`table tr:has-text("${nome}")`)).toBeVisible();

  // editar
  await page.locator(`button[aria-label="Editar ${nome}"]`).click();
  await page.fill('#editar-prod-preco', '11.00');
  await page.click('button[type="submit"]:has-text("Salvar")');
  await expect(page.locator('h2:has-text("Editar Produto")')).not.toBeVisible({ timeout: 10000 });
  await expect(page.locator(`table tr:has-text("${nome}")`)).toContainText('11,00');

  // exportar CSV
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('button:has-text("Exportar CSV")'),
  ]);
  console.log('REGRESSAO CSV:', download.suggestedFilename());

  // simular e salvar compra
  await irPara(page, '/simulador');
  await page.waitForTimeout(2000);
  const rotuloProduto = page.locator('label', { hasText: nome }).first();
  await expect(rotuloProduto).toBeVisible();
  const idCaixa = await rotuloProduto.getAttribute('for');
  expect(idCaixa).toBeTruthy();
  await page.locator(`input#${idCaixa}`).check();
  await page.fill('#num-cestas', '2');
  await page.click('button:has-text("Salvar Compra")');
  await expect(page.locator('text=Compra salva com sucesso').first()).toBeVisible({ timeout: 15000 });

  // historico mostra a compra (o nome do produto aparece ao expandir a linha).
  // Filtra pelo nome do produto para nao depender de "a primeira linha" ser a compra desta execucao.
  const linhaCompra = await filtrarHistoricoPorProduto(page, nome);
  await linhaCompra.locator('button[aria-label="Expandir detalhes"]').click();
  await expect(linhaCompra.locator(`text=${nome}`).first()).toBeVisible();
  console.log('REGRESSAO historico: compra encontrada e expandida com o produto');

  // usuarios e configuracoes em leitura
  await irPara(page, '/usuarios');
  await expect(page.locator('text=/Lista de Usuários/')).toBeVisible();
  await expect(page.locator('body')).toContainText('Administrador');
  await irPara(page, '/configuracoes');
  await expect(page.locator('h1:has-text("Configurações")')).toBeVisible();
  await expect(page.locator('#tenda-region-id')).toBeVisible();

  // limpar a compra criada (exclusao existe na propria tela de historico)
  const comprasRemovidas = await excluirComprasPorProduto(page, nome);
  console.log(`REGRESSAO historico: ${comprasRemovidas} compra(s) de teste removida(s)`);

  // limpar o produto pela tela (a tela faz soft delete: o nome fica em criados para o afterEach apagar de verdade)
  await irPara(page, '/estoque');
  await page.locator(`button[aria-label="Excluir ${nome}"]`).click();
  await page.locator('[data-testid="confirmar-exclusao"]').click();
  await expect(page.locator(`table tr:has-text("${nome}")`)).toHaveCount(0);
});

test('usuarios: cria e exclui conta pela tela', async ({ page }) => {
  test.setTimeout(120000);
  await login(page);
  await irPara(page, '/usuarios');

  const nome = `Usuario E2E ${RUN}`;
  const email = `e2e-${RUN}@cestasolidaria.org`;

  // O clique pode cair antes da hidratação do React: repete até o diálogo abrir.
  await expect(async () => {
    await page.click('button:has-text("Novo Usuário")');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 30000 });

  await page.fill('#novo-email', email);
  await page.fill('#novo-senha', 'senha123');
  await page.fill('#novo-nome', nome);
  await page.click('button:has-text("Criar Usuário")');

  await expect(page.locator(`text=${nome}`).first()).toBeVisible({ timeout: 25000 });
  console.log('USUARIOS: conta criada');

  page.once('dialog', (d) => d.accept());
  const linha = page.locator(`div.divide-y > div:has-text("${nome}")`).first();
  await linha.locator('button:has-text("Excluir")').click();
  await expect(page.locator(`text=${nome}`)).toHaveCount(0, { timeout: 25000 });
  console.log('USUARIOS: conta excluida');
});
