'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Produto, Json } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { SearchIcon, CheckIcon, PackageIcon, BasketIcon } from '@/components/icons';

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
  const { push: toast } = useToast();

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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
      <div className="space-y-4 min-w-0">
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

          <div className="flex items-baseline justify-between gap-3 border-t border-[var(--line)] pt-2.5">
            <span className="text-[12.5px] text-steel tabular-nums">
              {produtos.length} produto{produtos.length !== 1 ? 's' : ''} disponível{produtos.length !== 1 ? 'is' : ''}
            </span>
            {selecionadosCount > 0 && (
              <Badge variant="primary">
                {selecionadosCount} selecionado{selecionadosCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <div className="badge badge-error w-full justify-center py-2" role="alert">
            {error}
          </div>
        )}

        {saved && (
          <div className="panel flex items-center gap-3 border-success-line bg-success-soft px-4 py-3" role="alert">
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

        <div className="panel overflow-hidden">
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
                    Nenhum produto encontrado para “{search}”.
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
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggle(p.id)}
                        className="w-[18px] h-[18px] rounded border-[var(--line)] text-royal focus:ring-2 focus:ring-royal/20 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-navy text-[14px] truncate">{p.nome}</p>
                        {p.marca && <p className="text-[12px] text-steel truncate">{p.marca} {p.unidade ? '- ' + p.unidade : ''}</p>}
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
                          <span className="text-[12px] text-steel/60 whitespace-nowrap hidden sm:block">—</span>
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

      <div className="min-w-0">
        <div className="panel p-5 lg:sticky lg:top-6 space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-navy">Resumo</h2>
            <span className="text-[12px] text-steel tabular-nums">
              {itensSelecionados.length} item{itensSelecionados.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div>
            <Label htmlFor="num-cestas">Número de cestas</Label>
            <Input
              id="num-cestas"
              type="number"
              min={1}
              max={100}
              value={numeroCestas}
              onChange={(e) => setNumeroCestas(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            />
          </div>

          {itensSelecionados.length > 0 ? (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin -mx-1 px-1">
                {itensSelecionados.map(item => (
                  <div key={item.produto_id} className="flex justify-between gap-2 text-[13px]">
                    <span className="text-steel truncate flex-1">
                      {item.nome} ({item.quantidade}x)
                    </span>
                    <span className="font-medium text-navy tabular-nums flex-shrink-0">
                      R$ {(item.preco * item.quantidade * numeroCestas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
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
                <div className="flex items-baseline justify-between pt-3 mt-1 border-t border-[var(--line)]">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-steel">Total</span>
                  <span className="text-[26px] font-extrabold tracking-[-0.03em] text-navy tabular-nums">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSalvar}
                disabled={saving}
                className="w-full py-3 text-base"
                loading={saving}
              >
                Salvar Compra
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <span className="inline-flex w-11 h-11 rounded-[13px] bg-ice text-steel/70 items-center justify-center mb-3">
                <BasketIcon size={20} />
              </span>
              <p className="text-steel text-[13px]">Selecione produtos para ver o resumo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
