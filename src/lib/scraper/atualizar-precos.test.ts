import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  atualizarPrecosDosProdutos,
  diaEmSaoPaulo,
  faixaDoTermo,
  type ProdutoParaAtualizar,
} from './atualizar-precos';

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

// A faixa de peso não vem de coluna do banco: sai do próprio termo de busca.
describe('faixaDoTermo', () => {
  it('deriva 4 a 6 kg de um termo de 5kg', () => {
    expect(faixaDoTermo('arroz tipo 1 5kg')).toEqual({ min: 4, max: 6 });
  });

  it('deriva a faixa de embalagem em mililitro', () => {
    expect(faixaDoTermo('oleo de soja 900ml')).toEqual({ min: 0.72, max: 1.08 });
  });

  it('não restringe termo sem tamanho', () => {
    expect(faixaDoTermo('miojo')).toEqual({});
    expect(faixaDoTermo('biscoito cream cracker')).toEqual({});
  });
});

interface Operacao {
  tabela: string;
  tipo: 'select' | 'update' | 'upsert';
  filtros: Record<string, unknown>;
  valores?: unknown;
}

interface ConfiguracaoDoFalso {
  regionId?: string;
  erroNoUpsert?: string;
}

// Supabase falso com o mínimo que o scraper usa: `select().eq().maybeSingle()`
// na config, `upsert()` no histórico e `update().eq()` em produtos. Guarda cada
// operação para o teste conferir o que foi gravado.
function criarSupabaseFalso(configuracao: ConfiguracaoDoFalso = {}) {
  const operacoes: Operacao[] = [];

  const from = (tabela: string) => {
    let tipo: Operacao['tipo'] = 'select';
    const filtros: Record<string, unknown> = {};
    let valores: unknown;

    const registrar = () => {
      operacoes.push({ tabela, tipo, filtros: { ...filtros }, valores });
      return { data: null, error: null };
    };

    const api = {
      select: () => {
        tipo = 'select';
        return api;
      },
      update: (novosValores: unknown) => {
        tipo = 'update';
        valores = novosValores;
        return api;
      },
      upsert: async (novosValores: unknown) => {
        operacoes.push({ tabela, tipo: 'upsert', filtros: {}, valores: novosValores });
        return {
          data: null,
          error: configuracao.erroNoUpsert
            ? { message: configuracao.erroNoUpsert }
            : null,
        };
      },
      eq: (coluna: string, valor: unknown) => {
        filtros[coluna] = valor;
        return api;
      },
      maybeSingle: async () => {
        registrar();
        if (tabela === 'config') {
          return { data: { valor: configuracao.regionId ?? '000010' }, error: null };
        }
        return { data: null, error: null };
      },
      then: (resolver: (valor: unknown) => unknown) => resolver(registrar()),
    };

    return api;
  };

  return { cliente: { from } as unknown as SupabaseClient, operacoes };
}

const atualizacoesDeProduto = (operacoes: Operacao[]) =>
  operacoes.filter((operacao) => operacao.tabela === 'produtos' && operacao.tipo === 'update');

const upsertsDeHistorico = (operacoes: Operacao[]) =>
  operacoes.filter(
    (operacao) => operacao.tabela === 'precos_historico' && operacao.tipo === 'upsert',
  );

const paginaDeBusca = (produtos: unknown[]) =>
  `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      initialMobxState: { productStore: { products: produtos } },
      page: '/busca',
    },
  })}</script></head><body></body></html>`;

function produtoDaTenda(
  token: string,
  nome: string,
  preco: number,
  marca: string | null = 'Marca Tenda',
) {
  return {
    id: token.length,
    name: nome,
    token,
    url: `https://www.tendaatacado.com.br/produto/${token}`,
    price: preco,
    brand: marca,
  };
}

function simularBusca(produtos: unknown[]) {
  const fetchMock = vi.fn(async () => new Response(paginaDeBusca(produtos), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const produtoDaCesta = (
  campos: Partial<ProdutoParaAtualizar> = {},
): ProdutoParaAtualizar => ({
  id: 1,
  termo_busca: 'arroz tipo 1 5kg',
  token_tenda: null,
  preco_atual: null,
  ...campos,
});

describe('atualizarPrecosDosProdutos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('aceita o item de 5kg e descarta o de 10kg quando o termo pede 5kg', async () => {
    const fetchMock = simularBusca([
      produtoDaTenda('arroz-10kg', 'Arroz Tipo 1 Camil 10kg', 32.9, 'Camil'),
      produtoDaTenda('arroz-5kg', 'Arroz Tipo 1 Camil 5kg', 18.49, 'Camil'),
    ]);
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [produtoDaCesta()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe('https://www.tendaatacado.com.br/busca?q=arroz%20tipo%201%205kg');

    expect(resultado).toMatchObject({
      produtos_verificados: 1,
      atualizados: 1,
      mantidos: 0,
      sem_preco: 0,
      sem_tamanho: 0,
      erros: { total: 0, identificadores: [] },
    });

    const [atualizacao] = atualizacoesDeProduto(operacoes);
    expect(atualizacao.filtros).toEqual({ id: 1 });
    expect(atualizacao.valores).toMatchObject({
      preco_atual: 18.49,
      marca: 'Camil',
      unidade: '5kg',
      token_tenda: 'arroz-5kg',
      url_tenda: 'https://www.tendaatacado.com.br/produto/arroz-5kg',
      ultima_atualizacao_preco: expect.any(String),
    });
  });

  it('grava o histórico do dia com o preço e o rótulo de catálogo', async () => {
    simularBusca([produtoDaTenda('arroz-5kg', 'Arroz Tipo 1 Camil 5kg', 18.49)]);
    const { cliente, operacoes } = criarSupabaseFalso({ regionId: '000123' });

    await atualizarPrecosDosProdutos(cliente, [produtoDaCesta()]);

    const [historico] = upsertsDeHistorico(operacoes);
    expect(historico.valores).toEqual({
      produto_id: 1,
      dia: diaEmSaoPaulo(),
      preco: 18.49,
      region_id: '000123',
    });
  });

  it('não filtra por tamanho quando o termo não traz tamanho', async () => {
    simularBusca([
      produtoDaTenda('miojo-200g', 'Miojo Turma da Monica 200g', 3.29, 'Nissin'),
      produtoDaTenda('miojo-70g', 'Miojo Carne 70g', 1.49, 'Maggi'),
    ]);
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [
      produtoDaCesta({ termo_busca: 'miojo' }),
    ]);

    expect(resultado.atualizados).toBe(1);
    expect(resultado.sem_tamanho).toBe(0);
    const [atualizacao] = atualizacoesDeProduto(operacoes);
    expect(atualizacao.valores).toMatchObject({
      preco_atual: 1.49,
      unidade: '70g',
      token_tenda: 'miojo-70g',
    });
  });

  it('conta em sem_tamanho e mantém o preço quando nada cabe na faixa do termo', async () => {
    simularBusca([produtoDaTenda('arroz-10kg', 'Arroz Tipo 1 Camil 10kg', 32.9)]);
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [
      produtoDaCesta({ preco_atual: 18.49, token_tenda: 'arroz-5kg' }),
    ]);

    expect(resultado).toMatchObject({
      produtos_verificados: 1,
      atualizados: 0,
      mantidos: 0,
      sem_preco: 0,
      sem_tamanho: 1,
      erros: { total: 0, identificadores: [] },
    });
    expect(atualizacoesDeProduto(operacoes)).toHaveLength(0);
    expect(upsertsDeHistorico(operacoes)).toHaveLength(0);
  });

  it('conta em sem_preco quando a busca volta vazia e o termo não tem tamanho', async () => {
    simularBusca([]);
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [
      produtoDaCesta({ termo_busca: 'miojo', preco_atual: 1.49 }),
    ]);

    expect(resultado).toMatchObject({ sem_preco: 1, sem_tamanho: 0, atualizados: 0 });
    expect(atualizacoesDeProduto(operacoes)).toHaveLength(0);
  });

  it('mantém o item atual quando ele está a menos de 10% do mais barato', async () => {
    // Atual 19.00, mais barato 18.00: 5,5% acima, dentro da margem.
    simularBusca([
      produtoDaTenda('arroz-outra', 'Arroz Tipo 1 Outra Marca 5kg', 18.0, 'Outra'),
      produtoDaTenda('arroz-camil', 'Arroz Tipo 1 Camil 5kg', 19.0, 'Camil'),
    ]);
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [
      produtoDaCesta({ preco_atual: 19.0, token_tenda: 'arroz-camil' }),
    ]);

    expect(resultado).toMatchObject({ atualizados: 0, mantidos: 1 });

    // O preço gravado é o do mesmo token, não o do mais barato: a marca fica.
    const [atualizacao] = atualizacoesDeProduto(operacoes);
    expect(atualizacao.valores).toMatchObject({
      preco_atual: 19.0,
      marca: 'Camil',
      unidade: '5kg',
      token_tenda: 'arroz-camil',
      url_tenda: 'https://www.tendaatacado.com.br/produto/arroz-camil',
    });
    const [historico] = upsertsDeHistorico(operacoes);
    expect(historico.valores).toMatchObject({ produto_id: 1, preco: 19.0 });
  });

  it('troca de marca quando o mais barato passa de 10% abaixo do atual', async () => {
    // Atual 20.00, mais barato 17.00: 15% abaixo, fora da margem.
    simularBusca([
      produtoDaTenda('arroz-outra', 'Arroz Tipo 1 Outra Marca 5kg', 17.0, 'Outra'),
      produtoDaTenda('arroz-camil', 'Arroz Tipo 1 Camil 5kg', 20.0, 'Camil'),
    ]);
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [
      produtoDaCesta({ preco_atual: 20.0, token_tenda: 'arroz-camil' }),
    ]);

    expect(resultado).toMatchObject({ atualizados: 1, mantidos: 0 });

    const [atualizacao] = atualizacoesDeProduto(operacoes);
    expect(atualizacao.valores).toMatchObject({
      preco_atual: 17.0,
      marca: 'Outra',
      unidade: '5kg',
      token_tenda: 'arroz-outra',
      url_tenda: 'https://www.tendaatacado.com.br/produto/arroz-outra',
    });
  });

  it('troca quando o token atual sumiu da busca', async () => {
    simularBusca([produtoDaTenda('arroz-nova', 'Arroz Tipo 1 Nova 5kg', 21.0, 'Nova')]);
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [
      produtoDaCesta({ preco_atual: 18.0, token_tenda: 'arroz-camil' }),
    ]);

    expect(resultado).toMatchObject({ atualizados: 1, mantidos: 0 });
    const [atualizacao] = atualizacoesDeProduto(operacoes);
    expect(atualizacao.valores).toMatchObject({
      preco_atual: 21.0,
      token_tenda: 'arroz-nova',
      marca: 'Nova',
    });
  });

  it('não apaga a marca gravada quando a Tenda devolve item sem marca', async () => {
    simularBusca([produtoDaTenda('arroz-sem-marca', 'Arroz Tipo 1 5kg', 18.0, null)]);
    const { cliente, operacoes } = criarSupabaseFalso();

    await atualizarPrecosDosProdutos(cliente, [produtoDaCesta()]);

    const [atualizacao] = atualizacoesDeProduto(operacoes);
    const valores = atualizacao.valores as Record<string, unknown>;
    expect(valores).not.toHaveProperty('marca');
    expect(valores).toMatchObject({ token_tenda: 'arroz-sem-marca', preco_atual: 18.0 });
  });

  it('ignora produto sem termo de busca', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { cliente } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [
      produtoDaCesta({ termo_busca: null }),
      produtoDaCesta({ id: 2, termo_busca: '   ' }),
    ]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({ produtos_verificados: 0, atualizados: 0 });
  });

  it('anota erro e não grava produto quando o histórico falha', async () => {
    simularBusca([produtoDaTenda('arroz-5kg', 'Arroz Tipo 1 Camil 5kg', 18.49)]);
    const { cliente, operacoes } = criarSupabaseFalso({ erroNoUpsert: 'timeout' });

    const resultado = await atualizarPrecosDosProdutos(cliente, [produtoDaCesta()]);

    expect(resultado.erros.total).toBe(1);
    expect(resultado.erros.identificadores).toEqual(['#1 arroz tipo 1 5kg']);
    expect(resultado.atualizados).toBe(0);
    expect(atualizacoesDeProduto(operacoes)).toHaveLength(0);
  });

  it('anota erro quando a busca lança (timeout, rede)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('timeout');
      }),
    );
    const { cliente, operacoes } = criarSupabaseFalso();

    const resultado = await atualizarPrecosDosProdutos(cliente, [produtoDaCesta()]);

    expect(resultado.erros).toEqual({ total: 1, identificadores: ['#1 arroz tipo 1 5kg'] });
    expect(operacoes.filter((operacao) => operacao.tipo !== 'select')).toHaveLength(0);
  });

  it('respeita o teto de identificadores no relatório de erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('timeout');
      }),
    );
    const { cliente } = criarSupabaseFalso();

    const produtos = Array.from({ length: 12 }, (_, indice) =>
      produtoDaCesta({ id: indice + 1, termo_busca: `item ${indice}` }),
    );
    const resultado = await atualizarPrecosDosProdutos(cliente, produtos);

    expect(resultado.erros.total).toBe(12);
    expect(resultado.erros.identificadores).toHaveLength(10);
  });
});
