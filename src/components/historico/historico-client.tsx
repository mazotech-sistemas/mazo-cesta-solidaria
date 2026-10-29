'use client';

import React, { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Compra, Profile, PrecoHistorico, Produto } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { SearchIcon, HistoryIcon, CalendarIcon, TrendingUpIcon, LineChartIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';

export interface HistoricoClientProps {
  compras: (Compra & { profiles?: Profile | null })[];
  isAdmin: boolean;
  userId: string;
  precos: PrecoHistorico[];
  produtos: Produto[];
}

type OrdemCompra = 'recentes' | 'antigas' | 'maior' | 'menor';

interface CompraExpandida {
  id: number;
  numero_cestas: number;
  total: number;
  criado_em: string;
  criado_por: string;
  valor_familia: number;
  profiles?: Profile | null;
  itens_exibicao: Array<{
    nome: string;
    preco_unitario: number;
    quantidade: number;
    subtotal: number;
  }>;
}

interface ItemCompra {
  nome?: string;
  preco_unitario?: number;
  preco?: number;
  quantidade?: number;
  subtotal?: number;
}

function itensDe(c: Compra): ItemCompra[] {
  const bruto = c.itens;
  if (!Array.isArray(bruto)) return [];
  // `Json` do Supabase é recursivo e não recebe index signature, então
  // separamos a filtragem (que devolve `Json`) do cast local para `ItemCompra`.
  const objetos = bruto.filter((i) => i !== null && typeof i === 'object' && !Array.isArray(i));
  return objetos as unknown as ItemCompra[];
}

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

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Gráfico SVG inline de linha: um eixo, pontos, polilinhado e tooltip simples. */
function GraficoLinha({
  valores,
  rotulos,
  cor = '#0052FA',
  altura = 220,
  sufixo = 'R$',
  alturaMinimaTexto = 11,
}: {
  valores: number[];
  rotulos: string[];
  cor?: string;
  altura?: number;
  sufixo?: string;
  alturaMinimaTexto?: number;
}) {
  if (valores.length === 0) {
    return (
      <p className="text-[13px] text-steel py-8 text-center">Sem dados suficientes para o gráfico.</p>
    );
  }

  const largura = 600;
  const margem = 36;
  const maxV = Math.max(...valores, 1);
  const minV = Math.min(...valores, 0);
  const range = maxV - minV || 1;

  const passoX = (largura - margem * 2) / Math.max(valores.length - 1, 1);
  const pontoY = (v: number) =>
    margem + (1 - (v - minV) / range) * (altura - margem * 2);

  const pontos = valores.map((v, i) => [margem + i * passoX, pontoY(v)] as const);

  const linha = pontos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${linha} L ${pontos[pontos.length - 1][0]} ${altura - margem} L ${margem} ${altura - margem} Z`;

  const passoRotulos = Math.max(1, Math.ceil(rotulos.length / 6));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Evolução com ${valores.length} ponto(s)`}
      >
        <line
          x1={margem}
          y1={altura - margem}
          x2={largura - margem}
          y2={altura - margem}
          stroke="rgba(2,29,68,.14)"
          strokeWidth="1"
        />
        <path d={area} fill={cor} fillOpacity="0.08" />
        <path d={linha} fill="none" stroke={cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3.5" fill={cor} />
            <title>
              {rotulos[i]} · {sufixo} {fmtBRL(valores[i])}
            </title>
          </g>
        ))}
        {rotulos.map((r, i) =>
          i % passoRotulos === 0 ? (
            <text
              key={`l-${i}`}
              x={margem + i * passoX}
              y={altura - 10}
              textAnchor="middle"
              fontSize={alturaMinimaTexto}
              fill="#4573A7"
            >
              {r}
            </text>
          ) : null
        )}
        <text x={margem} y={16} fontSize={alturaMinimaTexto} fill="#4573A7">
          {sufixo} {fmtBRL(maxV)}
        </text>
        <text x={margem} y={altura - margem - 6} fontSize={alturaMinimaTexto} fill="#4573A7">
          {sufixo} {fmtBRL(minV)}
        </text>
      </svg>
    </div>
  );
}

export default function HistoricoClient({ compras, isAdmin, userId, precos, produtos }: HistoricoClientProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [search, setSearch] = useState('');
  const [ordem, setOrdem] = useState<OrdemCompra>('recentes');
  const [graficoAberto, setGraficoAberto] = useState(false);
  const [prodPrecoId, setProdPrecoId] = useState<number | null>(null);
  const router = useRouter();
  const { push: toast } = useToast();

  const mapProdutos = useMemo(
    () => new Map(produtos.map((p) => [p.id, p] as const)),
    [produtos]
  );

  const handleExpand = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const limparFiltros = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setSearch('');
    setOrdem('recentes');
  };

  const handleDelete = async (id: number) => {
    const confirmando = window.confirm('Excluir esta compra? Esta ação não pode ser desfeita.');
    if (!confirmando) return;

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

  const preparadas: CompraExpandida[] = useMemo(() => {
    return compras
      .filter(c => {
        if (filterDateStart && c.criado_em < filterDateStart) return false;
        if (filterDateEnd && c.criado_em > filterDateEnd + 'T23:59:59') return false;
        if (search) {
          const s = search.toLowerCase();
          const itens = itensDe(c);
          const itensMatch = itens.some(i => i.nome?.toLowerCase().includes(s));
          const perfil = c.profiles?.nome?.toLowerCase().includes(s);
          if (!itensMatch && !perfil) return false;
        }
        return true;
      })
      .map(c => {
        const itens = itensDe(c);
        const valorFamilia =
          c.numero_cestas > 0 ? c.total / c.numero_cestas : 0;
        return {
          ...c,
          valor_familia: valorFamilia,
          itens_exibicao: itens.map(i => ({
            nome: i.nome || 'Produto',
            preco_unitario: i.preco_unitario || i.preco || 0,
            quantidade: i.quantidade || 0,
            subtotal: i.subtotal || (i.preco_unitario || i.preco || 0) * (i.quantidade || 0),
          })),
        };
      })
      .sort((a, b) => {
        switch (ordem) {
          case 'recentes':
            return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
          case 'antigas':
            return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
          case 'maior':
            return b.total - a.total;
          case 'menor':
            return a.total - b.total;
        }
      });
  }, [compras, filterDateStart, filterDateEnd, search, ordem]);

  // ===== Gráficos de evolução (somente quando há 2+ compras filtradas) =====
  const evolucao = useMemo(() => {
    if (preparadas.length < 2) return null;
    const ordenadas = [...preparadas].sort(
      (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    );
    const rotulos = ordenadas.map((c) => formatarDia(c.criado_em));
    return {
      total: { valores: ordenadas.map((c) => c.total), rotulos },
      familia: { valores: ordenadas.map((c) => c.valor_familia), rotulos },
    };
  }, [preparadas]);

  // ===== Evolução de preço por produto =====
  const produtosComPreco = useMemo(() => {
    const ids = new Set(precos.map((p) => p.produto_id));
    return produtos.filter((p) => ids.has(p.id));
  }, [produtos, precos]);

  const precoProduto = useMemo(() => {
    if (prodPrecoId === null) return null;
    const serie = precos
      .filter((p) => p.produto_id === prodPrecoId)
      .sort((a, b) => a.dia.localeCompare(b.dia));
    if (serie.length === 0) return null;
    const rotulos = serie.map((p) => p.dia);
    return {
      nome: mapProdutos.get(prodPrecoId)?.nome ?? `ID ${prodPrecoId}`,
      valores: serie.map((p) => p.preco),
      rotulos,
      regiao: serie[0].region_id,
    };
  }, [prodPrecoId, precos, mapProdutos]);

  const totalFiltrado = preparadas.reduce((acc, c) => acc + c.total, 0);
  const mediaFila =
    preparadas.length > 0 ? totalFiltrado / preparadas.length : 0;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="panel flex flex-col gap-3 p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0 flex-wrap">
          <div className="relative sm:w-64 shrink-0">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel/70"
            />
            <Input
              type="text"
              placeholder="Buscar produto..."
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
                className="border-0 bg-transparent px-0 py-1 text-[12.5px] sm:text-[13px]"
                aria-label="Data inicial"
              />
            </div>
            <span className="text-steel-strong text-xs">até</span>
            <div className="w-[132px] sm:w-[122px]">
              <Input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="border-0 bg-transparent px-0 py-1 text-[12.5px] sm:text-[13px]"
                aria-label="Data final"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-ordem" className="text-[13px] text-steel font-medium whitespace-nowrap">Ordenar</label>
            <select
              id="filtro-ordem"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as OrdemCompra)}
              className="h-8 rounded-lg border border-[var(--line)] bg-paper px-2 text-[13px] text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigas">Mais antigas</option>
              <option value="maior">Maior valor</option>
              <option value="menor">Menor valor</option>
            </select>
          </div>
        </div>
        <span className="shrink-0 text-[12.5px] text-steel tabular-nums whitespace-nowrap xl:border-l xl:border-[var(--line)] xl:pl-3">
          {preparadas.length} registro{preparadas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Métricas agregadas */}
      {preparadas.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="panel p-3">
            <p className="text-[11px] uppercase tracking-wider text-steel font-semibold">Total no período</p>
            <p className="text-[20px] font-extrabold tracking-[-0.02em] text-navy tabular-nums mt-1">
              R$ {fmtBRL(totalFiltrado)}
            </p>
          </div>
          <div className="panel p-3">
            <p className="text-[11px] uppercase tracking-wider text-steel font-semibold">Média por compra</p>
            <p className="text-[20px] font-extrabold tracking-[-0.02em] text-navy tabular-nums mt-1">
              R$ {fmtBRL(mediaFila)}
            </p>
          </div>
          <div className="panel p-3">
            <p className="text-[11px] uppercase tracking-wider text-steel font-semibold">Cestas no período</p>
            <p className="text-[20px] font-extrabold tracking-[-0.02em] text-navy tabular-nums mt-1">
              {preparadas.reduce((a, c) => a + c.numero_cestas, 0)}
            </p>
          </div>
        </div>
      )}

      {/* Gráficos de evolução */}
      {evolucao && (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <LineChartIcon size={17} className="text-royal" />
              <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-navy">Evolução das compras</h3>
            </div>
            <Badge variant="secondary">{preparadas.length} registros</Badge>
          </div>
          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
            <div>
              <p className="text-[13px] text-steel mb-2 flex items-center gap-1.5">
                <TrendingUpIcon size={13} className="text-royal" />
                Valor total por compra
              </p>
              <GraficoLinha valores={evolucao.total.valores} rotulos={evolucao.total.rotulos} cor="#0052FA" />
            </div>
            <div>
              <p className="text-[13px] text-steel mb-2 flex items-center gap-1.5">
                <TrendingUpIcon size={13} className="text-mint" />
                Valor por família (R$ / cesta)
              </p>
              <GraficoLinha valores={evolucao.familia.valores} rotulos={evolucao.familia.rotulos} cor="#00846e" />
            </div>
          </div>
        </div>
      )}

      {/* Evolução de preço por produto */}
      {produtosComPreco.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <LineChartIcon size={17} className="text-royal" />
              <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-navy">Evolução de preços</h3>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <label htmlFor="prod-preco" className="text-[13px] text-steel font-medium shrink-0">Produto</label>
              <select
                id="prod-preco"
                value={prodPrecoId ?? ''}
                onChange={(e) => setProdPrecoId(e.target.value ? Number(e.target.value) : null)}
                className="max-w-[260px] flex-1 h-8 rounded-lg border border-[var(--line)] bg-paper px-2 text-[13px] text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              >
                <option value="">Selecione…</option>
                {produtosComPreco.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-5">
            {precoProduto ? (
              <>
                <p className="text-[13px] text-steel mb-3">
                  {precoProduto.nome} · região {precoProduto.regiao} · {precoProduto.valores.length} leitura{precoProduto.valores.length !== 1 ? 's' : ''}
                </p>
                <GraficoLinha
                  valores={precoProduto.valores}
                  rotulos={precoProduto.rotulos}
                  cor="#00846e"
                  altura={220}
                />
              </>
            ) : (
              <p className="text-[13px] text-steel text-center py-6">
                {produtosComPreco.length === 0
                  ? 'Nenhum histórico de preço ainda. Execute o scraper na página Configurações.'
                  : 'Selecione um produto para ver a curva de preço.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lista de compras */}
      {preparadas.length === 0 ? (
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
          {preparadas.map((compra) => {
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
                        {isAdmin && compra.profiles && (
                          <span className="ml-2 text-[11.5px] text-steel font-normal">
                            por {compra.profiles.nome}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-steel tabular-nums sm:mt-0 sm:text-[12px]">
                        <span>
                          {formatarDia(compra.criado_em)}
                          <span className="hidden sm:inline"> {formatarHora(compra.criado_em)}</span>
                        </span>
                        <span>
                          {compra.itens_exibicao.length} item{compra.itens_exibicao.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-steel-strong">
                          R$ {fmtBRL(compra.valor_familia)}/família
                        </span>
                      </p>
                    </div>
                    <span className="text-[15px] font-extrabold text-navy tabular-nums whitespace-nowrap">
                      R$ {fmtBRL(compra.total)}
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
                              {item.quantidade}x R$ {fmtBRL(item.preco_unitario)}
                            </span>
                            <span className="font-semibold text-navy">
                              R$ {fmtBRL(item.subtotal)}
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
