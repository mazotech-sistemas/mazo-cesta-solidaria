import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('consumo do @mazotech/ui', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

  it('fixa o pacote por git com hash de commit', () => {
    expect(pkg.dependencies['@mazotech/ui']).toMatch(/mazotech-sistemas\/mazo-ui(\.git)?#[0-9a-f]{40}$/);
  });

  it('importa a entrada unica e nao importa as fontes (a cesta usa next/font)', () => {
    expect(css).toContain('@import "@mazotech/ui/styles.css"');
    expect(css).not.toContain('@mazotech/ui/fonts.css');
  });

  it('nao redeclara as cores de marca', () => {
    for (const token of ['--color-navy:', '--color-royal:', '--color-mint:', '--color-ice:', '--color-ink:', '--color-paper:']) {
      expect(css, `${token} duplicado`).not.toContain(token);
    }
  });

  it('mantem as cores semanticas proprias da cesta', () => {
    for (const token of ['--color-danger: #B42318', '--color-warn: #B54708', '--color-success: #05603A', '--color-steel-strong: #3A6491']) {
      expect(css).toContain(token);
    }
  });
});
