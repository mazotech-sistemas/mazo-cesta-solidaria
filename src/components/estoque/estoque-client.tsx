'use client';

import React, { useState } from 'react';
import { Produto } from '@/types/database';

interface EstoqueClientProps {
  produtos: Produto[];
  isAdmin: boolean;
}

export default function EstoqueClient({ produtos, isAdmin }: EstoqueClientProps) {
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  const filtered = produtos
    .filter((p) => {
      if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !(p.marca || '').toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (showLowStock && p.estoque_atual > 2) {
        return false;
      }
      return true;
    });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Buscar por nome ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="w-4 h-4 text-royal border-[var(--line)] rounded focus:ring-2 focus:ring-royal/20"
          />
          <span className="text-sm text-steel">Só estoque baixo (&le;2)</span>
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="font-semibold text-navy mb-1">Nenhum produto encontrado</h3>
            <p className="text-steel">Tente ajustar os filtros ou {isAdmin ? 'adicionar um novo produto' : 'verificar mais tarde'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left">Produto</th>
                  <th className="text-left">Marca</th>
                  <th className="text-right">Estoque</th>
                  <th className="text-right">Preço Atual</th>
                  <th className="text-right">Qtd/Cesta</th>
                  <th className="text-center">Última Atualização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filtered.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-navy">{p.nome}</span>
                        {p.estoque_atual <= 2 && (
                          <span className="badge badge-warning text-xs">Baixo</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-steel">{p.marca || '-'}</td>
                    <td className="table-cell text-right font-medium">
                      <span className={p.estoque_atual <= 2 ? 'text-red-700 font-bold' : 'text-navy'}>
                        {p.estoque_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="table-cell text-right font-medium text-navy">
                      R$ {p.preco_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="table-cell text-right">{p.qtd_por_cesta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="table-cell text-center text-steel text-xs">
                      {p.ultima_atualizacao_preco
                        ? new Date(p.ultima_atualizacao_preco).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-steel/60">
        Mostrando {filtered.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}