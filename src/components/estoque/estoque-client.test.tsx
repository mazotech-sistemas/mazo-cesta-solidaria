'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EstoqueClient from './estoque-client';
import type { Produto } from '@/types/database';

const { updateMock, eqMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        updateMock(payload);
        return { eq: eqMock };
      },
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

const mockProdutos: Produto[] = [
  {
    id: 1,
    nome: 'Arroz 5kg',
    marca: 'Tio João',
    unidade: '5kg',
    qtd_por_cesta: 5,
    estoque_atual: 10,
    preco_atual: 25.90,
    token_tenda: '123',
    url_tenda: 'https://www.tendaatacado.com.br/produto/arroz-tio-joao-5kg',
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
    unidade: '1kg',
    qtd_por_cesta: 2,
    estoque_atual: 1,
    preco_atual: 8.50,
    token_tenda: '456',
    url_tenda: null,
    termo_busca: null,
    ativo: true,
    ultima_atualizacao_preco: '2024-01-10',
    criado_em: '2024-01-01',
    atualizado_em: '2024-01-10',
  },
  {
    id: 3,
    nome: 'Óleo 900ml',
    marca: 'Soya',
    unidade: '900ml',
    qtd_por_cesta: 1,
    estoque_atual: 5,
    preco_atual: 12.00,
    token_tenda: null,
    url_tenda: null,
    termo_busca: null,
    ativo: true,
    ultima_atualizacao_preco: '2023-12-01',
    criado_em: '2024-01-01',
    atualizado_em: '2024-01-01',
  },
];

describe('EstoqueClient', () => {
  beforeEach(() => {
    updateMock.mockClear();
    eqMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
  });

  it('renderiza tabela com todos os produtos', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
    expect(screen.getByText('Feijão 1kg')).toBeInTheDocument();
    expect(screen.getByText('Óleo 900ml')).toBeInTheDocument();
  });

  it('exibe cabeçalhos da tabela corretos', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('Produto')).toBeInTheDocument();
    expect(screen.getByText('Estoque')).toBeInTheDocument();
    expect(screen.getByText('Preço Atual')).toBeInTheDocument();
    expect(screen.getByText('Qtd/Cesta')).toBeInTheDocument();
    expect(screen.getByText('Última Atualização')).toBeInTheDocument();
  });

  it('mostra marca e tamanho do item escolhido na linha do produto', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByTestId('referencia-produto-1')).toHaveTextContent('Tio João · 5kg');
    expect(screen.getByTestId('referencia-produto-2')).toHaveTextContent('Camil · 1kg');
    expect(screen.getByTestId('referencia-produto-3')).toHaveTextContent('Soya · 900ml');
  });

  it('linka o produto na Tenda quando existe url_tenda', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const links = screen.getAllByRole('link', { name: /ver na tenda/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', mockProdutos[0].url_tenda);
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('não mostra link para a Tenda quando o produto não tem url_tenda', () => {
    render(<EstoqueClient produtos={[mockProdutos[1]]} isAdmin={false} />);
    expect(screen.queryByRole('link', { name: /ver na tenda/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('referencia-produto-2')).toHaveTextContent('Camil · 1kg');
  });

  it('exibe badge "Baixo" para produtos com estoque ≤ 2', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('Baixo')).toBeInTheDocument();
  });

  it('mostra estoque em vermelho quando ≤ 2', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const redStock = screen.getByText('1,00', { selector: 'span.text-danger' });
    expect(redStock).toHaveClass('text-danger');
    expect(redStock).toHaveClass('font-bold');
  });

  it('filtra produtos por busca no nome', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const input = screen.getByLabelText(/buscar por nome ou marca/i);
    fireEvent.change(input, { target: { value: 'Arroz' } });
    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
    expect(screen.queryByText('Feijão 1kg')).not.toBeInTheDocument();
    expect(screen.queryByText('Óleo 900ml')).not.toBeInTheDocument();
  });

  it('filtra produtos por busca na marca', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const input = screen.getByLabelText(/buscar por nome ou marca/i);
    fireEvent.change(input, { target: { value: 'Camil' } });
    expect(screen.getByText('Feijão 1kg')).toBeInTheDocument();
    expect(screen.queryByText('Arroz 5kg')).not.toBeInTheDocument();
  });

  it('filtra apenas estoque baixo quando checkbox marcado', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const checkbox = screen.getByRole('checkbox', { name: /só estoque baixo/i });
    fireEvent.click(checkbox);
    expect(screen.getByText('Feijão 1kg')).toBeInTheDocument();
    expect(screen.queryByText('Arroz 5kg')).not.toBeInTheDocument();
    expect(screen.queryByText('Óleo 900ml')).not.toBeInTheDocument();
  });

  it('combina busca e filtro de estoque baixo', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const input = screen.getByLabelText(/buscar por nome ou marca/i);
    const checkbox = screen.getByRole('checkbox', { name: /só estoque baixo/i });
    fireEvent.change(input, { target: { value: 'Feijão' } });
    fireEvent.click(checkbox);
    expect(screen.getByText('Feijão 1kg')).toBeInTheDocument();
    expect(screen.queryByText('Arroz 5kg')).not.toBeInTheDocument();
  });

  it('exibe contador de produtos filtrados', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('Mostrando 3 de 3 produtos')).toBeInTheDocument();
  });

  it('atualiza contador ao filtrar', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const checkbox = screen.getByRole('checkbox', { name: /só estoque baixo/i });
    fireEvent.click(checkbox);
    expect(screen.getByText('Mostrando 1 de 3 produtos')).toBeInTheDocument();
  });

  it('exibe estado vazio quando nenhum produto corresponde', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const input = screen.getByLabelText(/buscar por nome ou marca/i);
    fireEvent.change(input, { target: { value: 'Inexistente' } });
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
  });

  it('exibe estado vazio de cadastro para admin sem produtos', () => {
    const { unmount } = render(<EstoqueClient produtos={[]} isAdmin={true} />);
    expect(screen.getByText('Nenhum produto cadastrado')).toBeInTheDocument();
    // Botões "Novo Produto": um na barra de filtros e um no empty state
    const btns = screen.getAllByRole('button', { name: /novo produto/i });
    expect(btns.length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it('exibe estado vazio de cadastro sem ação para voluntário sem produtos', () => {
    const { unmount } = render(<EstoqueClient produtos={[]} isAdmin={false} />);
    expect(screen.getByText('Fale com o administrador para cadastrar produtos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo produto/i })).not.toBeInTheDocument();
    unmount();
  });

  it('formata preço em moeda brasileira', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('R$ 25,90')).toBeInTheDocument();
    expect(screen.getByText('R$ 8,50')).toBeInTheDocument();
    expect(screen.getByText('R$ 12,00')).toBeInTheDocument();
  });

  it('formata quantidade com 2 casas decimais', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('10,00')).toBeInTheDocument();
    // "1,00" aparece várias vezes (estoque + qtd/cesta de Feijão, e o novo
    // contador de desatualizados pode aparecer). Só valida a presença.
    expect(screen.getAllByText('1,00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('5,00').length).toBeGreaterThanOrEqual(1);
  });

  it('exibe "-" no lugar da marca quando ela é nula', () => {
    const produtosSemMarca = [{ ...mockProdutos[0], marca: null }];
    render(<EstoqueClient produtos={produtosSemMarca} isAdmin={false} />);
    expect(screen.getByTestId('referencia-produto-1')).toHaveTextContent('- · 5kg');
  });

  it('exibe apenas "-" quando marca e tamanho são nulos', () => {
    const semReferencia = [{ ...mockProdutos[0], marca: null, unidade: null }];
    render(<EstoqueClient produtos={semReferencia} isAdmin={false} />);
    expect(screen.getByTestId('referencia-produto-1')).toHaveTextContent(/^-$/);
  });

  it('exibe "-" quando ultima_atualizacao_preco é nula', () => {
    const produtosSemData = [{ ...mockProdutos[0], ultima_atualizacao_preco: null }];
    render(<EstoqueClient produtos={produtosSemData} isAdmin={false} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('admin vê as ações de editar e excluir em cada linha', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={true} />);
    expect(screen.getByTestId('editar-produto-1')).toBeInTheDocument();
    expect(screen.getByTestId('excluir-produto-1')).toBeInTheDocument();
    expect(screen.getByTestId('editar-produto-3')).toBeInTheDocument();
    expect(screen.getByTestId('excluir-produto-3')).toBeInTheDocument();
  });

  it('não-admin não vê ações de editar nem excluir', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.queryByTestId('editar-produto-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('excluir-produto-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Ações')).not.toBeInTheDocument();
  });

  it('edita produto e atualiza a linha sem recarregar a página', async () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={true} />);
    fireEvent.click(screen.getByTestId('editar-produto-1'));

    const nome = screen.getByLabelText(/^Nome/) as HTMLInputElement;
    expect(nome.value).toBe('Arroz 5kg');
    expect((screen.getByLabelText(/^Marca/) as HTMLInputElement).value).toBe('Tio João');

    fireEvent.change(nome, { target: { value: 'Arroz Integral 5kg' } });
    fireEvent.submit(screen.getByTestId('form-editar-produto'));

    await waitFor(() => {
      expect(screen.getByText('Arroz Integral 5kg')).toBeInTheDocument();
    });
    expect(screen.queryByText('Arroz 5kg')).not.toBeInTheDocument();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Arroz Integral 5kg', preco_atual: 25.9 })
    );
    expect(eqMock).toHaveBeenCalledWith('id', 1);
    expect(screen.getByText('Produto atualizado com sucesso')).toBeInTheDocument();
  });

  it('atualiza ultima_atualizacao_preco quando o preço muda', async () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={true} />);
    fireEvent.click(screen.getByTestId('editar-produto-1'));

    fireEvent.change(screen.getByLabelText('Preço (R$)'), { target: { value: "30.50" } });
    fireEvent.submit(screen.getByTestId('form-editar-produto'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          preco_atual: 30.5,
          ultima_atualizacao_preco: expect.any(String),
        })
      );
    });
  });

  it('não envia ultima_atualizacao_preco quando o preço não muda', async () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={true} />);
    fireEvent.click(screen.getByTestId('editar-produto-2'));

    fireEvent.submit(screen.getByTestId('form-editar-produto'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
    });
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('ultima_atualizacao_preco');
  });

  it('bloqueia salvar edição sem nome e mostra erro inline', async () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={true} />);
    fireEvent.click(screen.getByTestId('editar-produto-1'));

    fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('form-editar-produto'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Preencha nome');
    expect(updateMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('form-editar-produto')).toBeInTheDocument();
  });

  it('exclui produto com confirmação usando soft delete', async () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={true} />);
    fireEvent.click(screen.getByTestId('excluir-produto-1'));

    expect(screen.getByRole('heading', { name: 'Excluir produto' })).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que quer excluir/)).toHaveTextContent('Arroz 5kg');

    fireEvent.click(screen.getByTestId('confirmar-exclusao'));

    await waitFor(() => {
      expect(screen.queryByText('Arroz 5kg')).not.toBeInTheDocument();
    });
    expect(updateMock).toHaveBeenCalledWith({ ativo: false });
    expect(eqMock).toHaveBeenCalledWith('id', 1);
    expect(screen.getByText('Mostrando 2 de 2 produtos')).toBeInTheDocument();
    expect(screen.getByText('Produto excluído do estoque')).toBeInTheDocument();
  });

  it('cancelar a exclusão mantém o produto na lista', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={true} />);
    fireEvent.click(screen.getByTestId('excluir-produto-1'));
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));

    expect(updateMock).not.toHaveBeenCalled();
    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
  });
});