/**
 * HTML da lista de compras que a pessoa leva ao mercado. Fica fora do
 * componente para poder ser testado sem React e reaproveitado por qualquer
 * tela que precise imprimir a mesma lista.
 *
 * A lista mostra o que o scraper escolheu na Tenda: marca e tamanho da
 * embalagem do item mais barato. Sem isso a pessoa chega na prateleira sem
 * saber qual pacote pegar.
 */

export interface ProdutoParaPdf {
  nome: string;
  marca?: string | null;
  unidade?: string | null;
  estoque_atual: number;
  qtd_por_cesta: number;
}

export interface FaltanteParaPdf {
  produto: ProdutoParaPdf;
  faltando: number;
  custo_reposicao: number;
}

export interface OpcoesListaCompras {
  total: number;
  cestas: number;
  /** Data dos preços já formatada em pt-BR, ou null quando nenhum preço foi atualizado. */
  dataPreco: string | null;
}

const esc = (valor: string) =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const quantidade = (valor: number) =>
  valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const dinheiro = (valor: number) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const vazio = '<span class="vazio">-</span>';

export function gerarPdfListaCompras(
  faltantes: FaltanteParaPdf[],
  { total, cestas, dataPreco }: OpcoesListaCompras
): string {
  const linhas = faltantes
    .map((f) => {
      const marca = f.produto.marca ? esc(f.produto.marca) : vazio;
      const tamanho = f.produto.unidade ? esc(f.produto.unidade) : vazio;
      return [
        '<tr>',
        `<td>${esc(f.produto.nome)}</td>`,
        `<td>${marca}</td>`,
        `<td>${tamanho}</td>`,
        `<td class="num">${quantidade(f.produto.estoque_atual)}</td>`,
        `<td class="num forte">${quantidade(f.faltando)}</td>`,
        `<td class="num">R$ ${dinheiro(f.custo_reposicao)}</td>`,
        '</tr>',
      ].join('');
    })
    .join('');

  const meta = [
    `Meta: ${cestas} cesta${cestas === 1 ? '' : 's'}`,
    '<strong>Tenda Atacado - Salto</strong>',
    dataPreco ? `preços de ${esc(dataPreco)}` : 'preços sem data de atualização registrada',
  ].join(' &middot; ');

  const corpo = linhas
    ? linhas
    : '<tr><td colspan="6" class="vazio">Nada para comprar: o estoque cobre a meta.</td></tr>';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lista de compras - Cesta Solidária</title><style>
    * { box-sizing: border-box; }
    body {
      font-family: Inter, Arial, sans-serif;
      color: #052049;
      background: #FFFFFF;
      margin: 0;
      padding: 28px 20px 32px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc { max-width: 820px; margin: 0 auto; }
    .doc-head { border-bottom: 2px solid #021D44; padding-bottom: 12px; margin-bottom: 18px; }
    .eyebrow {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: #3A6491;
      margin: 0 0 6px;
    }
    h1 { font-size: 22px; line-height: 1.15; letter-spacing: -.02em; color: #021D44; margin: 0; }
    .meta { font-size: 12px; line-height: 1.5; color: #3A6491; margin: 7px 0 0; }
    .meta strong { color: #021D44; font-weight: 600; }
    .acoes { margin: 0 0 16px; }
    .botao-impressao {
      padding: 9px 18px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: #FFFFFF;
      background: #0052FA;
      border: 0;
      border-radius: 20px;
      cursor: pointer;
    }
    .botao-impressao:hover { background: #0E5DFC; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    thead { display: table-header-group; }
    th, td { border-bottom: 1px solid rgba(2, 29, 68, .14); padding: 8px 10px; text-align: left; vertical-align: top; }
    th {
      background: #021D44;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      white-space: nowrap;
      border-bottom: 0;
    }
    th:first-child { border-top-left-radius: 8px; }
    th:last-child { border-top-right-radius: 8px; }
    tbody tr:nth-child(even) { background: #F7F9FC; }
    tr { page-break-inside: avoid; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .forte { font-weight: 700; color: #021D44; }
    .vazio { color: #3A6491; }
    .total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 2px solid #021D44;
    }
    .total span { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #3A6491; }
    .total strong { font-size: 19px; font-weight: 800; letter-spacing: -.02em; color: #021D44; font-variant-numeric: tabular-nums; }
    .nota {
      margin-top: 20px;
      padding: 12px 16px;
      border-radius: 0 20px 20px 0;
      background: #F2F6FB;
      border-left: 3px solid #00DEB2;
      font-size: 11px;
      line-height: 1.6;
      color: #3A6491;
    }
    .nota strong { color: #021D44; font-weight: 600; }
    @page { margin: 14mm; }
    @media print {
      body { padding: 0; }
      .acoes { display: none; }
    }
  </style></head><body>
    <div class="doc">
      <header class="doc-head">
        <p class="eyebrow">Cesta Solidária</p>
        <h1>Lista de compras</h1>
        <p class="meta">${meta}</p>
      </header>
      <div class="acoes">
        <button class="botao-impressao" onclick="window.print()">Imprimir / Salvar PDF</button>
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">Produto</th>
            <th scope="col">Marca</th>
            <th scope="col">Tamanho</th>
            <th scope="col" class="num">Estoque</th>
            <th scope="col" class="num">Comprar</th>
            <th scope="col" class="num">Custo</th>
          </tr>
        </thead>
        <tbody>${corpo}</tbody>
      </table>
      <p class="total"><span>Total da compra</span><strong>R$ ${dinheiro(total)}</strong></p>
      <p class="nota">
        <strong>Marca e tamanho</strong> são o item mais barato encontrado na Tenda Atacado (filial
        Salto) na data dos preços. Confira a etiqueta na prateleira antes de levar: a loja pode
        trocar a embalagem ou a marca sem aviso.
      </p>
    </div>
  </body></html>`;
}
