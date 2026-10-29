import { describe, expect, it } from 'vitest';
import { extrairPrecoDoHtml, extrairProdutoDaBusca, urlDoProduto } from './tenda';

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
