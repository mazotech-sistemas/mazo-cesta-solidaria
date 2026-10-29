import { describe, expect, it } from 'vitest';
import { contarLinhas, nomeArquivo, normalizarIndice } from './armazenamento';

describe('armazenamento de backup', () => {
  it('gera nome de arquivo sem dois-pontos nem ponto', () => {
    expect(nomeArquivo('2026-10-29T03:00:00.000Z')).toBe('backup-2026-10-29T03-00-00-000Z.json');
  });

  it('conta apenas arrays do conteúdo', () => {
    const total = contarLinhas({
      gerado_em: '2026-10-29T03:00:00.000Z',
      gerado_por: 'cron-semanal',
      produtos: [1, 2, 3],
      compras: [1],
      precos_historico: [],
      regions: [1, 2],
      config: [1, 2, 3, 4],
    });
    expect(total).toBe(10);
  });

  it('ignora lixo no índice', () => {
    expect(normalizarIndice(null)).toEqual([]);
    expect(normalizarIndice('texto')).toEqual([]);
    expect(normalizarIndice([{ semArquivo: true }, 42])).toEqual([]);
  });

  it('normaliza registro válido e completa campos ausentes', () => {
    const registros = normalizarIndice([
      {
        arquivo: 'backup-2026-10-29T03-00-00-000Z.json',
        criado_em: '2026-10-29T03:00:00.000Z',
        autor: 'cron-semanal',
        linhas: 12,
        bytes: 3400,
      },
      { arquivo: 'backup-x.json', criado_em: '2026-10-22T03:00:00.000Z' },
    ]);

    expect(registros).toHaveLength(2);
    expect(registros[0]).toMatchObject({ linhas: 12, autor: 'cron-semanal', bytes: 3400 });
    expect(registros[0].id).toBe('backup-2026-10-29T03-00-00-000Z.json');
    expect(registros[1]).toMatchObject({ autor: 'desconhecido', linhas: 0, bytes: 0 });
  });
});
