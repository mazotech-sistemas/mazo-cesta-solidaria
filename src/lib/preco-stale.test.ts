import { describe, it, expect, beforeEach, vi } from 'vitest';
import { precoDesatualizado, idadePrecoDias } from '../preco-stale';

// Fixa a data de referência para que o teste não mude conforme o momento em
// que roda (stale é relativo a "hoje").
function diasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

describe('precoDesatualizado', () => {
  it('preço sem ultima_atualizacao_preco é desatualizado', () => {
    expect(precoDesatualizado(null, 7)).toBe(true);
    expect(precoDesatualizado(undefined, 7)).toBe(true);
    expect(precoDesatualizado('', 7)).toBe(true);
  });

  it('preço atualizado hoje não é desatualizado em 7 dias', () => {
    expect(precoDesatualizado(new Date().toISOString(), 7)).toBe(false);
  });

  it('preço atualizado há 1 dia não é desatualizado em 7 dias', () => {
    expect(precoDesatualizado(diasAtras(1), 7)).toBe(false);
  });

  it('preço atualizado há 5 dias não é desatualizado em 7 dias', () => {
    expect(precoDesatualizado(diasAtras(5), 7)).toBe(false);
  });

  it('preço atualizado há 8 dias é desatualizado em 7 dias', () => {
    expect(precoDesatualizado(diasAtras(8), 7)).toBe(true);
  });

  it('preço atualizado há 3 dias é desatualizado em 2 dias', () => {
    expect(precoDesatualizado(diasAtras(3), 2)).toBe(true);
  });

  it('preço atualizado há 1 dia não é desatualizado em 2 dias', () => {
    expect(precoDesatualizado(diasAtras(1), 2)).toBe(false);
  });

  it('limite de 0 dias: qualquer preço anterior é desatualizado', () => {
    expect(precoDesatualizado(diasAtras(1), 0)).toBe(true);
  });
});

describe('idadePrecoDias', () => {
  it('preço sem historico devolve null', () => {
    expect(idadePrecoDias(null)).toBeNull();
    expect(idadePrecoDias(undefined)).toBeNull();
  });

  it('preço atualizado agora tem idade 0', () => {
    expect(idadePrecoDias(new Date().toISOString())).toBe(0);
  });

  it('preço atualizado há 3 dias tem idade 3', () => {
    expect(idadePrecoDias(diasAtras(3))).toBe(3);
  });

  it('preço atualizado há 30 dias tem idade 30', () => {
    expect(idadePrecoDias(diasAtras(30))).toBe(30);
  });
});