'use client';

import React, { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Produto, Json } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { SearchIcon, CheckIcon, PackageIcon, BasketIcon, DownloadIcon, AlertTriangleIcon } from '@/components/icons';
import {
  custoCesta,
  cestasPossiveisEstoque,
  cestasPossiveisOrcamento,
  faltandoComprar,
} from '@/lib/planner';
import { gerarPdfListaCompras } from '@/lib/lista-compras';

interface ItemSelecionado {
  produto_id: number;
  nome: string;
  preco: number;
  quantidade: number;
  qtd_por_cesta: number;
}

interface SimuladorClientProps {
  produtos: Produto[];
  userId: string;
}

export default function SimuladorClient({ produtos, userId }: SimuladorClientProps) {
  const [selecionados, setSelecionados] = useState<Record<number, { checked: boolean; quantidade: number }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [numeroCestas, setNumeroCestas] = useState(1);
  const [orcamento, setOrcamento] = useState(0);
  const { push: toast } = useToast();

  // === PLANNER (métricas calculadas sobre o estoque inteiro) ===
  const custoDaCesta = useMemo(() => custoCesta(produtos), [produtos]);
  const cestasEstoque = useMemo(() => cestasPossiveisEstoque(produtos), [produtos]);
  const cestasOrcamento = useMemo(
    () => cestasPossiveisOrcamento(produtos, orcamento),
    [produtos, orcamento]
  );
  const faltantes = useMemo(() => faltandoComprar(produtos, numeroCestas), [produtos, numeroCestas]);
  const totalFaltantes = useMemo(
    () => faltantes.reduce((acc, f) => acc + f.custo_reposicao, 0),
    [faltantes]
  );

  const itensSelecionados = (() => {
    return produtos
      .filter(p => selecionados[p.id]?.checked)
      .map(p => ({
        produto_id: p.id,
        nome: p.nome,
        preco: p.preco_atual,
        quantidade: selecionados[p.id]?.quantidade ?? 1,
        qtd_por_cesta: p.qtd_por_cesta,
      }));
  })();

  const total = itensSelecionados.reduce((acc, item) => acc + item.preco * item.quantidade * numeroCestas, 0);

  const handleToggle = (produtoId: number) => {
    setSelecionados(prev => {
      const current = prev[produtoId];
      if (current?.checked) {
        const next = { ...prev };
        delete next[produtoId];
        return next;
      }
      return { ...prev, [produtoId]: { checked: true, quantidade: 1 } };
    });
  };

  const handleQuantidade = (produtoId: number, value: number) => {
    const clamped = Math.max(0, Math.round(value));
    setSelecionados(prev => ({
      ...prev,
      [produtoId]: { ...prev[produtoId], quantidade: clamped },
    }));
  };

  const handleSalvar = async () => {
    if (itensSelecionados.length === 0) {
      setError('Selecione ao menos um produto');
      toast('Selecione ao menos um produto', 'error');
      return;
    }

    setSaving(true);
    setError('');

    const supabase = createClient();
    const compra = {
      numero_cestas: numeroCestas,
      itens: itensSelecionados.map(i => ({
        produto_id: i.produto_id,
        nome: i.nome,
        preco_unitario: i.preco,
        quantidade: i.quantidade,
        qtd_por_cesta: i.qtd_por_cesta,
        subtotal: i.preco * i.quantidade * numeroCestas,
      })) as Json,
      total,
      criado_por: userId,
    };

    const { error: err } = await supabase.from('compras').insert(compra);

    if (err) {
      setError(err.message);
      toast(err.message, 'error');
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setSelecionados({});
    setNumeroCestas(1);
    toast('Compra salva com sucesso!', 'success');

    setTimeout(() => setSaved(false), 4000);
  };

  const selecionarTodos = () => {
    const next: Record<number, { checked: boolean; quantidade: number }> = {};
    produtos.forEach(p => { next[p.id] = { checked: true, quantidade: 1 }; });
    setSelecionados(next);
  };

  const limparSelecao = () => setSelecionados({});

  const selecionadosCount = produtos.filter(p => selecionados[p.id]?.checked).length;

  const termo = search.trim().toLowerCase();
  const produtosVisiveis = termo
    ? produtos.filter(p => p.nome.toLowerCase().includes(termo) || (p.marca || '').toLowerCase().includes(termo))
    : produtos;

  // A data impressa é a do preço mais recente que está no estoque. Usar a
  // data de hoje mentiria quando o scraper não roda há dias.
  const dataPreco = useMemo(() => {
    const maisRecente = produtos.reduce<string | null>((acc, p) => {
      if (!p.ultima_atualizacao_preco) return acc;
      if (!acc) return p.ultima_atualizacao_preco;
      return new Date(p.ultima_atualizacao_preco) > new Date(acc) ? p.ultima_atualizacao_preco : acc;
    }, null);
    return maisRecente ? new Date(maisRecente).toLocaleDateString('pt-BR') : null;
  }, [produtos]);

  const handleBaixarPdf = () => {
    const html = gerarPdfListaCompras(faltantes, {
      total: totalFaltantes,
      cestas: numeroCestas,
      dataPreco,
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista_compras_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Lista de compras gerada', 'success');
  };

  return (
    <div className="space-y-5">
      {/* ===== PLANNER: métricas do estoque ===== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="panel p-4">
          <p className="text-[11px] uppercase tracking-wider text-steel font-semibold">Custo de 1 cesta</p>
          <p className="text-[26px] font-extrabold tracking-[-0.03em] text-navy tabular-nums mt-1">
            R$ {custoDaCesta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] uppercase tracking-wider text-steel font-semibold">Cestas com estoque</p>
          <p className="text-[26px] font-extrabold tracking-[-0.03em] text-navy tabular-nums mt-1">{cestasEstoque}</p>
          <p className="text-[11px] text-steel mt-0.5">mínimo de estoque ÷ qtd por cesta</p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] uppercase tracking-wider text-steel font-semibold">Cestas com orçamento</p>
          <p className="text-[26px] font-extrabold tracking-[-0.03em] text-navy tabular-nums mt-1">
            {orcamento > 0 ? cestasOrcamento : '—'}
          </p>
          <p className="text-[11px] text-steel mt-0.5">{orcamento > 0 ? `R$ ${orcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de orçamento` : 'defina o orçamento abaixo'}</p>
        </div>
        <div className="panel p-4">
          <p className="text-[11px] uppercase tracking-wider text-steel font-semibold">Faltantes p/ {numeroCestas} cesta{numeroCestas > 1 ? 's' : ''}</p>
          <p className="text-[26px] font-extrabold tracking-[-0.03em] text-navy tabular-nums mt-1">
            {totalFaltantes > 0 ? totalFaltantes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0'}
          </p>
          <p className="text-[11px] text-steel mt-0.5">custo de reposição</p>
        </div>
      </div>

      {/* ===== Parâmetros de simulação ===== */}
      <div className="panel p-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="num-cestas">Cestas desejadas</Label>
          <Input
            id="num-cestas"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Cestas desejadas"
            min={1}
            max={500}
            value={String(numeroCestas)}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setNumeroCestas(Number.isNaN(v) ? 1 : Math.max(1, Math.min(500, v)));
            }}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="orcamento">Orçamento disponível (R$)</Label>
          <Input
            id="orcamento"
            type="text"
            inputMode="decimal"
            aria-label="Orçamento disponível (R$)"
            min={0}
            step={10}
            value={orcamento === 0 ? '' : String(orcamento)}
            placeholder="0"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setOrcamento(Number.isNaN(v) ? 0 : Math.max(0, v));
            }}
          />
        </div>
        <Button variant="secondary" onClick={handleBaixarPdf} disabled={faltantes.length === 0}>
          <DownloadIcon size={15} />
          Lista de compras
        </Button>
      </div>

      {/* ===== Alertas do planner ===== */}
      {numeroCestas > cestasEstoque && (
        <div className="panel border-l-4 border-warn p-4 flex items-start gap-3" role="alert">
          <span className="text-warn flex-shrink-0"><AlertTriangleIcon size={18} /></span>
          <p className="text-[13px] text-navy">
            Estoque cobre apenas {cestasEstoque} cesta{cestasEstoque !== 1 ? 's' : ''} das {numeroCestas} solicitadas. Compre os itens faltantes abaixo ou reduza a quantidade.
          </p>
        </div>
      )}
      {orcamento > 0 && numeroCestas > cestasOrcamento && (
        <div className="panel border-l-4 border-warn p-4 flex items-start gap-3" role="alert">
          <span className="text-warn flex-shrink-0"><AlertTriangleIcon size={18} /></span>
          <p className="text-[13px] text-navy">
            O orçamento cobre apenas {cestasOrcamento} cesta{cestasOrcamento !== 1 ? 's' : ''} das {numeroCestas} solicitadas.
          </p>
        </div>
      )}
      {faltantes.length === 0 && numeroCestas > 0 && produtos.length > 0 && (
        <div className="panel border-l-4 border-success p-4 flex items-start gap-3" role="status">
          <span className="text-success flex-shrink-0"><CheckIcon size={18} /></span>
          <p className="text-[13px] text-navy">
            Estoque completo para {numeroCestas} cesta{numeroCestas > 1 ? 's' : ''}. Nada para comprar.
          </p>
        </div>
      )}

      {/* ===== Lista de faltantes ===== */}
      {faltantes.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--line)] flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-extrabold tracking-[-0.02em] text-navy">O que falta comprar</h3>
            <span className="text-[12px] text-steel tabular-nums">
              {faltantes.length} produto{faltantes.length !== 1 ? 's' : ''} · R$ {totalFaltantes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px_120px_110px] gap-x-4 px-4 py-2 bg-ice/40 border-b border-[var(--line)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-steel">Produto</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-steel text-right">Estoque</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-steel text-right">Comprar</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-steel text-right">Preço</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-steel text-right">Custo</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {faltantes.map((f) => (
              <div key={f.produto.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_120px_110px] gap-x-4 gap-y-1 px-4 py-3 text-[13px]">
                <div className="min-w-0">
                  <p className="font-medium text-navy truncate">{f.produto.nome} {f.produto.unidade ? `· ${f.produto.unidade}` : ''}</p>
                </div>
                <span className="tabular-nums text-steel sm:text-right">{f.produto.estoque_atual}</span>
                <span className="tabular-nums text-navy font-semibold sm:text-right">{f.faltando}</span>
                <span className="tabular-nums text-steel sm:text-right">R$ {f.produto.preco_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="tabular-nums text-navy font-medium sm:text-right">R$ {f.custo_reposicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Seleção de produtos para a cesta (fluxo original) ===== */}
      <div className="panel p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-[15px] font-extrabold tracking-[-0.02em] text-navy">Montar cesta com produtos específicos</h3>
          <div className="flex items-center gap-2">
            {selecionadosCount > 0 && (
              <Badge variant="primary">{selecionadosCount} selecionado{selecionadosCount !== 1 ? 's' : ''}</Badge>
            )}
            <Badge variant="secondary">{produtos.length} disponível{produtos.length !== 1 ? 'es' : ''}</Badge>
          </div>
        </div>

        <div className="panel flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-72 sm:flex-none">
              <SearchIcon
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel/70"
              />
              <Input
                type="search"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar produto"
                className="pl-10"
              />
            </div>
            <div className="flex flex-shrink-0 items-center gap-0.5 sm:ml-auto sm:border-l sm:border-[var(--line)] sm:pl-3">
              <Button variant="ghost" size="sm" onClick={selecionarTodos}>
                Selecionar todos
              </Button>
              <Button variant="ghost" size="sm" onClick={limparSelecao}>
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="badge badge-error w-full justify-center py-2 mt-3" role="alert">
            {error}
          </div>
        )}

        {saved && (
          <div className="panel flex items-center gap-3 border-success-line bg-success-soft px-4 py-3 mt-3" role="alert">
            <span className="text-success flex-shrink-0">
              <CheckIcon size={20} />
            </span>
            <div>
              <p className="font-semibold text-navy text-[14px]">Compra salva com sucesso!</p>
              <p className="text-sm text-steel">
                {numeroCestas} cesta{numeroCestas > 1 ? 's' : ''} - Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-hidden">
          {produtos.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span className="inline-flex w-12 h-12 rounded-[14px] bg-royal/10 text-royal items-center justify-center mb-4">
                <PackageIcon size={22} />
              </span>
              <h3 className="font-semibold text-navy mb-1">Nenhum produto disponível</h3>
              <p className="text-steel mb-5 text-sm">Cadastre produtos no estoque para começar a simular</p>
              <Link href="/estoque" className="btn-secondary">
                Ver Estoque
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 bg-ice/60 border-b border-[var(--line)]">
                <span className="w-[18px]" aria-hidden="true" />
                <span className="th flex-1 px-0">Produto</span>
                <span className="th w-24 px-0 text-right">Preço</span>
                <span className="th w-[168px] px-0 text-right">Quantidade</span>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {produtosVisiveis.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-steel">
                    Nenhum produto encontrado para "{search}".
                  </div>
                ) : produtosVisiveis.map((p) => {
                  const sel = selecionados[p.id];
                  const checked = sel?.checked ?? false;
                  const qtd = sel?.quantidade ?? 1;

                  return (
                    <div
                      key={p.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors sm:flex-nowrap sm:gap-4 sm:py-2.5 ${checked ? 'bg-royal/[0.04]' : 'hover:bg-ice/40'}`}
                    >
                      <input
                        id={`produto-${p.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggle(p.id)}
                        className="w-[18px] h-[18px] rounded border-[var(--line)] text-royal flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`produto-${p.id}`} className="block cursor-pointer">
                          <span className="block font-medium text-navy text-[14px] truncate">{p.nome}</span>
                          {p.marca && <span className="block text-[12px] text-steel truncate">{p.marca} {p.unidade ? '- ' + p.unidade : ''}</span>}
                        </label>
                      </div>
                      <div className="w-24 flex-shrink-0 text-right text-[13.5px] font-semibold text-navy tabular-nums">
                        R$ {p.preco_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`flex items-center justify-end gap-2 flex-shrink-0 ${
                          checked ? 'w-full sm:w-[168px]' : 'hidden sm:flex sm:w-[168px]'
                        }`}
                      >
                        {checked ? (
                          <>
                            <Input
                              type="number"
                              min={1}
                              value={qtd}
                              onChange={(e) => handleQuantidade(p.id, parseInt(e.target.value) || 0)}
                              aria-label={`Quantidade de ${p.nome}`}
                              className="w-14 px-2 py-1.5 text-center text-sm tabular-nums"
                            />
                            <span className="text-[12px] text-steel whitespace-nowrap tabular-nums">
                              x{numeroCestas} = R$ {(p.preco_atual * qtd * numeroCestas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </>
                        ) : (
                          <span className="text-[12px] text-steel whitespace-nowrap hidden sm:block">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== Resumo ===== */}
      <div className="panel p-5 space-y-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-navy">Resumo</h2>
          <span className="text-[12px] text-steel tabular-nums">
            {itensSelecionados.length} item{itensSelecionados.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="border-t border-[var(--line)] pt-4 space-y-2">
          <div className="flex justify-between text-[13px]">
            <span className="text-steel">Itens</span>
            <span className="text-navy tabular-nums">{itensSelecionados.length}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-steel">Cestas</span>
            <span className="text-navy tabular-nums">{numeroCestas}</span>
          </div>
          {faltantes.length > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-steel">Faltantes p/ estoque</span>
              <span className="text-warn tabular-nums font-medium">R$ {totalFaltantes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-3 mt-1 border-t border-[var(--line)]">
            <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-steel">Total da cesta</span>
            <span className="text-[26px] font-extrabold tracking-[-0.03em] text-navy tabular-nums">
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {selecionadosCount > 0 && (
          <Button
            onClick={handleSalvar}
            disabled={saving}
            className="w-full py-3 text-base"
            loading={saving}
          >
            Salvar Compra
          </Button>
        )}
      </div>
    </div>
  );
}
