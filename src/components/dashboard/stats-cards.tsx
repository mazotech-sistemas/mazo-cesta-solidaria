'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      ),
      iconBg: 'bg-royal/10 text-royal',
      href: '/estoque',
    },
    {
      label: 'Estoque Baixo',
      value: stats.estoqueBaixo.toLocaleString('pt-BR'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
      iconBg: 'bg-mint/10 text-mint',
      badge: stats.estoqueBaixo > 0 ? `${stats.estoqueBaixo} itens` : null,
      badgeVariant: 'warning' as const,
      href: '/estoque',
    },
    {
      label: 'Preços Desatualizados',
      value: stats.precosDesatualizados.toLocaleString('pt-BR'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      iconBg: 'bg-royal/10 text-royal',
      badge: stats.precosDesatualizados > 0 ? `${stats.precosDesatualizados} itens` : null,
      badgeVariant: 'error' as const,
      href: '/configuracoes',
    },
    {
      label: 'Compras Este Mês',
      value: stats.comprasMes.toLocaleString('pt-BR'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      ),
      iconBg: 'bg-royal/10 text-royal',
      href: '/historico',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="block">
          <Card className="p-5 flex items-start gap-4 transition-shadow hover:shadow-md">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
              {card.icon}
            </div>
            <CardContent className="flex-1 min-w-0">
              <div className="text-3xl font-extrabold tracking-[-0.02em] leading-tight text-navy">
                {card.value}
              </div>
              <div className="text-sm text-steel mt-1">{card.label}</div>
              {card.badge && (
                <Badge variant={card.badgeVariant} className="mt-2">
                  {card.badge}
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}