'use client';

import React from 'react';

interface StatsCardsProps {
  stats: {
    totalProdutos: number;
    estoqueBaixo: number;
    precosDesatualizados: number;
    comprasMes: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Produtos Cadastrados',
      value: stats.totalProdutos.toLocaleString('pt-BR'),
      icon: 'box',
      variant: 'navy',
      href: '/estoque',
    },
    {
      label: 'Estoque Baixo',
      value: stats.estoqueBaixo.toLocaleString('pt-BR'),
      icon: 'alert',
      variant: 'mint',
      badge: stats.estoqueBaixo > 0 ? `${stats.estoqueBaixo} itens` : null,
      badgeVariant: 'warning' as const,
      href: '/estoque',
    },
    {
      label: 'Preços Desatualizados',
      value: stats.precosDesatualizados.toLocaleString('pt-BR'),
      icon: 'clock',
      variant: 'royal',
      badge: stats.precosDesatualizados > 0 ? `${stats.precosDesatualizados} itens` : null,
      badgeVariant: 'error' as const,
      href: '/configuracoes',
    },
    {
      label: 'Compras Este Mês',
      value: stats.comprasMes.toLocaleString('pt-BR'),
      icon: 'cart',
      variant: 'navy',
      href: '/historico',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`stat-card ${card.variant === 'navy' && index === 0 ? 'stat-card-navy' : ''}`}
        >
          <div className={`stat-icon ${card.variant === 'navy' ? 'stat-icon-navy' : card.variant === 'mint' ? 'stat-icon-mint' : 'stat-icon-royal'}`}>
            {getIcon(card.icon)}
          </div>
          <div className="stat-content flex-1 min-w-0">
            <div className={`stat-value ${card.variant === 'navy' ? 'text-paper' : 'text-navy'}`}>
              {card.value}
            </div>
            <div className={`stat-label ${card.variant === 'navy' ? 'text-paper/80' : ''}`}>
              {card.label}
            </div>
            {card.badge && (
              <span className={`badge ${card.badgeVariant === 'warning' ? 'badge-warning' : card.badgeVariant === 'error' ? 'badge-error' : 'badge-primary'} mt-2`}>
                {card.badge}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function getIcon(name: string) {
  const icons: Record<string, React.ReactElement> = {
    box: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="M3.3 7 12 12l8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
    alert: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    ),
    clock: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    cart: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  };
  return icons[name] || icons.box;
}