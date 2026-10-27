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
    preco_atual: 25.90,
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
    preco_atual: 8.50,
    token_tenda: '456',
    url_tenda: null,
    termo_busca: null,
    ativo: true,
    ultima_atualizacao_preco: '2024-01-10',
    criado_em: '2024-01-01',
    atualizado_em: '2024-01-10',
  },
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

describe('SimuladorClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('renderiza lista de produtos disponíveis', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
    expect(screen.getByText('Feijão 1kg')).toBeInTheDocument();
  });

  it('exibe contador de produtos disponíveis', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const counter = screen.getByText(/2 produtos/i);
    expect(counter).toBeInTheDocument();
  });

  it('permite selecionar produto via checkbox', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('1 selecionado')).toBeInTheDocument();
  });

  it('permite deselecionar produto', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[0]);
    expect(screen.queryByText('1 selecionado')).not.toBeInTheDocument();
  });

  it('atualiza total quando produto selecionado', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    // Total = 25.90 * 1 * 1 = 25.90
    expect(screen.getAllByText('R$ 25,90')).toHaveLength(3);
  });

  it('permite alterar quantidade do produto selecionado', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const quantityInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(quantityInputs[0], { target: { value: '3' } });
    // Total = 25.90 * 3 * 1 = 77.70
    expect(screen.getAllByText('R$ 77,70')).toHaveLength(2);
  });

  it('permite alterar número de cestas', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const cestasInput = screen.getByLabelText(/Número de cestas/i);
    fireEvent.change(cestasInput, { target: { value: '2' } });
    // Total = 25.90 * 1 * 2 = 51.80
    expect(screen.getAllByText('R$ 51,80')).toHaveLength(2);
  });

  it('calcula total combinado com múltiplos produtos', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    // Total = (25.90 * 1 + 8.50 * 1) * 1 = 34.40
    expect(screen.getAllByText('R$ 34,40')).toHaveLength(1);
  });

  it('exibe resumo lateral com itens selecionados', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText('Arroz 5kg (1x)')).toBeInTheDocument();
    expect(screen.getByText('Itens')).toBeInTheDocument();
    expect(screen.getByText('Cestas')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('botão "Selecionar todos" marca todos os produtos', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const selectAllBtn = screen.getByRole('button', { name: /selecionar todos/i });
    fireEvent.click(selectAllBtn);
    expect(screen.getByText('2 selecionados')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('botão "Limpar" desmarca todos os produtos', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const selectAllBtn = screen.getByRole('button', { name: /selecionar todos/i });
    fireEvent.click(selectAllBtn);
    const clearBtn = screen.getByRole('button', { name: /limpar/i });
    fireEvent.click(clearBtn);
    expect(screen.queryByText('2 selecionados')).not.toBeInTheDocument();
  });

  it('exibe estado vazio quando nenhum produto', () => {
    renderWithToast(<SimuladorClient produtos={[]} userId={mockUserId} />);
    expect(screen.getByText(/Nenhum produto/i)).toBeInTheDocument();
    expect(screen.getByText(/Cadastre produtos no estoque para começar a simular/i)).toBeInTheDocument();
  });

  it('não exibe botão salvar quando nenhum produto selecionado', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(screen.getByText('Selecione produtos para ver o resumo')).toBeInTheDocument();
    expect(screen.queryByText('Salvar Compra')).not.toBeInTheDocument();
  });

  it('salva compra com sucesso e mostra confirmação', async () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const saveBtn = screen.getAllByRole('button')[2];
    fireEvent.click(saveBtn);
    await waitFor(() => {
      const successElements = screen.getAllByText('Compra salva com sucesso!');
      expect(successElements.length).toBeGreaterThan(0);
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        numero_cestas: 1,
        total: 25.90,
        criado_por: mockUserId,
      })
    );
  });

  it('exibe erro se salvamento falhar', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'Erro no banco' } });
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const saveBtn = screen.getAllByRole('button')[2];
    fireEvent.click(saveBtn);
    await waitFor(() => {
      const errorElements = screen.getAllByText('Erro no banco');
      expect(errorElements.length).toBeGreaterThan(0);
    });
    // Fechar o toast clicando no botão de fechar
    const closeBtn = screen.getByRole('button', { name: /fechar/i });
    fireEvent.click(closeBtn);
  });

  it('limpa seleção após salvar com sucesso', async () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const saveBtn = screen.getAllByRole('button')[2];
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.queryByText('1 selecionado')).not.toBeInTheDocument();
    });
  });

  it('reseta número de cestas para 1 após salvar', async () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const cestasInput = screen.getByLabelText(/Número de cestas/i);
    fireEvent.change(cestasInput, { target: { value: '5' } });
    const saveBtn = screen.getAllByRole('button')[2];
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByLabelText(/Número de cestas/i)).toHaveValue(1);
    });
  });

  it('formata preços em moeda brasileira', () => {
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    expect(screen.getByText('R$ 25,90')).toBeInTheDocument();
    expect(screen.getByText('R$ 8,50')).toBeInTheDocument();
  });

  it('exibe loading no botão durante salvamento', async () => {
    let resolveInsert: (value: any) => void;
    mockInsert.mockImplementationOnce(() => new Promise((resolve) => { resolveInsert = resolve; }));
    renderWithToast(<SimuladorClient produtos={mockProdutos} userId={mockUserId} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    const saveBtn = screen.getAllByRole('button')[2];
    fireEvent.click(saveBtn);
    // Botão mostra spinner + "Salvar Compra"
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toContainHTML('Salvar Compra');
    resolveInsert!({ error: null });
    await waitFor(() => {
      const successElements = screen.getAllByText('Compra salva com sucesso!');
      expect(successElements.length).toBeGreaterThan(0);
    });
  });
});