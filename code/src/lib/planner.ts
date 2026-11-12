/**
 * Lógica de planejamento de cestas, portada do `src/calc.py` da era
 * Streamlit. Opera sobre os produtos ativos do estoque e devolve as
 * quatro métricas que a tela de simulador usa: custo de uma cesta,
 * quantas cestas o estoque suporta, quantas um orçamento suporta e o
 * que falta comprar para uma meta, com custo de reposição.
 */

export interface ProdutoPlanner {
  id: number;
  nome: string;
  marca?: string | null;
  unidade?: string | null;
  qtd_por_cesta: number;
  estoque_atual: number;
  preco_atual: number;
}

export interface ItemFaltante {
  produto: ProdutoPlanner;
  qtd_necessaria: number;
  faltando: number;
  custo_reposicao: number;
}

export interface ResumoPlanner {
  custo_cesta: number;
  cestas_estoque: number;
  cestas_orcamento: number;
  cestas_orcamento_limite: boolean;
  faltantes: ItemFaltante[];
  total_faltantes: number;
}

/** Custo de uma cesta completa com os preços correntes. */
export function custoCesta(produtos: ProdutoPlanner[]): number {
  return produtos.reduce((acc, p) => acc + p.qtd_por_cesta * p.preco_atual, 0);
}

/**
 * Quantas cestas completas o estoque atual suporta. Zero se faltar
 * quantidade por cesta, porque sem isso não dá para montar nenhuma.
 */
export function cestasPossiveisEstoque(produtos: ProdutoPlanner[]): number {
  if (produtos.length === 0) return 0;
  if (produtos.some((p) => p.qtd_por_cesta <= 0)) return 0;
  const possiveis = produtos.map((p) => Math.floor(p.estoque_atual / p.qtd_por_cesta));
  return Math.max(0, Math.min(...possiveis));
}

/** Quantas cestas completas um orçamento permite comprar do zero. */
export function cestasPossiveisOrcamento(produtos: ProdutoPlanner[], orcamento: number): number {
  if (orcamento <= 0 || produtos.length === 0) return 0;
  const custo = custoCesta(produtos);
  if (custo <= 0) return 0;
  return Math.floor(orcamento / custo);
}

/**
 * Itens que faltam para montar `cestasDesejadas` cestas e o custo de
 * reposição de cada um. Estoque suficiente não gera linha.
 */
export function faltandoComprar(produtos: ProdutoPlanner[], cestasDesejadas: number): ItemFaltante[] {
  if (cestasDesejadas <= 0) return [];
  const out: ItemFaltante[] = [];
  for (const p of produtos) {
    const qtdNecessaria = p.qtd_por_cesta * cestasDesejadas;
    const faltando = Math.max(0, qtdNecessaria - p.estoque_atual);
    if (faltando > 0) {
      out.push({
        produto: p,
        qtd_necessaria: qtdNecessaria,
        faltando,
        custo_reposicao: faltando * p.preco_atual,
      });
    }
  }
  return out;
}

/** Resultado completo para a tela de simulador. */
export function resumoPlanner(
  produtos: ProdutoPlanner[],
  cestasDesejadas: number,
  orcamento: number
): ResumoPlanner {
  const faltantes = faltandoComprar(produtos, cestasDesejadas);
  return {
    custo_cesta: custoCesta(produtos),
    cestas_estoque: cestasPossiveisEstoque(produtos),
    cestas_orcamento: cestasPossiveisOrcamento(produtos, orcamento),
    cestas_orcamento_limite: orcamento > 0,
    faltantes,
    total_faltantes: faltantes.reduce((acc, f) => acc + f.custo_reposicao, 0),
  };
}
