'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

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
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      ),
      iconClass: 'text-white/55',
      href: '/estoque',
    },
    {
      label: 'Estoque Baixo',
      value: stats.estoqueBaixo.toLocaleString('pt-BR'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
      iconClass: 'text-mint',
      badge: stats.estoqueBaixo > 0 ? `${stats.estoqueBaixo} itens` : null,
      badgeVariant: 'warning' as const,
      href: '/estoque',
    },
    {
      label: 'Preços Desatualizados',
      value: stats.precosDesatualizados.toLocaleString('pt-BR'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      iconClass: 'text-warn-line',
      badge: stats.precosDesatualizados > 0 ? `${stats.precosDesatualizados} itens` : null,
      badgeVariant: 'error' as const,
      href: '/configuracoes',
    },
    {
      label: 'Compras Este Mês',
      value: stats.comprasMes.toLocaleString('pt-BR'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      ),
      iconClass: 'text-white/55',
      href: '/historico',
    },
  ];

  return (
    <section className="stat-panel" aria-label="Resumo do projeto">
      <div className="relative z-10 grid grid-cols-2 gap-x-5 gap-y-6 px-5 py-6 sm:px-6 lg:grid-cols-4 lg:gap-0 lg:px-7 lg:py-7">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group stat-card px-0 lg:px-6 lg:first:pl-0 lg:last:pr-0 lg:border-l lg:border-white/10 lg:first:border-l-0"
          >
            <span className="flex items-center gap-2">
              <span className={card.iconClass}>{card.icon}</span>
              <span className="stat-label">{card.label}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="stat-value text-paper">{card.value}</span>
              {card.badge && (
                <Badge variant={card.badgeVariant} className="mt-1">
                  {card.badge}
                </Badge>
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
