import { describe, it, expect } from 'vitest';
import { precoDesatualizadoCore, idadePrecoDiasCore } from './preco-stale';

// Data de referência fixa para os testes: 2026-11-09 em America/Sao_Paulo
// Em UTC, meia-noite de 2026-11-09 America/Sao_Paulo = 2026-11-09T03:00:00.000Z
const REFERENCIA = new Date('2026-11-09T03:00:00.000Z');

function isoNoFuso(data: Date): string {
  return data.toISOString();
}

function diasAtrasNoFuso(dias: number): string {
  const d = new Date(REFERENCIA);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString();
}

describe('precoDesatualizadoCore (fuso America/Sao_Paulo)', () => {
  it('preço sem ultima_atualizacao_preco é desatualizado', () => {
    expect(precoDesatualizadoCore(null, 7, REFERENCIA)).toBe(true);
    expect(precoDesatualizadoCore(undefined, 7, REFERENCIA)).toBe(true);
    expect(precoDesatualizadoCore('', 7, REFERENCIA)).toBe(true);
  });

  it('preço atualizado hoje não é desatualizado em 7 dias', () => {
    expect(precoDesatualizadoCore(isoNoFuso(REFERENCIA), 7, REFERENCIA)).toBe(false);
  });

  it('preço atualizado há 1 dia não é desatualizado em 7 dias', () => {
    expect(precoDesatualizadoCore(diasAtrasNoFuso(1), 7, REFERENCIA)).toBe(false);
  });

  it('preço atualizado há 5 dias não é desatualizado em 7 dias', () => {
    expect(precoDesatualizadoCore(diasAtrasNoFuso(5), 7, REFERENCIA)).toBe(false);
  });

  it('preço atualizado há 8 dias é desatualizado em 7 dias', () => {
    expect(precoDesatualizadoCore(diasAtrasNoFuso(8), 7, REFERENCIA)).toBe(true);
  });

  it('preço atualizado há 3 dias é desatualizado em 2 dias', () => {
    expect(precoDesatualizadoCore(diasAtrasNoFuso(3), 2, REFERENCIA)).toBe(true);
  });

  it('preço atualizado há 1 dia não é desatualizado em 2 dias', () => {
    expect(precoDesatualizadoCore(diasAtrasNoFuso(1), 2, REFERENCIA)).toBe(false);
  });

  it('limite de 0 dias: qualquer preço anterior é desatualizado', () => {
    expect(precoDesatualizadoCore(diasAtrasNoFuso(1), 0, REFERENCIA)).toBe(true);
  });
});

describe('idadePrecoDiasCore (fuso America/Sao_Paulo)', () => {
  it('preço sem historico devolve null', () => {
    expect(idadePrecoDiasCore(null, REFERENCIA)).toBeNull();
    expect(idadePrecoDiasCore(undefined, REFERENCIA)).toBeNull();
  });

  it('preço atualizado agora tem idade 0', () => {
    expect(idadePrecoDiasCore(isoNoFuso(REFERENCIA), REFERENCIA)).toBe(0);
  });

  it('preço atualizado há 3 dias tem idade 3', () => {
    expect(idadePrecoDiasCore(diasAtrasNoFuso(3), REFERENCIA)).toBe(3);
  });

  it('preço atualizado há 30 dias tem idade 30', () => {
    expect(idadePrecoDiasCore(diasAtrasNoFuso(30), REFERENCIA)).toBe(30);
  });
});