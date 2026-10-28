'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatsCards from './stats-cards';

describe('StatsCards', () => {
  const mockStats = {
    totalProdutos: 150,
    estoqueBaixo: 5,
    precosDesatualizados: 3,
    comprasMes: 42,
  };

  it('renderiza 4 cards de estatísticas', () => {
    render(<StatsCards stats={mockStats} />);
    const cards = screen.getAllByText(/Produtos Cadastrados|Estoque Baixo|Preços Desatualizados|Compras Este Mês/);
    expect(cards).toHaveLength(4);
  });

  it('exibe valores formatados em pt-BR', () => {
    render(<StatsCards stats={mockStats} />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('exibe labels corretos para cada card', () => {
    render(<StatsCards stats={mockStats} />);
    expect(screen.getByText('Produtos Cadastrados')).toBeInTheDocument();
    expect(screen.getByText('Estoque Baixo')).toBeInTheDocument();
    expect(screen.getByText('Preços Desatualizados')).toBeInTheDocument();
    expect(screen.getByText('Compras Este Mês')).toBeInTheDocument();
  });

  it('mostra badge de warning quando estoqueBaixo > 0', () => {
    render(<StatsCards stats={mockStats} />);
    const badge = screen.getByText('5 itens');
    expect(badge).toHaveClass('bg-warn-soft');
    expect(badge).toHaveClass('text-warn');
  });

  it('mostra badge de error quando precosDesatualizados > 0', () => {
    render(<StatsCards stats={mockStats} />);
    const badge = screen.getByText('3 itens');
    expect(badge).toHaveClass('bg-danger-soft');
    expect(badge).toHaveClass('text-danger');
  });

  it('não mostra badge quando estoqueBaixo === 0', () => {
    render(<StatsCards stats={{ ...mockStats, estoqueBaixo: 0 }} />);
    expect(screen.queryByText('0 itens')).not.toBeInTheDocument();
  });

  it('não mostra badge quando precosDesatualizados === 0', () => {
    render(<StatsCards stats={{ ...mockStats, precosDesatualizados: 0 }} />);
    expect(screen.queryByText('0 itens')).not.toBeInTheDocument();
  });

  it('renderiza 4 ícones SVG (um por card)', () => {
    const { container } = render(<StatsCards stats={mockStats} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(4);
  });

  it('formata números grandes com separador de milhar', () => {
    render(<StatsCards stats={{ ...mockStats, totalProdutos: 1500 }} />);
    expect(screen.getByText('1.500')).toBeInTheDocument();
  });

  it('primeiro card vive no painel navy da marca', () => {
    render(<StatsCards stats={mockStats} />);
    const firstCard = screen.getByText('Produtos Cadastrados').closest('a');
    expect(firstCard).toBeInTheDocument();
    expect(firstCard?.closest('.stat-panel')).toBeInTheDocument();
    expect(firstCard?.querySelector('svg')).toBeInTheDocument();
  });
});