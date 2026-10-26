'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QuickActions from './quick-actions';

describe('QuickActions', () => {
  it('renderiza 3 ações para usuário não-admin', () => {
    render(<QuickActions isAdmin={false} />);
    const actions = screen.getAllByText(/Novo Produto|Simular Cesta|Ver Histórico/);
    expect(actions).toHaveLength(3);
  });

  it('renderiza 4 ações para usuário admin', () => {
    render(<QuickActions isAdmin={true} />);
    const actions = screen.getAllByText(/Novo Produto|Simular Cesta|Ver Histórico|Configurações/);
    expect(actions).toHaveLength(4);
  });

  it('exibe título "Ações Rápidas"', () => {
    render(<QuickActions isAdmin={false} />);
    expect(screen.getByText('Ações Rápidas')).toBeInTheDocument();
  });

  it('não mostra ação Configurações quando isAdmin=false', () => {
    render(<QuickActions isAdmin={false} />);
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
  });

  it('mostra ação Configurações quando isAdmin=true', () => {
    render(<QuickActions isAdmin={true} />);
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it('renderiza links com hrefs corretos', () => {
    render(<QuickActions isAdmin={true} />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map(link => link.getAttribute('href'));
    expect(hrefs).toContain('/estoque');
    expect(hrefs).toContain('/simulador');
    expect(hrefs).toContain('/historico');
    expect(hrefs).toContain('/configuracoes');
  });

  it('renderiza ícones SVG para cada ação', () => {
    const { container } = render(<QuickActions isAdmin={true} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(4);
  });

  it('aplica classes de estilo corretas nos cards', () => {
    render(<QuickActions isAdmin={false} />);
    const cards = screen.getAllByRole('link');
    cards.forEach(card => {
      expect(card).toHaveClass('card');
      expect(card).toHaveClass('p-4');
    });
  });
});