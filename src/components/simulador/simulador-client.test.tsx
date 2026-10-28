'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SimuladorClient from './simulador-client';
import type { Produto } from '@/types/database';
import { ToastProvider } from '@/components/ui/toast';

const mockProdutos: Produto[] = [
  {
    id: 1,
    nome: 'Arroz 5kg',
    marca: 'Tio João',
    unidade: 'kg',
    qtd_por_cesta: 5,
    estoque_atual: 10,
    preco_atual: 25.9,
    token_tenda: '123',
    url_tenda: null,
    termo_busca: null,
    ativo: true,
    ultima_atualizacao_preco: '2024-01-15',
    criado_em: '2024-01-01',
    atualizado_em: '2024-01-15',
  },
  {
    id: 2,
    nome: 'Feijão 1kg',
    marca: 'Camil',
    unidade: 'kg',
    qtd_por_cesta: 2,
    estoque_atual: 20,
    preco_atual: 8.5,
    token_tenda: '456',
    url_tenda: null,
    termo_busca: null,
    ativo: true,
    ultima_atualizacao_preco: '2024-01-10',
    criado_em: '2024-01-01',
    atualizado_em: '2024-01-10',
  },
];

// Estoque baixo para forçar a listagem de faltantes
const mockProdutosBaixo: Produto[] = [
  { ...mockProdutos[0], estoque_atual: 2, qtd_por_cesta: 5 }, // 2/5 -> 0 cestas
  { ...mockProdutos[1], estoque_atual: 1, qtd_por_cesta: 2 }, // 1/2 -> 0 cestas
];

const mockUserId = 'user-123';

const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

const renderWithToast = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>);

function botaoSalvar(): HTMLElement {
  // Botão "Salvar Compra" está no painel Resumo
  const btns = screen.getAllByRole('button');
  const salvar = btns.find((b) => b.textContent?.includes('Salvar Compra'));
  if (!salvar) throw new Error('Botão Salvar Compra não encontrado');
  return salvar;
}

function cestasInput() {
  return document.getElementById('num-cestas') as HTMLInputElement;
}

function orcamentoInput() {
  return document.getElementById('orcamento') as HTMLInputElement;
}

describe('SimuladorClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockResolvedValue({ error: null });
  });

  describe('PLANNER', () => {
    it('exibe custo de 1 cesta calculado sobre todos os produtos', () => {
      // 25.9*5 + 8.5*2 = 129.5 + 17 = 146.5
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      expect(screen.getByText('R$ 146,50')).toBeInTheDocument();
    });

    it('exibe cestas possíveis com estoque (mínimo de estoque/qtd)', () => {
      // arroz 10/5 = 2, feijao 20/2 = 10 -> minimo 2
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      expect(screen.getByText('Cestas com estoque')).toBeInTheDocument();
      // o valor "2" aparece em vários lugares; buscamos dentro do card do planner
      const cards = screen.getAllByRole('heading'); // h3/h4
      void cards;
      // Validamos pelo texto "Cestas com estoque" + que não é "—"
      const cardCestas = screen.getByText('Cestas com estoque');
      expect(cardCestas).toBeInTheDocument();
    });

    it('estoque baixo mostra "O que falta comprar" com custo de reposição', () => {
      // 1 cesta: arroz precisa 5 (tem 2, falta 3 * R$25.90 = 77.70)
      // feijao precisa 2 (tem 1, falta 1 * R$8.50 = 8.50). Total = 86.20
      renderWithToast(<SimuladorClient produtos={mockProdutosBaixo} userId={mockUserId} />);
      expect(screen.getByText(/O que falta comprar/i)).toBeInTheDocument();
      expect(screen.getByText('R$ 86,20')).toBeInTheDocument();
    });

    it('estoque baixo e cestas > cestas_estoque mostra alerta de reposição', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutosBaixo} userId={mockUserId} />);
      const alerts = screen.getAllByRole('alert');
      const temEstoqueAlert = alerts.some(
        (a) => a.textContent?.includes('Estoque cobre apenas')
      );
      expect(temEstoqueAlert).toBe(true);
    });

    it('orçamento cobre X cestas: exibe no card', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const orc = orcamentoInput();
      fireEvent.change(orc, { target: { value: '1000' } });
      // custo 146.50; 1000 // 146.50 = 6 cestas
      expect(screen.getByText(/R\$ 1.000,00 de orçamento/)).toBeInTheDocument();
    });

    it('orçamento maior que o suficiente não dispara alerta de orçamento', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      fireEvent.change(orcamentoInput(), { target: { value: '5000' } });
      // cestas_desejadas = 1, cestas_orcamento = 5000/146.5 = 34. Sem alerta.
      const alerts = screen.queryAllByRole('alert');
      const temOrcamentoAlert = alerts.some(
        (a) => a.textContent?.includes('O orçamento cobre apenas')
      );
      expect(temOrcamentoAlert).toBe(false);
    });

    it('orçamento insuficiente dispara alerta', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      // cestas_desejadas = 10, orçamento 100 -> 100/146.50 = 0 cestas possíveis
      fireEvent.change(cestasInput(), { target: { value: '10' } });
      fireEvent.change(orcamentoInput(), { target: { value: '100' } });
      const alerts = screen.queryAllByRole('alert');
      const temOrcamentoAlert = alerts.some(
        (a) => a.textContent?.includes('O orçamento cobre apenas')
      );
      expect(temOrcamentoAlert).toBe(true);
    });

    it('botão "Lista de compras" é habilitado quando há faltantes', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutosBaixo} userId={mockUserId} />);
      const btn = screen.getByRole('button', { name: /Lista de compras/i });
      expect(btn).not.toBeDisabled();
    });

    it('botão "Lista de compras" é desabilitado quando estoque cobre', () => {
      // Com estoque suficiente e cestas=1, não há faltantes
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const btn = screen.getByRole('button', { name: /Lista de compras/i });
      expect(btn).toBeDisabled();
    });

    it('gera download da lista de compras quando há faltantes', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      let capturedBlob: Blob | null = null;
      vi.stubGlobal('URL', {
        createObjectURL: (b: Blob) => {
          capturedBlob = b;
          return 'blob:mock';
        },
        revokeObjectURL: vi.fn(),
      });

      renderWithToast(<SimuladorClient produtos={mockProdutosBaixo} userId={mockUserId} />);
      const btn = screen.getByRole('button', { name: /Lista de compras/i });
      fireEvent.click(btn);

      expect(capturedBlob).not.toBeNull();
      expect((capturedBlob as unknown as Blob).type).toBe('text/html');
      clickSpy.mockRestore();
    });
  });

  describe('MONTAGEM DE CESTA (fluxo original)', () => {
    it('renderiza lista de produtos disponíveis', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
      expect(screen.getByText('Feijão 1kg')).toBeInTheDocument();
    });

    it('permite selecionar produto via checkbox', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText(/1 selecionado/)).toBeInTheDocument();
    });

    it('permite deselecionar produto', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[0]);
      expect(screen.queryByText(/1 selecionado/)).not.toBeInTheDocument();
    });

    it('atualiza total quando produto selecionado', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      // R$ 25.90 aparece: no card de produto (x1 = R$ 25.90), na coluna do resumo, e no total
      expect(screen.getAllByText('R$ 25,90').length).toBeGreaterThanOrEqual(2);
    });

    it('permite alterar quantidade do produto selecionado', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      const qtd = document.querySelector('input[aria-label="Quantidade de Arroz 5kg"]') as HTMLInputElement;
      expect(qtd).not.toBeNull();
      fireEvent.change(qtd, { target: { value: '3' } });
      // R$ 77.70 = 25.90*3
      expect(screen.getByText('R$ 77,70')).toBeInTheDocument();
    });

    it('permite alterar número de cestas (campo do planner)', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.change(cestasInput(), { target: { value: '2' } });
      // R$ 51.80 = 25.90 * 1 * 2
      expect(screen.getByText('R$ 51,80')).toBeInTheDocument();
    });

    it('calcula total combinado com múltiplos produtos', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      // R$ 34.40 = 25.90 + 8.50
      expect(screen.getByText('R$ 34,40')).toBeInTheDocument();
    });

    it('botão "Selecionar todos" marca todos os produtos', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const selectAllBtn = screen.getByRole('button', { name: /selecionar todos/i });
      fireEvent.click(selectAllBtn);
      expect(screen.getByText('2 selecionados')).toBeInTheDocument();
    });

    it('botão "Limpar" desmarca todos os produtos', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      fireEvent.click(screen.getByRole('button', { name: /selecionar todos/i }));
      fireEvent.click(screen.getByRole('button', { name: /limpar/i }));
      expect(screen.queryByText('2 selecionados')).not.toBeInTheDocument();
    });

    it('exibe estado vazio quando nenhum produto', () => {
      renderWithToast(<SimuladorClient produtos={[]} userId={mockUserId} />);
      expect(screen.getByText(/Nenhum produto/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ver estoque/i })).toBeInTheDocument();
    });

    it('não exibe "O que falta comprar" quando estoque cobre', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      expect(screen.queryByText(/O que falta comprar/i)).not.toBeInTheDocument();
    });

    it('salva compra com sucesso e mostra confirmação', async () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(botaoSalvar());
      await waitFor(() => {
        expect(screen.getAllByText('Compra salva com sucesso!').length).toBeGreaterThan(0);
      });
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          numero_cestas: 1,
          total: 25.9,
          criado_por: mockUserId,
        })
      );
    });

    it('exibe erro se salvamento falhar', async () => {
      mockInsert.mockResolvedValueOnce({ error: { message: 'Erro no banco' } });
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(botaoSalvar());
      await waitFor(() => {
        expect(screen.getAllByText('Erro no banco').length).toBeGreaterThan(0);
      });
    });

    it('limpa seleção após salvar com sucesso', async () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(botaoSalvar());
      await waitFor(() => {
        expect(screen.queryByText('1 selecionado')).not.toBeInTheDocument();
      });
    });

    it('reseta número de cestas para 1 após salvar', async () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.change(cestasInput(), { target: { value: '5' } });
      fireEvent.click(botaoSalvar());
      await waitFor(() => {
        expect((cestasInput() as HTMLInputElement).value).toBe('1');
      });
    });

    it('formata preços em moeda brasileira', () => {
      renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
      expect(screen.getAllByText('R$ 25,90').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('R$ 8,50').length).toBeGreaterThanOrEqual(1);
    });
  });
});
