'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Compra, Profile } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { SearchIcon, HistoryIcon, CalendarIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';

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

/* Fuso fixo: sem isso o servidor (UTC) e o navegador (BRT) divergem na virada do dia. */
const FUSO = 'America/Sao_Paulo';

function formatarDia(valor: string) {
  return new Date(valor).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: FUSO,
  });
}

function formatarHora(valor: string) {
  return new Date(valor).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  });
}

export default function HistoricoClient({ compras, isAdmin, userId }: HistoricoClientProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { push: toast } = useToast();

  const handleExpand = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const limparFiltros = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setSearch('');
  };

  const handleDelete = async (id: number) => {
    const confirmando = window.confirm('Excluir esta compra? Esta ação não pode ser desfeita.');
    if (!confirmando) {
      return;
    }

    setDeleting(id);
    const supabase = createClient();

    const { error } = await supabase.from('compras').delete().eq('id', id);

    if (error) {
      toast('Erro ao excluir: ' + error.message, 'error');
      setDeleting(null);
      return;
    }

    setDeleting(null);
    toast('Compra excluída', 'success');
    router.refresh();
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
      <div className="panel flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
          <div className="relative sm:w-64">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel/70"
            />
            <Input
              type="text"
              placeholder="Buscar por produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar por produto"
              className="pl-10"
            />
          </div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-ice/60 px-2 py-1">
            <CalendarIcon size={15} className="hidden text-steel/80 flex-shrink-0 ml-1 sm:block" />
            <div className="w-[132px] sm:w-[122px]">
              <Input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="border-0 bg-transparent px-0 py-1 text-[12.5px] sm:text-[13px] focus:ring-0"
                aria-label="Data inicial"
              />
            </div>
            <span className="text-steel-strong text-xs">até</span>
            <div className="w-[132px] sm:w-[122px]">
              <Input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="border-0 bg-transparent px-0 py-1 text-[12.5px] sm:text-[13px] focus:ring-0"
                aria-label="Data final"
              />
            </div>
          </div>
        </div>
        <span className="text-[12.5px] text-steel tabular-nums whitespace-nowrap">
          {filtradas.length} de {compras.length} compra{compras.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <span className="inline-flex w-12 h-12 rounded-[14px] bg-royal/10 text-royal items-center justify-center mb-4">
            <HistoryIcon size={22} />
          </span>
          <h3 className="font-semibold text-navy mb-1">Nenhuma compra encontrada</h3>
          <p className="text-steel mb-5 text-sm">
            {compras.length === 0
              ? 'Ainda não há compras registradas. Vá ao Simulador para criar a primeira.'
              : 'Tente ajustar os filtros de busca.'}
          </p>
          {compras.length === 0 ? (
            <Link href="/simulador" className="btn-primary">
              Ir para Simulador
            </Link>
          ) : (
            <button type="button" onClick={limparFiltros} className="btn-secondary">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden divide-y divide-[var(--line)]">
          {filtradas.map((compra) => {
            const isExpanded = expanded[compra.id];
            const podeExcluir = isAdmin || compra.criado_por === userId;

            return (
              <div key={compra.id} className={`transition-colors ${isExpanded ? 'bg-ice/30' : 'hover:bg-ice/40'}`}>
                <div className="flex items-start gap-3 px-4 py-3 sm:gap-4">
                  <button
                    onClick={() => handleExpand(compra.id)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-steel bg-paper border border-[var(--line)] flex-shrink-0 self-start transition-colors hover:text-navy hover:border-steel/40"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  <div className="flex flex-1 min-w-0 items-baseline justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-3">
                      <p className="font-semibold text-navy text-[14.5px] whitespace-nowrap">
                        {compra.numero_cestas} cesta{compra.numero_cestas > 1 ? 's' : ''}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-steel tabular-nums sm:mt-0 sm:text-[12px]">
                        <span>
                          {formatarDia(compra.criado_em)}
                          <span className="hidden sm:inline">
                            {' '}
                            {formatarHora(compra.criado_em)}
                          </span>
                        </span>
                        <span className="whitespace-nowrap">
                          {compra.itens_exibicao.length} item{compra.itens_exibicao.length !== 1 ? 's' : ''}
                        </span>
                        {isAdmin && compra.profiles && (
                          <span className="hidden whitespace-nowrap sm:inline">por {compra.profiles.nome}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[15px] font-extrabold text-navy tabular-nums whitespace-nowrap">
                      R$ {compra.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {podeExcluir && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(compra.id)}
                      disabled={deleting === compra.id}
                      className="flex-shrink-0 self-start"
                    >
                      {deleting === compra.id ? 'Excluindo...' : 'Excluir'}
                    </Button>
                  )}
                </div>

                {isExpanded && compra.itens_exibicao.length > 0 && (
                  <div className="px-4 pb-4 pl-14 sm:pl-16">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {compra.itens_exibicao.map((item, idx) => (
                        <div key={idx} className="rounded-xl bg-paper border border-[var(--line)] px-3 py-2">
                          <p className="font-medium text-navy text-[13px] truncate">{item.nome}</p>
                          <div className="flex items-center justify-between gap-2 text-[11.5px] text-steel mt-1 tabular-nums">
                            <span>
                              {item.quantidade}x R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="font-semibold text-navy">
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
      )}
    </div>
  );
}
