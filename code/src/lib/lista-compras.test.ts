import { describe, it, expect } from 'vitest';
import { gerarPdfListaCompras, type FaltanteParaPdf } from './lista-compras';

const faltantes: FaltanteParaPdf[] = [
  {
    produto: {
      nome: 'Arroz 5kg',
      marca: 'Tio João',
      unidade: '5kg',
      estoque_atual: 2,
      qtd_por_cesta: 5,
    },
    faltando: 3,
    custo_reposicao: 77.7,
  },
  {
    produto: {
      nome: 'Feijão 1kg',
      marca: null,
      unidade: '1kg',
      estoque_atual: 1,
      qtd_por_cesta: 2,
    },
    faltando: 1,
    custo_reposicao: 8.5,
  },
];

const gerar = (lista: FaltanteParaPdf[] = faltantes) =>
  gerarPdfListaCompras(lista, { total: 86.2, cestas: 1, dataPreco: '15/01/2024' });

describe('gerarPdfListaCompras', () => {
  it('tem as colunas Produto, Marca, Tamanho, Estoque, Comprar e Custo', () => {
    const html = gerar();
    for (const coluna of ['Produto', 'Marca', 'Tamanho', 'Estoque', 'Comprar', 'Custo']) {
      expect(html).toContain(`>${coluna}</th>`);
    }
    expect(html.match(/scope="col"/g)).toHaveLength(6);
  });

  it('mostra marca e tamanho de cada item', () => {
    const html = gerar();
    expect(html).toContain('Tio João');
    expect(html).toContain('5kg');
    expect(html).toContain('1kg');
  });

  it('mostra "-" quando a marca não foi preenchida', () => {
    const html = gerar();
    // Feijão não tem marca: a célula cai no traço, não fica vazia.
    expect(html).toContain('<td><span class="vazio">-</span></td>');
  });

  it('identifica a loja e a data dos preços no cabeçalho', () => {
    const html = gerar();
    expect(html).toContain('Tenda Atacado - Salto');
    expect(html).toContain('preços de 15/01/2024');
    expect(html).toContain('Meta: 1 cesta');
  });

  it('avisa que marca e tamanho são o item mais barato da Tenda', () => {
    const html = gerar();
    expect(html).toContain('item mais barato encontrado na Tenda Atacado');
    expect(html).toContain('Confira a etiqueta na prateleira');
  });

  it('assume ausência de data quando nenhum preço foi atualizado', () => {
    const html = gerarPdfListaCompras(faltantes, { total: 86.2, cestas: 2, dataPreco: null });
    expect(html).toContain('preços sem data de atualização registrada');
    expect(html).toContain('Meta: 2 cestas');
  });

  it('fecha o total com o valor formatado em pt-BR', () => {
    expect(gerar()).toContain('R$ 86,20');
  });

  it('escapa HTML vindo do nome, da marca e do tamanho', () => {
    const html = gerar([
      {
        produto: {
          nome: '<script>alert(1)</script>',
          marca: 'A & B',
          unidade: '"5kg"',
          estoque_atual: 0,
          qtd_por_cesta: 1,
        },
        faltando: 1,
        custo_reposicao: 10,
      },
    ]);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('&quot;5kg&quot;');
  });

  it('mostra estado vazio quando não há faltantes', () => {
    const html = gerar([]);
    expect(html).toContain('Nada para comprar');
    expect(html).toContain('colspan="6"');
  });
});
