'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Compra, Profile } from '@/types/database';

interface HistoricoClientProps {
  compras: (Compra & { profiles?: Profile | null })[];
  isAdmin: boolean;
  userId: string;
}

interface CompraExpandida extends Compra {
  profiles?: Profile | null;
  itens_exibicao: Array<{
    nome: string;
    preco_unitario: number;
    quantidade: number;
    subtotal: number;
  }>;
}

export default function HistoricoClient({ compras, isAdmin, userId }: HistoricoClientProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [search, setSearch] = useState('');

  const handleExpand = useCallback((id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta compra? Esta acao nao pode ser desfeita.')) {
      return;
    }

    setDeleting(id);
    const supabase = createClient();

    const { error } = await supabase.from('compras').delete().eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
      setDeleting(null);
      return;
    }

    setDeleting(null);
  };

  const filtradas = compras
    .filter(c => {
      if (filterDateStart && c.criado_em < filterDateStart) return false;
      if (filterDateEnd && c.criado_em > filterDateEnd + 'T23:59:59') return false;
      if (search) {
        const searchLower = search.toLowerCase();
        const itensMatch = (c.itens as any[])?.some(i =>
          i.nome?.toLowerCase().includes(searchLower)
        );
        if (!itensMatch && !c.profiles?.nome?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      return true;
    })
    .map(c => {
      const itens = (c.itens as any[]) || [];
      return {
        ...c,
        itens_exibicao: itens.map(i => ({
          nome: i.nome || 'Produto',
          preco_unitario: i.preco_unitario || i.preco || 0,
          quantidade: i.quantidade || 0,
          subtotal: i.subtotal || (i.preco_unitario || i.preco || 0) * (i.quantidade || 0),
        })),
      };
    }) as CompraExpandida[];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap flex-1">
          <input
            type="text"
            placeholder="Buscar por produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input sm:w-64"
          />
          <input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            className="input sm:w-40"
            title="Data inicial"
          />
          <span className="text-steel self-center">ate</span>
          <input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            className="input sm:w-40"
            title="Data final"
          />
        </div>
        <span className="text-sm text-steel">
          {filtradas.length} de {compras.length} compra{compras.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-navy mb-1">Nenhuma compra encontrada</h3>
          <p className="text-steel">
            {compras.length === 0
              ? 'Ainda nao ha compras registradas. Va ao Simulador para criar a primeira.'
              : 'Tente ajustar os filtros de busca.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--line)]">
            {filtradas.map((compra) => {
              const isExpanded = expanded[compra.id];
              const podeExcluir = isAdmin && compra.criado_por !== userId;
              const podeExcluirPropria = isAdmin || compra.criado_por === userId;

              return (
                <div key={compra.id} className="p-4 hover:bg-ice/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <button
                        onClick={() => handleExpand(compra.id)}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-royal/10 text-royal flex-shrink-0 transition-colors hover:bg-royal/20"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={isExpanded ? 'rotate-180' : ''}
                          style={{ transition: 'transform 150ms' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-navy">
                            {compra.numero_cestas} cesta{compra.numero_cestas > 1 ? 's' : ''}
                          </p>
                          <span className="badge badge-secondary">
                            {new Date(compra.criado_em).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isAdmin && (
                            <span className={`badge ${compra.profiles?.is_admin ? 'badge-primary' : 'badge-secondary'}`}>
                              {compra.profiles?.nome || 'Usuario'}
                            </span>
                          )}
                        </div>
                        <p className="text-steel text-sm">
                          {compra.itens_exibicao.length} item{compra.itens_exibicao.length !== 1 ? 's' : ''} —{' '}
                          <span className="font-semibold text-navy">
                            R$ {compra.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </p>
                      </div>
                    </div>

                    {podeExcluirPropria && (
                      <button
                        onClick={() => handleDelete(compra.id)}
                        disabled={deleting === compra.id}
                        className="btn-ghost text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting === compra.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    )}
                  </div>

                  {isExpanded && compra.itens_exibicao.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--line)]">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {compra.itens_exibicao.map((item, idx) => (
                          <div key={idx} className="p-3 bg-ice/50 rounded-xl">
                            <p className="font-medium text-navy text-sm truncate">{item.nome}</p>
                            <div className="flex items-center justify-between text-xs text-steel mt-1">
                              <span>{item.quantidade}x R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <span className="font-medium text-navy">
                                R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}