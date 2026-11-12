import { describe, it, expect } from 'vitest';
import {
  custoCesta,
  cestasPossiveisEstoque,
  cestasPossiveisOrcamento,
  faltandoComprar,
  resumoPlanner,
  type ProdutoPlanner,
} from './planner';

const p = (o: Partial<ProdutoPlanner>): ProdutoPlanner => ({
  id: o.id ?? 1,
  nome: o.nome ?? 'Arroz',
  marca: null,
  unidade: 'kg',
  qtd_por_cesta: o.qtd_por_cesta ?? 1,
  estoque_atual: o.estoque_atual ?? 0,
  preco_atual: o.preco_atual ?? 0,
});

describe('planner', () => {
  describe('custoCesta', () => {
    it('soma qtd_por_cesta x preco', () => {
      const df = [
        p({ qtd_por_cesta: 2, preco_atual: 5 }),
        p({ qtd_por_cesta: 1, preco_atual: 8 }),
        p({ qtd_por_cesta: 3, preco_atual: 1.5 }),
      ];
      expect(custoCesta(df)).toBeCloseTo(22.5);
    });

    it('lista vazia custa zero', () => {
      expect(custoCesta([])).toBe(0);
    });
  });

  describe('cestasPossiveisEstoque', () => {
    it('mínimo de estoque/qtd entre produtos', () => {
      const df = [
        p({ qtd_por_cesta: 2, estoque_atual: 100 }), // 50
        p({ qtd_por_cesta: 1, estoque_atual: 50 }), // 50
      ];
      expect(cestasPossiveisEstoque(df)).toBe(50);
    });

    it('arredonda para baixo (int)', () => {
      const df = [
        p({ qtd_por_cesta: 3, estoque_atual: 10 }), // 3.33 -> 3
        p({ qtd_por_cesta: 2, estoque_atual: 20 }),
      ];
      expect(cestasPossiveisEstoque(df)).toBe(3);
    });

    it('estoque zero zera tudo', () => {
      const df = [
        p({ qtd_por_cesta: 2, estoque_atual: 0 }),
        p({ qtd_por_cesta: 1, estoque_atual: 999 }),
      ];
      expect(cestasPossiveisEstoque(df)).toBe(0);
    });

    it('lista vazia zera', () => {
      expect(cestasPossiveisEstoque([])).toBe(0);
    });

    it('qtd_por_cesta inválida zera', () => {
      const df = [
        p({ qtd_por_cesta: 0, estoque_atual: 100 }),
        p({ qtd_por_cesta: 1, estoque_atual: 50 }),
      ];
      expect(cestasPossiveisEstoque(df)).toBe(0);
    });
  });

  describe('cestasPossiveisOrcamento', () => {
    it('orçamento / custo da cesta', () => {
      const df = [
        p({ qtd_por_cesta: 2, preco_atual: 5 }),
        p({ qtd_por_cesta: 1, preco_atual: 10 }),
      ];
      // custo = 10 + 10 = 20, orçamento 100 -> 5
      expect(cestasPossiveisOrcamento(df, 100)).toBe(5);
    });

    it('orçamento zero vira zero', () => {
      const df = [p({ qtd_por_cesta: 2, preco_atual: 5 })];
      expect(cestasPossiveisOrcamento(df, 0)).toBe(0);
    });

    it('lista vazia zera', () => {
      expect(cestasPossiveisOrcamento([], 100)).toBe(0);
    });

    it('arredonda para baixo', () => {
      const df = [p({ qtd_por_cesta: 1, preco_atual: 30 })];
      // 3 cestas = 90, mas 100 // 30 = 3 (30*3=90 sobra 10)
      expect(cestasPossiveisOrcamento(df, 100)).toBe(3);
    });
  });

  describe('faltandoComprar', () => {
    it('acerta cenário do BDD: faltam 2 para 40 cestas', () => {
      const df = [
        p({ id: 1, qtd_por_cesta: 2, estoque_atual: 100 }),
        p({ id: 2, qtd_por_cesta: 1, estoque_atual: 50 }),
        p({ id: 3, qtd_por_cesta: 2, estoque_atual: 30 }),
      ];
      // 40 cestas: arroz precisa 80 (tem 100, ok), feijao precisa 40 (tem 50, ok), cuscous precisa 80 (tem 30, faltar 50)
      const faltantes = faltandoComprar(df, 40);
      expect(faltantes).toHaveLength(1);
      expect(faltantes[0].produto.id).toBe(3);
      expect(faltantes[0].faltando).toBe(50);
    });

    it('sem falta: estoque suficiente', () => {
      const df = [p({ qtd_por_cesta: 1, estoque_atual: 100 })];
      expect(faltandoComprar(df, 20)).toHaveLength(0);
    });

    it('todos faltando: estoque zero', () => {
      const df = [
        p({ id: 1, qtd_por_cesta: 2, estoque_atual: 0, preco_atual: 5 }),
        p({ id: 2, qtd_por_cesta: 1, estoque_atual: 0, preco_atual: 8 }),
      ];
      const f = faltandoComprar(df, 10);
      expect(f).toHaveLength(2);
      // 10 cestas: arroz 10*2=20 un @ R$5 = 100; feijao 10*1=10 un @ R$8 = 80; total R$180
      expect(f.reduce((s, x) => s + x.custo_reposicao, 0)).toBeCloseTo(180);
    });

    it('meta zero não calcula falta', () => {
      const df = [p({ qtd_por_cesta: 2, estoque_atual: 0 })];
      expect(faltandoComprar(df, 0)).toHaveLength(0);
    });
  });

  describe('resumoPlanner', () => {
    it('combina as quatro métricas', () => {
      const df = [
        p({ qtd_por_cesta: 2, estoque_atual: 100, preco_atual: 5 }),
        p({ qtd_por_cesta: 1, estoque_atual: 50, preco_atual: 8 }),
      ];
      const r = resumoPlanner(df, 30, 100);
      expect(r.custo_cesta).toBeCloseTo(18);
      expect(r.cestas_estoque).toBe(50);
      expect(r.cestas_orcamento).toBe(5);
      expect(r.cestas_orcamento_limite).toBe(true);
      // 30 cestas: arroz precisa 60 (tem 100), feijao precisa 30 (tem 50) -> sem falta
      expect(r.faltantes).toHaveLength(0);
      expect(r.total_faltantes).toBe(0);
    });

    it('com falta, soma o custo de reposicao', () => {
      const df = [
        p({ qtd_por_cesta: 2, estoque_atual: 0, preco_atual: 5 }),
        p({ qtd_por_cesta: 1, estoque_atual: 0, preco_atual: 8 }),
      ];
      const r = resumoPlanner(df, 10, 0);
      expect(r.faltantes).toHaveLength(2);
      expect(r.total_faltantes).toBeCloseTo(180);
      expect(r.cestas_orcamento_limite).toBe(false);
    });
  });
});
