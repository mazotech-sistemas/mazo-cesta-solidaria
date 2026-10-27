'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Produto } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useToast, ToastProvider } from '@/components/ui/toast';

interface EstoqueClientProps {
  produtos: Produto[];
  isAdmin: boolean;
}

interface NovoProduto {
  nome: string;
  marca: string;
  unidade: string;
  qtd_por_cesta: string;
  estoque_atual: string;
  preco_atual: string;
  token_tenda: string;
  termo_busca: string;
}

const produtoVazio: NovoProduto = {
  nome: '',
  marca: '',
  unidade: '',
  qtd_por_cesta: '1',
  estoque_atual: '0',
  preco_atual: '',
  token_tenda: '',
  termo_busca: '',
};

function EstoqueInner({ produtos, isAdmin }: EstoqueClientProps) {
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [novo, setNovo] = useState<NovoProduto>(produtoVazio);
  const [criando, setCriando] = useState(false);
  const [buscandoToken, setBuscandoToken] = useState(false);
  const [formError, setFormError] = useState('');

  const { push: toast } = useToast();

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

  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const camposObrigatorios: Array<{ campo: keyof NovoProduto; rotulo: string }> = [
      { campo: 'nome', rotulo: 'nome' },
      { campo: 'qtd_por_cesta', rotulo: 'quantidade por cesta' },
      { campo: 'estoque_atual', rotulo: 'estoque atual' },
    ];
    const faltando = camposObrigatorios.find(({ campo }) => !novo[campo].trim());
    if (faltando) {
      setFormError('Preencha ' + faltando.rotulo);
      return;
    }

    setCriando(true);
    const supabase = createClient();
    const { error } = await supabase.from('produtos').insert({
      nome: novo.nome.trim(),
      marca: novo.marca.trim() || null,
      unidade: novo.unidade.trim() || null,
      qtd_por_cesta: parseFloat(novo.qtd_por_cesta) || 1,
      estoque_atual: parseFloat(novo.estoque_atual) || 0,
      preco_atual: novo.preco_atual.trim() ? parseFloat(novo.preco_atual) : 0,
      token_tenda: novo.token_tenda.trim() || null,
      termo_busca: novo.termo_busca.trim() || null,
      ativo: true,
    });

    if (error) {
      setFormError(error.message);
      toast('Erro ao criar produto: ' + error.message, 'error');
      setCriando(false);
      return;
    }

    toast('Produto criado com sucesso', 'success');
    setNovo(produtoVazio);
    setShowNovoProduto(false);
    setCriando(false);
    window.location.reload();
  };

  const setCampo = (campo: keyof NovoProduto) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setNovo(prev => ({ ...prev, [campo]: e.target.value }));
  };

  const handleBuscarToken = async () => {
    const termo = novo.termo_busca.trim();
    if (!termo) {
      setFormError('Digite um termo de busca primeiro');
      return;
    }

    setBuscandoToken(true);
    setFormError('');

    try {
      const res = await fetch('/api/scraper/buscar-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termo_busca: termo }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Erro ao buscar token');
        return;
      }

      setNovo(prev => ({
        ...prev,
        token_tenda: data.token || '',
        termo_busca: termo,
      }));
      toast('Token encontrado: ' + data.token, 'success');
    } catch (err) {
      setFormError('Erro de conexão: ' + (err instanceof Error ? err.message : 'erro'));
    } finally {
      setBuscandoToken(false);
    }
  };

  const abrirNovoProduto = () => {
    setNovo(produtoVazio);
    setFormError('');
    setShowNovoProduto(true);
  };

  const handleExportarCSV = () => {
    const headers = ['nome','marca','unidade','qtd_por_cesta','estoqueAtual','precoAtual','tokenTenda','termoBusca'];
    const linhas = produtos.map(p => [
      p.nome,
      p.marca || '',
      p.unidade || '',
      p.qtd_por_cesta,
      p.estoque_atual,
      p.preco_atual,
      p.token_tenda || '',
      p.termo_busca || '',
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...linhas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produtos-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado', 'success');
  };

  const handleImportarCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = async (evt) => {
      const texto = evt.target?.result as string;
      const linhas = texto.split('\n').filter(l => l.trim());
      if (linhas.length < 2) {
        toast('CSV vazio ou inválido', 'error');
        return;
      }

      // Pular cabeçalho
      const dados = linhas.slice(1).map(l => {
        const vals = l.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        return {
          nome: vals[0] || '',
          marca: vals[1] || null,
          unidade: vals[2] || null,
          qtd_por_cesta: parseFloat(vals[3]) || 1,
          estoque_atual: parseFloat(vals[4]) || 0,
          preco_atual: parseFloat(vals[5]) || 0,
          token_tenda: vals[6] || null,
          termo_busca: vals[7] || null,
        };
      }).filter(d => d.nome);

      if (dados.length === 0) {
        toast('Nenhum produto válido no CSV', 'error');
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.from('produtos').insert(dados);

      if (error) {
        toast('Erro ao importar: ' + error.message, 'error');
        return;
      }

      toast(`${dados.length} produto(s) importado(s)`, 'success');
      window.location.reload();
    };
    leitor.readAsText(arquivo);
    // Limpar o input para permitir reimportar o mesmo arquivo
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            type="text"
            placeholder="Buscar por nome ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar por nome ou marca"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
            className="w-4 h-4 text-royal border-[var(--line)] rounded focus:ring-2 focus:ring-royal/20"
          />
          <span className="text-sm text-steel">Só estoque baixo (≤2)</span>
        </label>
        {isAdmin && (
          <>
            <Button size="sm" onClick={abrirNovoProduto}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Produto
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExportarCSV}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportarCSV}
              />
              <span className="inline-flex items-center text-sm font-medium text-royal hover:text-royal/80 px-3 py-1.5 rounded-md border border-royal/30 hover:bg-royal/5">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar CSV
              </span>
            </label>
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="font-semibold text-navy mb-1">
                {produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
              </h3>
              <p className="text-steel">
                {produtos.length === 0
                  ? (isAdmin
                    ? 'Adicione seu primeiro produto para começar a gerenciar o estoque'
                    : 'Fale com o administrador para cadastrar produtos')
                  : 'Tente ajustar os filtros de busca'}
              </p>
              {produtos.length === 0 && isAdmin && (
                <button type="button" onClick={abrirNovoProduto} className="btn-primary mt-4">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Novo Produto
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead align="right">Estoque</TableHead>
                    <TableHead align="right">Preço Atual</TableHead>
                    <TableHead align="right">Qtd/Cesta</TableHead>
                    <TableHead align="center">Última Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-navy">{p.nome}</span>
                          {p.estoque_atual <= 2 && (
                            <Badge variant="warning">Baixo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-steel">{p.marca || '-'}</TableCell>
                      <TableCell align="right" className="font-medium">
                        <span className={p.estoque_atual <= 2 ? 'text-red-700 font-bold' : 'text-navy'}>
                          {p.estoque_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell align="right" className="font-medium text-navy">
                        R$ {p.preco_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">{p.qtd_por_cesta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="center" className="text-steel text-xs">
                        {p.ultima_atualizacao_preco
                          ? new Date(p.ultima_atualizacao_preco).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-steel/60">
        Mostrando {filtered.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
      </p>

      <Dialog
        open={showNovoProduto}
        onClose={() => setShowNovoProduto(false)}
        title="Novo Produto"
        description="Cadastre um novo produto no estoque"
        size="md"
      >
        <form onSubmit={handleCriarProduto} className="space-y-4">
          {formError && (
            <div className="badge badge-error w-full justify-center" role="alert">
              {formError}
            </div>
          )}
          <div>
            <Label htmlFor="prod-nome" required>Nome</Label>
            <Input
              id="prod-nome"
              type="text"
              value={novo.nome}
              onChange={setCampo('nome')}
              placeholder="Ex: Arroz 5kg"
              required
              disabled={criando}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="prod-marca">Marca</Label>
              <Input
                id="prod-marca"
                type="text"
                value={novo.marca}
                onChange={setCampo('marca')}
                placeholder="Ex: Tio João"
                disabled={criando}
              />
            </div>
            <div>
              <Label htmlFor="prod-unidade">Unidade</Label>
              <Input
                id="prod-unidade"
                type="text"
                value={novo.unidade}
                onChange={setCampo('unidade')}
                placeholder="Ex: kg, ml, un"
                disabled={criando}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="prod-estoque" required>Estoque Atual</Label>
              <Input
                id="prod-estoque"
                type="number"
                min={0}
                step="0.01"
                value={novo.estoque_atual}
                onChange={setCampo('estoque_atual')}
                required
                disabled={criando}
              />
            </div>
            <div>
              <Label htmlFor="prod-preco">Preço (R$)</Label>
              <Input
                id="prod-preco"
                type="number"
                min={0}
                step="0.01"
                value={novo.preco_atual}
                onChange={setCampo('preco_atual')}
                disabled={criando}
                placeholder="Opcional — scraper preenche depois"
              />
              <p className="text-xs text-steel mt-1">Deixe em branco se o scraper Tenda deve buscar o preço</p>
            </div>
            <div>
              <Label htmlFor="prod-qtd" required>Qtd/Cesta</Label>
              <Input
                id="prod-qtd"
                type="number"
                min={0}
                step="0.01"
                value={novo.qtd_por_cesta}
                onChange={setCampo('qtd_por_cesta')}
                required
                disabled={criando}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="prod-token">Token Tenda</Label>
              <Input
                id="prod-token"
                type="text"
                value={novo.token_tenda}
                onChange={setCampo('token_tenda')}
                placeholder="Usado pelo scraper de preços"
                disabled={criando}
              />
            </div>
            <div>
              <Label htmlFor="prod-termo">Termo de Busca</Label>
              <Input
                id="prod-termo"
                type="text"
                value={novo.termo_busca}
                onChange={setCampo('termo_busca')}
                placeholder="Termo usado no scraper"
                disabled={criando}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleBuscarToken}
                disabled={criando || buscandoToken || !novo.termo_busca.trim()}
                className="w-full"
              >
                {buscandoToken ? 'Buscando...' : 'Buscar Token'}
              </Button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowNovoProduto(false)}
              disabled={criando}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={criando}>
              Criar Produto
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function EstoqueClient(props: EstoqueClientProps) {
  return (
    <ToastProvider>
      <EstoqueInner {...props} />
    </ToastProvider>
  );
}
