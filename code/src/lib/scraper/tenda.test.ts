import { describe, expect, it } from 'vitest';
import {
  candidatosDoTermo,
  extrairPrecoDoHtml,
  extrairProdutoDaBusca,
  extrairTamanhoTexto,
  normalizarTexto,
  palavrasDoTermo,
  produtosDaBuscaOrdenados,
  urlDoProduto,
} from './tenda';

const pagina = (pageProps: unknown) =>
  `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps },
    page: '/produto/[slug]',
  })}</script></head><body><div id="__next"></div></body></html>`;

describe('extrairPrecoDoHtml', () => {
  it('lê o preço numérico do __NEXT_DATA__', () => {
    const html = pagina({
      product: {
        name: 'Açúcar Extra Fino Patéko 1Kg',
        token: 'acucar-extra-fino-pateko-1kg',
        price: 2.79,
        availability: 'in_stock',
      },
    });
    expect(extrairPrecoDoHtml(html)).toBe(2.79);
  });

  it('converte preço em string', () => {
    expect(extrairPrecoDoHtml(pagina({ product: { price: '2.79' } }))).toBe(2.79);
    expect(extrairPrecoDoHtml(pagina({ product: { price: '12,50' } }))).toBe(12.5);
  });

  it('devolve null quando a página caiu no layout de busca', () => {
    const html = pagina({ searchTerm: 'produto-que-nao-existe', notFound: true });
    expect(extrairPrecoDoHtml(html)).toBeNull();
  });

  it('devolve null quando o preço é inválido', () => {
    expect(extrairPrecoDoHtml(pagina({ product: { price: 0 } }))).toBeNull();
    expect(extrairPrecoDoHtml(pagina({ product: { price: -3 } }))).toBeNull();
    expect(extrairPrecoDoHtml(pagina({ product: { price: 'sob consulta' } }))).toBeNull();
    expect(extrairPrecoDoHtml(pagina({ product: {} }))).toBeNull();
  });

  it('devolve null quando o JSON do __NEXT_DATA__ está quebrado', () => {
    const html = '<html><script id="__NEXT_DATA__" type="application/json">{"props":</script></html>';
    expect(extrairPrecoDoHtml(html)).toBeNull();
  });

  it('devolve null quando não existe __NEXT_DATA__', () => {
    expect(extrairPrecoDoHtml('<html><body>manutenção</body></html>')).toBeNull();
  });
});

describe('urlDoProduto', () => {
  it('usa url_tenda quando existe', () => {
    expect(
      urlDoProduto({
        url_tenda: 'https://www.tendaatacado.com.br/produto/arroz-tipo-1-camil-2kg',
        token_tenda: 'outro-token',
      }),
    ).toBe('https://www.tendaatacado.com.br/produto/arroz-tipo-1-camil-2kg');
  });

  it('monta a url a partir do token', () => {
    expect(urlDoProduto({ token_tenda: 'acucar-extra-fino-pateko-1kg' })).toBe(
      'https://www.tendaatacado.com.br/produto/acucar-extra-fino-pateko-1kg',
    );
  });

  it('devolve null sem token nem url', () => {
    expect(urlDoProduto({ token_tenda: null, url_tenda: null })).toBeNull();
    expect(urlDoProduto({ token_tenda: '   ', url_tenda: '' })).toBeNull();
  });
});

describe('extrairProdutoDaBusca', () => {
  it('pega o primeiro produto do productStore', () => {
    const html = pagina({
      searchTerm: 'arroz',
      initialMobxState: {
        productStore: {
          products: [
            {
              id: 61554,
              name: 'Arroz Tipo 1 Camil 2kg',
              url: 'https://tendaatacado.com.br/produto/arroz-tipo-1-camil-2kg',
              token: 'arroz-tipo-1-camil-2kg',
              price: 10.29,
              brand: 'Camil',
            },
          ],
        },
      },
    });

    expect(extrairProdutoDaBusca(html)).toEqual({
      token: 'arroz-tipo-1-camil-2kg',
      nome: 'Arroz Tipo 1 Camil 2kg',
      preco: 10.29,
      marca: 'Camil',
    });
  });

  it('acha produto fora do productStore e tira o token da url', () => {
    const html = pagina({
      vitrine: {
        itens: [
          { name: 'Feijão Carioca 1kg', url: 'https://tendaatacado.com.br/produto/feijao-carioca-1kg', price: 7.4 },
        ],
      },
    });

    expect(extrairProdutoDaBusca(html)).toMatchObject({
      token: 'feijao-carioca-1kg',
      preco: 7.4,
      marca: null,
    });
  });

  it('devolve null quando a busca não achou nada', () => {
    expect(extrairProdutoDaBusca(pagina({ searchTerm: 'xyz', notFound: true }))).toBeNull();
    expect(extrairProdutoDaBusca('<html></html>')).toBeNull();
  });
});

describe('extrairTamanhoTexto', () => {
  it('devolve a embalagem como a Tenda escreve no nome', () => {
    expect(extrairTamanhoTexto('Arroz Tipo 1 Camil 5kg')).toBe('5kg');
    expect(extrairTamanhoTexto('Óleo de Soja Liza 900ml')).toBe('900ml');
    expect(extrairTamanhoTexto('Leite Condensado Moça 395g')).toBe('395g');
  });

  it('junta número e unidade quando o nome traz espaço', () => {
    expect(extrairTamanhoTexto('Arroz Tipo 1 Camil 5 kg')).toBe('5kg');
  });

  it('devolve null quando o nome não traz tamanho', () => {
    expect(extrairTamanhoTexto('Miojo Carne')).toBeNull();
    expect(extrairTamanhoTexto('')).toBeNull();
  });
});

// Página no formato do `__NEXT_DATA__` de busca, para exercitar o filtro de
// nome sem passar por HTTP.
const paginaDeBusca = (produtos: unknown[]) =>
  `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { initialMobxState: { productStore: { products: produtos } } },
  })}</script></head><body></body></html>`;

const itemDaBusca = (token: string, nome: string, preco: number) => ({
  token,
  name: nome,
  url: `https://www.tendaatacado.com.br/produto/${token}`,
  price: preco,
  brand: 'Marca Tenda',
});

const nomesDe = (produtos: unknown[], termo: string) =>
  produtosDaBuscaOrdenados(paginaDeBusca(produtos), 5, undefined, termo).map(
    (item) => item.nome,
  );

describe('normalizarTexto', () => {
  it('tira acento e caixa', () => {
    expect(normalizarTexto('AÇÚCAR União')).toBe('acucar uniao');
  });

  it('troca hífen e barra por espaço', () => {
    expect(normalizarTexto('Pimenta-do-Reino / Sal')).toBe('pimenta do reino sal');
    expect(normalizarTexto('Milho para Micro-ondas')).toBe('milho para micro ondas');
  });

  it('junta número e unidade', () => {
    expect(normalizarTexto('Arroz 5 kg')).toBe('arroz 5kg');
    expect(normalizarTexto('Óleo 900 ML')).toBe('oleo 900ml');
    expect(normalizarTexto('Leite 1,5 l')).toBe('leite 1,5l');
  });

  it('colapsa espaço repetido', () => {
    expect(normalizarTexto('  milho   de   pipoca ')).toBe('milho de pipoca');
  });
});

describe('palavrasDoTermo', () => {
  it('descarta stopword e token de uma letra', () => {
    expect(palavrasDoTermo('Arroz Tipo 1 5kg')).toEqual(['arroz', '5kg']);
  });

  it('mantém as palavras úteis na ordem do termo', () => {
    expect(palavrasDoTermo('tempero alho e sal')).toEqual(['tempero', 'alho', 'sal']);
  });

  it('devolve vazio quando só tem stopword', () => {
    expect(palavrasDoTermo('de da do e tipo')).toEqual([]);
  });
});

describe('candidatosDoTermo', () => {
  it('não aceita pipoca doce pronta para o termo milho de pipoca', () => {
    const nomes = nomesDe(
      [
        itemDaBusca('pipoca-doce-emilia-40g', 'Pipoca Doce Emília 40g', 2.19),
        itemDaBusca(
          'milho-pipoca-micro-ondas-100g',
          'Milho de Pipoca para Micro-ondas Natural PQ 100g',
          3.49,
        ),
      ],
      'milho de pipoca',
    );

    expect(nomes).toEqual(['Milho de Pipoca para Micro-ondas Natural PQ 100g']);
  });

  it('exige o sal do termo tempero alho e sal', () => {
    const nomes = nomesDe(
      [
        itemDaBusca('maggi-alho-cebola-49g', 'Tempero MAGGI Meu Segredo Alho e Cebola 49g', 3.99),
        itemDaBusca('alho-sal-ami-300g', 'Tempero Alho e Sal Sabor Ami 300g', 5.29),
      ],
      'tempero alho e sal',
    );

    expect(nomes).toEqual(['Tempero Alho e Sal Sabor Ami 300g']);
  });

  it('não aceita tempero baiano para o termo pimenta do reino', () => {
    const nomes = nomesDe(
      [
        itemDaBusca('baiano-select-50g', 'Tempero Baiano Select 50g', 2.49),
        itemDaBusca(
          'pimenta-reino-select-60g',
          'Tempero Pimenta do Reino em Pó Select 60g',
          4.19,
        ),
      ],
      'pimenta do reino',
    );

    expect(nomes).toEqual(['Tempero Pimenta do Reino em Pó Select 60g']);
  });

  it('aceita sardinha ralada com tomate', () => {
    const nomes = nomesDe(
      [itemDaBusca('sardinha-88-110g', 'Sardinha Ralada com Tomate 88 110g', 13.3)],
      'sardinha com tomate',
    );

    expect(nomes).toEqual(['Sardinha Ralada com Tomate 88 110g']);
  });

  it('cai no critério de metade em vez de zerar a lista', () => {
    // "cafe torrado e moido 500g" tem 4 palavras úteis. O Pouch casa cafe e
    // 500g (2 de 4), o solúvel casa só cafe.
    const nomes = nomesDe(
      [
        itemDaBusca('cafe-pouch-uniao-500g', 'Café Pouch Trad União 500g', 16.9),
        itemDaBusca('cafe-soluvel-nescafe-50g', 'Café Solúvel Nescafé 50g', 8.49),
      ],
      'cafe torrado e moido 500g',
    );

    expect(nomes).toEqual(['Café Pouch Trad União 500g']);
  });

  it('devolve lista vazia quando nem a metade das palavras casa', () => {
    const itens = produtosDaBuscaOrdenados(
      paginaDeBusca([itemDaBusca('baiano-select-50g', 'Tempero Baiano Select 50g', 2.49)]),
    );

    expect(candidatosDoTermo('tempero pimenta', itens)).toEqual([]);
  });

  it('não filtra quando o termo só tem stopword', () => {
    const itens = produtosDaBuscaOrdenados(
      paginaDeBusca([
        itemDaBusca('a-1', 'Pipoca Doce Emília 40g', 2.19),
        itemDaBusca('b-2', 'Tempero Baiano Select 50g', 2.49),
      ]),
    );

    expect(candidatosDoTermo('de da e tipo', itens)).toHaveLength(2);
  });
});

describe('produtosDaBuscaOrdenados', () => {
  it('traz o texto da embalagem como a Tenda escreve no nome', () => {
    const resultados = produtosDaBuscaOrdenados(
      paginaDeBusca([
        itemDaBusca('oleo-liza-900ml', 'Óleo de Soja Liza 900ml', 6.99),
        itemDaBusca('leite-moca-395g', 'Leite Condensado Moça 395g', 5.49),
        itemDaBusca('arroz-camil-5-kg', 'Arroz Tipo 1 Camil 5 kg', 18.49),
      ]),
    );

    expect(resultados.map((item) => item.tamanhoTexto)).toEqual(['395g', '900ml', '5kg']);
    expect(resultados.map((item) => item.tamanhoKg)).toEqual([0.395, 0.9, 5]);
  });

  it('aplica o filtro de nome junto com o de tamanho', () => {
    const resultados = produtosDaBuscaOrdenados(
      paginaDeBusca([
        itemDaBusca('pipoca-doce-40g', 'Pipoca Doce Emília 40g', 2.19),
        itemDaBusca('milho-pipoca-500g', 'Milho de Pipoca Natural 500g', 4.29),
        itemDaBusca('milho-pipoca-100g', 'Milho de Pipoca Natural 100g', 3.49),
      ]),
      5,
      { min: 0.08, max: 0.12 },
      'milho de pipoca 100g',
    );

    expect(resultados.map((item) => item.token)).toEqual(['milho-pipoca-100g']);
  });
});
