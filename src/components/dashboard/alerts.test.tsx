'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Alerts from './alerts';

describe('Alerts', () => {
  it('renderiza estado "Tudo em ordem" quando sem alertas', () => {
    render(<Alerts estoqueBaixo={0} precosDesatualizados={0} />);
    expect(screen.getByText('Tudo em ordem!')).toBeInTheDocument();
    expect(screen.getByText('Seu estoque está atualizado e os preços sincronizados')).toBeInTheDocument();
  });

  it('renderiza alerta de estoque baixo quando estoqueBaixo > 0', () => {
    render(<Alerts estoqueBaixo={3} precosDesatualizados={0} />);
    expect(screen.getByText('3 produtos com estoque baixo')).toBeInTheDocument();
    expect(screen.getByText('Verifique o estoque e gere lista de compras no Simulador')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /estoque/i })).toHaveAttribute('href', '/estoque');
  });

  it('renderiza alerta de preços desatualizados quando precosDesatualizados > 0', () => {
    render(<Alerts estoqueBaixo={0} precosDesatualizados={2} />);
    expect(screen.getByText('2 preços desatualizados (>7 dias)')).toBeInTheDocument();
    expect(screen.getByText('Execute o scraper ou atualize manualmente nas Configurações')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configurações/i })).toHaveAttribute('href', '/configuracoes');
  });

  it('renderiza ambos alertas quando ambos > 0', () => {
    render(<Alerts estoqueBaixo={5} precosDesatualizados={3} />);
    expect(screen.getByText('5 produtos com estoque baixo')).toBeInTheDocument();
    expect(screen.getByText('3 preços desatualizados (>7 dias)')).toBeInTheDocument();
  });

  it('usa singular "produto" quando estoqueBaixo === 1', () => {
    render(<Alerts estoqueBaixo={1} precosDesatualizados={0} />);
    expect(screen.getByText('1 produto com estoque baixo')).toBeInTheDocument();
  });

  it('usa singular "preço" quando precosDesatualizados === 1', () => {
    render(<Alerts estoqueBaixo={0} precosDesatualizados={1} />);
    expect(screen.getByText('1 preço desatualizado (>7 dias)')).toBeInTheDocument();
  });

  it('aplica variant warning no alerta de estoque baixo', () => {
    render(<Alerts estoqueBaixo={2} precosDesatualizados={0} />);
    const alertLink = screen.getByRole('link', { name: /estoque/i });
    expect(alertLink).toHaveClass('border-amber-500');
    const iconContainer = alertLink.querySelector('div.w-10');
    expect(iconContainer).toHaveClass('bg-amber/10');
    expect(iconContainer).toHaveClass('text-amber-700');
  });

  it('aplica variant error no alerta de preços desatualizados', () => {
    render(<Alerts estoqueBaixo={0} precosDesatualizados={2} />);
    const alertLink = screen.getByRole('link', { name: /configurações/i });
    expect(alertLink).toHaveClass('border-red-500');
    const iconContainer = alertLink.querySelector('div.w-10');
    expect(iconContainer).toHaveClass('bg-red/10');
    expect(iconContainer).toHaveClass('text-red-700');
  });

  it('renderiza ícones SVG corretos para cada variant', () => {
    const { container } = render(<Alerts estoqueBaixo={1} precosDesatualizados={1} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('exibe título "Próximas Ações Sugeridas" quando há alertas', () => {
    render(<Alerts estoqueBaixo={1} precosDesatualizados={0} />);
    expect(screen.getByText('Próximas Ações Sugeridas')).toBeInTheDocument();
  });

  it('não exibe título "Próximas Ações Sugeridas" quando não há alertas', () => {
    render(<Alerts estoqueBaixo={0} precosDesatualizados={0} />);
    expect(screen.queryByText('Próximas Ações Sugeridas')).not.toBeInTheDocument();
  });
});