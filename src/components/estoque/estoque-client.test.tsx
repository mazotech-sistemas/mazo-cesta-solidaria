'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EstoqueClient from './estoque-client';
import type { Produto } from '@/types/database';

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
    unidade: 'ml',
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
  it('renderiza tabela com todos os produtos', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
    expect(screen.getByText('Feijão 1kg')).toBeInTheDocument();
    expect(screen.getByText('Óleo 900ml')).toBeInTheDocument();
  });

  it('exibe cabeçalhos da tabela corretos', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('Produto')).toBeInTheDocument();
    expect(screen.getByText('Marca')).toBeInTheDocument();
    expect(screen.getByText('Estoque')).toBeInTheDocument();
    expect(screen.getByText('Preço Atual')).toBeInTheDocument();
    expect(screen.getByText('Qtd/Cesta')).toBeInTheDocument();
    expect(screen.getByText('Última Atualização')).toBeInTheDocument();
  });

  it('exibe badge "Baixo" para produtos com estoque ≤ 2', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    expect(screen.getByText('Baixo')).toBeInTheDocument();
    const badges = screen.getAllByText('Baixo');
    expect(badges).toHaveLength(1); // Apenas Feijão tem estoque 1
  });

  it('mostra estoque em vermelho quando ≤ 2', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const redStock = screen.getByText('1,00', { selector: 'span.text-red-700' });
    expect(redStock).toHaveClass('text-red-700');
    expect(redStock).toHaveClass('font-bold');
  });

  it('filtra produtos por busca no nome', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const input = screen.getByPlaceholderText(/buscar por nome ou marca/i);
    fireEvent.change(input, { target: { value: 'Arroz' } });
    expect(screen.getByText('Arroz 5kg')).toBeInTheDocument();
    expect(screen.queryByText('Feijão 1kg')).not.toBeInTheDocument();
    expect(screen.queryByText('Óleo 900ml')).not.toBeInTheDocument();
  });

  it('filtra produtos por busca na marca', () => {
    render(<EstoqueClient produtos={mockProdutos} isAdmin={false} />);
    const input = screen.getByPlaceholderText(/buscar por nome ou marca/i);
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
    const input = screen.getByPlaceholderText(/buscar por nome ou marca/i);
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
    const input = screen.getByPlaceholderText(/buscar por nome ou marca/i);
    fireEvent.change(input, { target: { value: 'Inexistente' } });
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
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
    expect(screen.getAllByText('1,00')).toHaveLength(2); // estoque + qtd/cesta do Feijão
    expect(screen.getAllByText('5,00')).toHaveLength(2); // estoque Arroz + qtd/cesta Arroz
  });

  it('exibe "-" quando marca é nula', () => {
    const produtosSemMarca = [{ ...mockProdutos[0], marca: null }];
    render(<EstoqueClient produtos={produtosSemMarca} isAdmin={false} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('exibe "-" quando ultima_atualizacao_preco é nula', () => {
    const produtosSemData = [{ ...mockProdutos[0], ultima_atualizacao_preco: null }];
    render(<EstoqueClient produtos={produtosSemData} isAdmin={false} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});