import { describe, expect, it } from 'vitest';
import { diaEmSaoPaulo } from './atualizar-precos';

// O dia do histórico é o de Brasília. Antes disso, `toISOString().slice(0, 10)`
// jogava o registro das 21h às 0h no dia seguinte.
describe('diaEmSaoPaulo', () => {
  it('trata 01:30 UTC de 30/10 como 29/10 em Brasília', () => {
    expect(diaEmSaoPaulo(new Date('2026-10-30T01:30:00Z'))).toBe('2026-10-29');
  });

  it('trata 02:59 UTC de 30/10 ainda como 29/10 em Brasília', () => {
    expect(diaEmSaoPaulo(new Date('2026-10-30T02:59:00Z'))).toBe('2026-10-29');
  });

  it('vira o dia às 03:00 UTC, meia-noite de Brasília', () => {
    expect(diaEmSaoPaulo(new Date('2026-10-30T03:00:00Z'))).toBe('2026-10-30');
    expect(diaEmSaoPaulo(new Date('2026-10-30T03:30:00Z'))).toBe('2026-10-30');
  });

  it('devolve o mesmo dia no meio da tarde de Brasília', () => {
    expect(diaEmSaoPaulo(new Date('2026-10-29T17:00:00Z'))).toBe('2026-10-29');
  });

  it('formata sempre YYYY-MM-DD, com zero à esquerda', () => {
    expect(diaEmSaoPaulo(new Date('2027-01-05T12:00:00Z'))).toBe('2027-01-05');
  });

  it('usa a data atual quando não recebe parâmetro', () => {
    expect(diaEmSaoPaulo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
