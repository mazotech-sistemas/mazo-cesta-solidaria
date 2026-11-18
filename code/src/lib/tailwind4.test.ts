import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('tailwind 4', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const css = readFileSync('src/app/globals.css', 'utf8');

  it('usa o plugin do postcss do v4', () => {
    expect(pkg.devDependencies['@tailwindcss/postcss']).toBeTruthy();
    expect(pkg.devDependencies.tailwindcss).toMatch(/^\^?4/);
  });

  it('usa @import e @theme em vez das diretivas do v3', () => {
    expect(css).toContain('@import "tailwindcss"');
    expect(css).not.toContain('@tailwind base');
    expect(css).toContain('@theme');
  });
});

describe('line-height do v3 preservado', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  // No v4 a escala text-* usa razao sem unidade; filho com text-[Npx] herda a
  // razao e encolhe (12px * 1.4286 = 17.14px em vez de 20px). Valores do v3.
  const V3: Record<string, string> = {
    xs: '1rem', sm: '1.25rem', base: '1.5rem', lg: '1.75rem', xl: '1.75rem',
    '2xl': '2rem', '3xl': '2.25rem', '4xl': '2.5rem',
  };
  for (const [k, v] of Object.entries(V3)) {
    it(`text-${k} tem line-height absoluto ${v}`, () => {
      expect(css).toMatch(new RegExp(`--text-${k}--line-height:\\s*${v.replace('.', '\\.')}`));
    });
  }
});

describe('compatibilidade de layout com o v3', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  it('space-y e space-x usam margem no filho seguinte, como no v3', () => {
    // v4 poe margin-bottom em :not(:last-child); um toast fixed no fim da
    // pilha ganhava 24px de margem e a pagina do estoque crescia.
    const bloco = css.slice(css.indexOf('@utility space-y-*'), css.indexOf('@utility space-x-*'));
    expect(bloco).toContain('margin-block-end: 0');
    expect(bloco).toContain('& > :not([hidden]) ~ :not([hidden])');
  });
  it('restaura o padding interno do input de data do v3', () => {
    expect(css).toMatch(/::-webkit-datetime-edit-fields-wrapper\s*\{\s*padding-block:\s*1px/);
  });
});
