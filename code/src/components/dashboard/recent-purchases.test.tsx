'use client';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecentPurchases from './recent-purchases';

// Mock do createClient do supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('RecentPurchases', () => {
  const mockUserId = 'user-123';
  const mockPurchases = [
    {
      id: 1,
      numero_cestas: 2,
      total: 150.75,
      criado_em: '2024-01-15T10:30:00Z',
    },
    {
      id: 2,
      numero_cestas: 1,
      total: 89.90,
      criado_em: '2024-01-10T14:20:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ limit: mockLimit });
  });

  it('exibe estado de loading inicialmente', () => {
    mockLimit.mockImplementation(() => new Promise(() => {})); // Promise que nunca resolve
    const { container } = render(<RecentPurchases userId={mockUserId} />);
    expect(screen.getByText('Últimas Compras')).toBeInTheDocument();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('exibe estado vazio quando não há compras', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    render(<RecentPurchases userId={mockUserId} />);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma compra registrada')).toBeInTheDocument();
    });
    expect(screen.getByText('Faça sua primeira simulação e salve no Simulador')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir para simulador/i })).toHaveAttribute('href', '/simulador');
  });

  it('exibe lista de compras quando há dados', async () => {
    mockLimit.mockResolvedValue({ data: mockPurchases, error: null });
    render(<RecentPurchases userId={mockUserId} />);
    await waitFor(() => {
      expect(screen.getByText('2 cestas')).toBeInTheDocument();
      expect(screen.getByText('1 cesta')).toBeInTheDocument();
    });
    expect(screen.getByText('R$ 150,75')).toBeInTheDocument();
    expect(screen.getByText('R$ 89,90')).toBeInTheDocument();
  });

  it('formata data em pt-BR com hora', async () => {
    mockLimit.mockResolvedValue({ data: mockPurchases, error: null });
    render(<RecentPurchases userId={mockUserId} />);
    await waitFor(() => {
      expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/10\/01\/2024/)).toBeInTheDocument();
    });
  });

  it('chama supabase com parâmetros corretos', async () => {
    mockLimit.mockResolvedValue({ data: mockPurchases, error: null });
    render(<RecentPurchases userId={mockUserId} />);
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('compras');
      expect(mockSelect).toHaveBeenCalledWith('id, numero_cestas, total, criado_em');
      expect(mockEq).toHaveBeenCalledWith('criado_por', mockUserId);
      expect(mockOrder).toHaveBeenCalledWith('criado_em', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(5);
    });
  });

  it('exibe ícone de cesta para cada compra', async () => {
    mockLimit.mockResolvedValue({ data: mockPurchases, error: null });
    const { container } = render(<RecentPurchases userId={mockUserId} />);
    await waitFor(() => {
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('formata valor total em moeda brasileira', async () => {
    mockLimit.mockResolvedValue({ data: [{ ...mockPurchases[0], total: 1234.5 }], error: null });
    render(<RecentPurchases userId={mockUserId} />);
    await waitFor(() => {
      expect(screen.getByText('R$ 1.234,50')).toBeInTheDocument();
    });
  });
});