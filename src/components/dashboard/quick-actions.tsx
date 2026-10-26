'use client';

import React from 'react';
import Link from 'next/link';

interface QuickActionsProps {
  isAdmin: boolean;
}

const actions = [
  { label: 'Novo Produto', href: '/estoque', icon: 'plus' },
  { label: 'Simular Cesta', href: '/simulador', icon: 'calculator' },
  { label: 'Ver Histórico', href: '/historico', icon: 'history' },
];

const adminActions = [
  { label: 'Configurações', href: '/configuracoes', icon: 'settings' },
];

export default function QuickActions({ isAdmin }: QuickActionsProps) {
  const allActions = [...actions, ...(isAdmin ? adminActions : [])];

  return (
    <section>
      <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy mb-4">Ações Rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="card p-4 flex flex-col items-center gap-3 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-royal/10 text-royal flex items-center justify-center">
              {getIcon(action.icon)}
            </div>
            <span className="font-medium text-navy text-sm">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function getIcon(name: string) {
  const icons: Record<string, React.ReactElement> = {
    plus: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    calculator: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <path d="M7 7h10M7 11h10M7 15h10M17 7v10" />
      </svg>
    ),
    history: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    settings: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  };
  return icons[name] || icons.plus;
}