import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarTermoNaTenda, extrairTamanhoKg } from './buscar-termo';
import { faixaDoTermo } from './atualizar-precos';

// Fixture com a forma real do `__NEXT_DATA__` da página de busca: os produtos
// ficam em `props.initialMobxState.productStore.products`, com preço misto
// (número e string com vírgula), um item sem preço e outro sem marca.
const paginaDeBusca = (produtos: unknown[]) =>
  `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: {
      initialMobxState: {
        productStore: {
          products: produtos,
        },
      },
      page: '/busca',
    },
  })}</script></head><body><div id="__next"></div></body></html>`;

const htmlDeBusca = paginaDeBusca([
  {
    id: 100,
    name: 'Miojo Carne Sabor Carne 70g',
    token: 'miojo-carne-70g',
    url: 'https://www.tendaatacado.com.br/produto/miojo-carne-70g',
    price: 1.49,
    brand: 'Maggi',
  },
  {
    id: 101,
    name: 'Miojo Carne 70g (grande)',
    token: 'miojo-carne-70g-grande',
    url: 'https://www.tendaatacado.com.br/produto/miojo-carne-70g-grande',
    price: '1.19',
    brand: 'Cerealis',
  },
  {
    id: 102,
    name: 'Miojo Carne 70g importado',
    token: 'miojo-carne-importado',
    url: 'https://www.tendaatacado.com.br/produto/miojo-carne-importado',
    price: 0,
    brand: 'Outra',
  },
  {
    id: 103,
    name: 'Miojo Carne 70g loja',
    token: 'miojo-carne-loja',
    url: 'https://www.tendaatacado.com.br/produto/miojo-carne-loja',
    price: 1.09,
  },
]);

describe('buscarTermoNaTenda', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devolve os 5 mais baratos com preço, marca e url, na ordem de preço', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(htmlDeBusca, { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const resultados = await buscarTermoNaTenda('miojo carne');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opcoes] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://www.tendaatacado.com.br/busca?q=miojo%20carne');
    expect((opcoes as RequestInit).redirect).toBe('follow');
    expect((opcoes as RequestInit).headers).toMatchObject({
      'User-Agent': expect.stringContaining('Mozilla'),
    });
    expect(opcoes).toHaveProperty('signal');

    // O item com price 0 cai fora; os outros vêm do mais barato para o caro.
    expect(resultados.map((item) => item.token)).toEqual([
      'miojo-carne-loja',
      'miojo-carne-70g-grande',
      'miojo-carne-70g',
    ]);
    expect(resultados[0].preco).toBe(1.09);
    expect(resultados[0].marca).toBeNull();
    expect(resultados[0].url).toBe(
      'https://www.tendaatacado.com.br/produto/miojo-carne-loja',
    );
    expect(resultados[1].preco).toBe(1.19);
    expect(resultados[1].marca).toBe('Cerealis');
    expect(resultados[2].preco).toBe(1.49);
    expect(resultados[2].marca).toBe('Maggi');
    // O texto da embalagem acompanha o item para ir à tela e ao PDF.
    expect(resultados.map((item) => item.tamanhoTexto)).toEqual(['70g', '70g', '70g']);
  });

  it('limita em 5 resultados', async () => {
    const muitosProdutos = Array.from({ length: 8 }, (_, indice) => ({
      id: indice,
      name: `Item ${indice}`,
      token: `item-${indice}`,
      url: `https://www.tendaatacado.com.br/produto/item-${indice}`,
      price: 2 + indice,
      brand: 'MarcaX',
    }));
    const fetchMock = vi.fn(async () =>
      new Response(paginaDeBusca(muitosProdutos), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const resultados = await buscarTermoNaTenda('item');
    expect(resultados).toHaveLength(5);
    expect(resultados[0].preco).toBeLessThan(resultados[4].preco);
  });

  it('devolve [] quando a página não tem __NEXT_DATA__', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('<html><body>manutenção</body></html>', { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await buscarTermoNaTenda('arroz')).toEqual([]);
  });

  it('devolve [] quando o __NEXT_DATA__ é JSON inválido', async () => {
    const html =
      '<html><head><script id="__NEXT_DATA__" type="application/json">{"props":</script></head></html>';
    const fetchMock = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await buscarTermoNaTenda('arroz')).toEqual([]);
  });

  it('devolve [] quando a busca não achou nenhum produto', async () => {
    const html = paginaDeBusca([]);
    const fetchMock = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await buscarTermoNaTenda('produto-que-nao-existe')).toEqual([]);
  });

  it('devolve [] quando a resposta HTTP não é 2xx', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await buscarTermoNaTenda('arroz')).toEqual([]);
  });

  it('devolve [] para termo em branco sem chamar fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await buscarTermoNaTenda('  ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devolve [] quando o fetch lança (timeout, rede)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('timeout');
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(buscarTermoNaTenda('arroz')).rejects.toThrow('timeout');
  });

  it('aceita 5kg e rejeita 10kg com a faixa derivada do termo', async () => {
    const html = paginaDeBusca([
      {
        id: 400,
        name: 'Arroz Tipo 1 Camil 10kg',
        token: 'arroz-camil-10kg',
        url: 'https://www.tendaatacado.com.br/produto/arroz-camil-10kg',
        price: 32.9,
        brand: 'Camil',
      },
      {
        id: 401,
        name: 'Arroz Tipo 1 Camil 5kg',
        token: 'arroz-camil-5kg',
        url: 'https://www.tendaatacado.com.br/produto/arroz-camil-5kg',
        price: 18.49,
        brand: 'Camil',
      },
    ]);
    const fetchMock = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const resultados = await buscarTermoNaTenda('arroz tipo 1 5kg', faixaDoTermo('arroz tipo 1 5kg'));

    expect(resultados).toHaveLength(1);
    expect(resultados[0].token).toBe('arroz-camil-5kg');
  });

  it('descarta resultado fora da faixa de tamanho pedida', async () => {
    const html = paginaDeBusca([
      {
        id: 200,
        name: 'Arroz Tipo 1 Bem+Você 10kg',
        token: 'arroz-tipo-1-10kg',
        url: 'https://www.tendaatacado.com.br/produto/arroz-tipo-1-10kg',
        price: 32.9,
        brand: 'Bem+Você',
      },
    ]);
    const fetchMock = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    // Faixa 4-6kg: 10kg fica de fora.
    const resultados = await buscarTermoNaTenda('arroz tipo 1', { min: 4, max: 6 });
    expect(resultados).toEqual([]);
  });

  it('mantém resultado dentro da faixa de tamanho pedida', async () => {
    const html = paginaDeBusca([
      {
        id: 201,
        name: 'Arroz Tipo 1 Bem+Você 5kg',
        token: 'arroz-tipo-1-5kg',
        url: 'https://www.tendaatacado.com.br/produto/arroz-tipo-1-5kg',
        price: 18.49,
        brand: 'Bem+Você',
      },
    ]);
    const fetchMock = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const resultados = await buscarTermoNaTenda('arroz tipo 1', { min: 4, max: 6 });
    expect(resultados).toHaveLength(1);
    expect(resultados[0].token).toBe('arroz-tipo-1-5kg');
    expect(resultados[0].tamanhoKg).toBe(5);
  });

  it('descarta resultado sem indicação de peso quando a faixa está definida', async () => {
    const html = paginaDeBusca([
      {
        id: 202,
        name: 'Arroz Tipo 1 Bem+Você',
        token: 'arroz-tipo-1-generico',
        url: 'https://www.tendaatacado.com.br/produto/arroz-tipo-1-generico',
        price: 9.99,
        brand: 'Bem+Você',
      },
    ]);
    const fetchMock = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const resultados = await buscarTermoNaTenda('arroz tipo 1', { min: 4, max: 6 });
    expect(resultados).toEqual([]);
  });

  it('com faixa nula ou zerada, qualquer peso entra', async () => {
    const html = paginaDeBusca([
      {
        id: 203,
        name: 'Arroz Tipo 1 Bem+Você 10kg',
        token: 'arroz-tipo-1-10kg',
        url: 'https://www.tendaatacado.com.br/produto/arroz-tipo-1-10kg',
        price: 32.9,
        brand: 'Bem+Você',
      },
      {
        id: 204,
        name: 'Arroz Tipo 1 sem peso',
        token: 'arroz-tipo-1-x',
        url: 'https://www.tendaatacado.com.br/produto/arroz-tipo-1-x',
        price: 12.5,
      },
    ]);
    const fetchMock = vi.fn(async () => new Response(html, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const resultados = await buscarTermoNaTenda('arroz', { min: 0, max: 0 });
    expect(resultados).toHaveLength(2);
    expect(resultados.map((item) => item.token)).toEqual([
      'arroz-tipo-1-x',
      'arroz-tipo-1-10kg',
    ]);
  });
});

describe('extrairTamanhoKg', () => {
  it('lê peso em kg do nome', () => {
    expect(extrairTamanhoKg('Arroz Tipo 1 Bem+Você 5kg')).toBe(5);
    expect(extrairTamanhoKg('FEIJAO CARIOCA 1KG')).toBe(1);
    expect(extrairTamanhoKg('Óleo de Soja 900ml')).toBe(0.9);
    expect(extrairTamanhoKg('Suco 1l')).toBe(1);
  });

  it('converte gramas para kg', () => {
    expect(extrairTamanhoKg('Miojo 70g')).toBe(0.07);
  });

  it('pega o primeiro peso, não o da embalagem', () => {
    expect(extrairTamanhoKg('Arroz 5kg pacote 2kg')).toBe(5);
    expect(extrairTamanhoKg('Açúcar 1kg 200g')).toBe(1);
  });

  it('aceita vírgula como separador decimal', () => {
    expect(extrairTamanhoKg('Leite 1,5l')).toBe(1.5);
    expect(extrairTamanhoKg('Molho 250ml')).toBe(0.25);
  });

  it('devolve null quando não há unidade de peso', () => {
    expect(extrairTamanhoKg('Sal Refinado')).toBeNull();
    expect(extrairTamanhoKg('')).toBeNull();
  });
});
