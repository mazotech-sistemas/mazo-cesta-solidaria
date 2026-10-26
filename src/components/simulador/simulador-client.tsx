'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Produto, Json } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

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
  const [numeroCestas, setNumeroCestas] = useState(1);
  const { push: toast } = useToast();

  const itensSelecionados = useMemo<ItemSelecionado[]>(() => {
    return produtos
      .filter(p => selecionados[p.id]?.checked)
      .map(p => ({
        produto_id: p.id,
        nome: p.nome,
        preco: p.preco_atual,
        quantidade: selecionados[p.id]?.quantidade ?? 1,
        qtd_por_cesta: p.qtd_por_cesta,
      }));
  }, [produtos, selecionados]);

  const total = useMemo(() => {
    return itensSelecionados.reduce((acc, item) => acc + item.preco * item.quantidade * numeroCestas, 0);
  }, [itensSelecionados, numeroCestas]);

  const handleToggle = useCallback((produtoId: number) => {
    setSelecionados(prev => {
      const current = prev[produtoId];
      if (current?.checked) {
        const next = { ...prev };
        delete next[produtoId];
        return next;
      }
      return { ...prev, [produtoId]: { checked: true, quantidade: 1 } };
    });
  }, []);

  const handleQuantidade = useCallback((produtoId: number, value: number) => {
    const clamped = Math.max(0, Math.round(value));
    setSelecionados(prev => ({
      ...prev,
      [produtoId]: { ...prev[produtoId], quantidade: clamped },
    }));
  }, []);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <span className="text-sm text-steel">
              {produtos.length} produto{produtos.length !== 1 ? 's' : ''} disponível{produtos.length !== 1 ? 'is' : ''}
            </span>
            {selecionadosCount > 0 && (
              <Badge variant="primary">{selecionadosCount} selecionado{selecionadosCount !== 1 ? 's' : ''}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={selecionarTodos}>
              Selecionar todos
            </Button>
            <Button variant="ghost" size="sm" onClick={limparSelecao}>
              Limpar
            </Button>
          </div>
        </div>

        {error && (
          <Badge variant="error" className="w-full justify-center" role="alert">
            {error}
          </Badge>
        )}

        {saved && (
          <Card className="p-4 bg-mint/10 border-none" role="alert">
            <CardContent className="flex items-center gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mint flex-shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <p className="font-semibold text-navy">Compra salva com sucesso!</p>
                <p className="text-sm text-steel">{numeroCestas} cesta{numeroCestas > 1 ? 's' : ''} — Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          {produtos.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="font-semibold text-navy mb-1">Nenhum produto disponível</h3>
              <p className="text-steel">Cadastre produtos no estoque para começar a simular</p>
            </div>
          ) : (
            <CardContent className="p-0 divide-y divide-[var(--line)]">
              {produtos.map((p) => {
                const sel = selecionados[p.id];
                const checked = sel?.checked ?? false;
                const qtd = sel?.quantidade ?? 1;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-4 px-4 py-3 transition-colors ${checked ? 'bg-royal/5' : 'hover:bg-ice/50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(p.id)}
                      className="w-5 h-5 text-royal border-[var(--line)] rounded focus:ring-2 focus:ring-royal/20 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-navy truncate">{p.nome}</p>
                      {p.marca && <p className="text-xs text-steel">{p.marca} {p.unidade ? '— ' + p.unidade : ''}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-navy">R$ {p.preco_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {checked && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          value={qtd}
                          onChange={(e) => handleQuantidade(p.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center text-sm"
                        />
                        <span className="text-xs text-steel whitespace-nowrap">
                          x{numeroCestas} = R$ {(p.preco_atual * qtd * numeroCestas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="p-6 sticky top-6 space-y-5">
          <CardContent className="space-y-5">
            <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy">Resumo</h2>

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
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {itensSelecionados.map(item => (
                    <div key={item.produto_id} className="flex justify-between text-sm">
                      <span className="text-steel truncate flex-1">
                        {item.nome} ({item.quantidade}x)
                      </span>
                      <span className="font-medium text-navy ml-2 flex-shrink-0">
                        R$ {(item.preco * item.quantidade * numeroCestas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--line)] pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-steel">Itens</span>
                    <span className="text-navy">{itensSelecionados.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-steel">Cestas</span>
                    <span className="text-navy">{numeroCestas}</span>
                  </div>
                  <div className="flex justify-between text-lg font-extrabold text-navy pt-2">
                    <span>Total</span>
                    <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                <svg className="w-12 h-12 mx-auto mb-3 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-steel text-sm">Selecione produtos para ver o resumo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}