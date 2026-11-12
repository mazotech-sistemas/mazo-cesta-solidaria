'use client';

import React from 'react';
import Link from 'next/link';
import { PlusIcon, CalculatorIcon, HistoryIcon, SettingsIcon } from '@/components/icons';

interface QuickActionsProps {
  isAdmin: boolean;
}

const actions = [
  { label: 'Novo Produto', href: '/estoque', Icon: PlusIcon },
  { label: 'Simular Cesta', href: '/simulador', Icon: CalculatorIcon },
  { label: 'Ver Histórico', href: '/historico', Icon: HistoryIcon },
];

const adminActions = [
  { label: 'Configurações', href: '/configuracoes', Icon: SettingsIcon },
];

export default function QuickActions({ isAdmin }: QuickActionsProps) {
  const allActions = [...actions, ...(isAdmin ? adminActions : [])];

  return (
    <section>
      <h2 className="section-title mb-3">Ações Rápidas</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {allActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="block group rounded-[20px] border border-[var(--line)] bg-paper px-4 py-3.5 transition-colors hover:border-royal/40 hover:bg-royal/[0.02]"
          >
            <span className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-[12px] bg-royal/10 text-royal flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-royal/15">
                <action.Icon size={18} />
              </span>
              <span className="text-[13.5px] font-semibold text-navy leading-snug">{action.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
