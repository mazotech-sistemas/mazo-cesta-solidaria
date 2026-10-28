'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Produto, ProdutoUpdate } from '@/types/database';
import { Input } from '@/components/ui/input';
import { SearchIcon, PlusIcon, DownloadIcon, UploadIcon } from '@/components/icons';
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

function validarProduto(form: NovoProduto): string | null {
  const camposObrigatorios: Array<{ campo: keyof NovoProduto; rotulo: string }> = [
    { campo: 'nome', rotulo: 'nome' },
    { campo: 'qtd_por_cesta', rotulo: 'quantidade por cesta' },
    { campo: 'estoque_atual', rotulo: 'estoque atual' },
  ];
  const faltando = camposObrigatorios.find(({ campo }) => !form[campo].trim());
  return faltando ? 'Preencha ' + faltando.rotulo : null;
}

function produtoParaFormulario(produto: Produto): NovoProduto {
  return {
    nome: produto.nome,
    marca: produto.marca ?? '',
    unidade: produto.unidade ?? '',
    qtd_por_cesta: String(produto.qtd_por_cesta),
    estoque_atual: String(produto.estoque_atual),
    preco_atual: String(produto.preco_atual),
    token_tenda: produto.token_tenda ?? '',
    termo_busca: produto.termo_busca ?? '',
  };
}

function EditarIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ExcluirIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

function EstoqueInner({ produtos, isAdmin }: EstoqueClientProps) {
  const [lista, setLista] = useState<Produto[]>(produtos);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [novo, setNovo] = useState<NovoProduto>(produtoVazio);
  const [criando, setCriando] = useState(false);
  const [buscandoToken, setBuscandoToken] = useState(false);
  const [formError, setFormError] = useState('');
  const [editando, setEditando] = useState<Produto | null>(null);
  const [edicao, setEdicao] = useState<NovoProduto>(produtoVazio);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');
  const [excluindo, setExcluindo] = useState<Produto | null>(null);
  const [excluindoEmAndamento, setExcluindoEmAndamento] = useState(false);

  const { push: toast } = useToast();

  useEffect(() => {
    setLista(produtos);
  }, [produtos]);

  const filtered = lista
    .filter((p) => {
      if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !(p.marca || '').toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (showLowStock && p.estoque_atual > 2) {
        return false;
      }
      return true;
    });

  const limparFiltros = () => {
    setSearch('');
    setShowLowStock(false);
  };

  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const erro = validarProduto(novo);
    if (erro) {
      setFormError(erro);
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

  const abrirEdicao = (produto: Produto) => {
    setEditando(produto);
    setEdicao(produtoParaFormulario(produto));
    setErroEdicao('');
  };

  const fecharEdicao = () => {
    setEditando(null);
    setErroEdicao('');
  };

  const setCampoEdicao = (campo: keyof NovoProduto) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEdicao(prev => ({ ...prev, [campo]: e.target.value }));
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setErroEdicao('');

    const erro = validarProduto(edicao);
    if (erro) {
      setErroEdicao(erro);
      return;
    }

    const nome = edicao.nome.trim();
    const marca = edicao.marca.trim() || null;
    const unidade = edicao.unidade.trim() || null;
    const qtdPorCesta = parseFloat(edicao.qtd_por_cesta) || 1;
    const estoqueAtual = parseFloat(edicao.estoque_atual) || 0;
    const precoAtual = edicao.preco_atual.trim() ? parseFloat(edicao.preco_atual) : 0;
    const tokenTenda = edicao.token_tenda.trim() || null;
    const termoBusca = edicao.termo_busca.trim() || null;
    const precoMudou = precoAtual !== editando.preco_atual;
    const agora = new Date().toISOString();

    const payload: ProdutoUpdate = {
      nome,
      marca,
      unidade,
      qtd_por_cesta: qtdPorCesta,
      estoque_atual: estoqueAtual,
      preco_atual: precoAtual,
      token_tenda: tokenTenda,
      termo_busca: termoBusca,
      ...(precoMudou ? { ultima_atualizacao_preco: agora } : {}),
    };

    setSalvandoEdicao(true);
    const supabase = createClient();
    const { error } = await supabase.from('produtos').update(payload).eq('id', editando.id);

    if (error) {
      setErroEdicao(error.message);
      toast('Erro ao salvar produto: ' + error.message, 'error');
      setSalvandoEdicao(false);
      return;
    }

    const atualizado: Produto = {
      ...editando,
      nome,
      marca,
      unidade,
      qtd_por_cesta: qtdPorCesta,
      estoque_atual: estoqueAtual,
      preco_atual: precoAtual,
      token_tenda: tokenTenda,
      termo_busca: termoBusca,
      ultima_atualizacao_preco: precoMudou ? agora : editando.ultima_atualizacao_preco,
    };

    setLista(prev => prev.map(p => (p.id === atualizado.id ? atualizado : p)));
    toast('Produto atualizado com sucesso', 'success');
    setSalvandoEdicao(false);
    fecharEdicao();
  };

  const abrirExclusao = (produto: Produto) => {
    setExcluindo(produto);
  };

  const handleConfirmarExclusao = async () => {
    if (!excluindo) return;

    setExcluindoEmAndamento(true);
    const supabase = createClient();
    const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', excluindo.id);

    if (error) {
      toast('Erro ao excluir produto: ' + error.message, 'error');
      setExcluindoEmAndamento(false);
      return;
    }

    setLista(prev => prev.filter(p => p.id !== excluindo.id));
    toast('Produto excluído do estoque', 'success');
    setExcluindoEmAndamento(false);
    setExcluindo(null);
  };

  const handleExportarCSV = () => {
    const headers = ['nome','marca','unidade','qtd_por_cesta','estoqueAtual','precoAtual','tokenTenda','termoBusca'];
    const linhas = lista.map(p => [
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
      {/* Toolbar: busca e filtro à esquerda, ações à direita */}
      <div className="panel flex flex-col gap-3 p-3 xl:flex-row xl:items-center">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center min-w-0">
          <div className="relative flex-1 min-w-0">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel/70"
            />
            <Input
              type="text"
              placeholder="Buscar por nome ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar por nome ou marca"
              className="pl-10"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer sm:whitespace-nowrap rounded-xl px-2 py-1 -mx-2 hover:bg-ice/60 transition-colors">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--line)] text-royal focus:ring-2 focus:ring-royal/20"
            />
            <span className="text-[13px] text-steel font-medium">Só estoque baixo (≤2)</span>
          </label>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 sm:border-l sm:border-[var(--line)] sm:pl-3">
            <Button size="sm" onClick={abrirNovoProduto}>
              <PlusIcon size={15} />
              Novo Produto
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportarCSV}>
              <DownloadIcon size={15} />
              Exportar CSV
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportarCSV}
              />
              <span className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-navy bg-paper border border-[var(--line)] rounded-[20px] hover:bg-ice/60 transition-colors">
                <UploadIcon size={15} />
                Importar CSV
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="font-semibold text-navy mb-1">
                {lista.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
              </h3>
              <p className="text-steel">
                {lista.length === 0
                  ? (isAdmin
                    ? 'Adicione seu primeiro produto para começar a gerenciar o estoque'
                    : 'Fale com o administrador para cadastrar produtos')
                  : 'Tente ajustar os filtros de busca'}
              </p>
              {lista.length === 0 && isAdmin && (
                <button type="button" onClick={abrirNovoProduto} className="btn-primary mt-5">
                  <PlusIcon size={15} />
                  Novo Produto
                </button>
              )}
              {lista.length > 0 && (
                <button type="button" onClick={limparFiltros} className="btn-secondary mt-5">
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="hidden md:table-cell">Marca</TableHead>
                    <TableHead align="right">Estoque</TableHead>
                    <TableHead align="right" className="hidden sm:table-cell">Preço Atual</TableHead>
                    <TableHead align="right" className="hidden xl:table-cell">Qtd/Cesta</TableHead>
                    <TableHead align="right" className="hidden xl:table-cell">Última Atualização</TableHead>
                    {isAdmin && (
                      <TableHead align="right" className="w-[1%] whitespace-nowrap">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-navy truncate max-w-[180px] sm:max-w-[260px]" title={p.nome}>{p.nome}</span>
                          {p.estoque_atual <= 2 && (
                            <Badge variant="warning">Baixo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-steel text-[13px] md:table-cell">{p.marca || '-'}</TableCell>
                      <TableCell align="right" className="font-medium">
                        <span className={p.estoque_atual <= 2 ? 'text-danger font-bold' : 'text-navy'}>
                          {p.estoque_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell align="right" className="hidden font-medium text-navy sm:table-cell">
                        R$ {p.preco_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" className="hidden xl:table-cell text-steel">
                        {p.qtd_por_cesta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right" className="hidden xl:table-cell text-steel text-[13px] tabular-nums">
                        {p.ultima_atualizacao_preco
                          ? new Date(p.ultima_atualizacao_preco).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right" className="w-[1%] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              data-testid={`editar-produto-${p.id}`}
                              aria-label={`Editar ${p.nome}`}
                              onClick={() => abrirEdicao(p)}
                            >
                              <EditarIcon />
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              className="px-2"
                              data-testid={`excluir-produto-${p.id}`}
                              aria-label={`Excluir ${p.nome}`}
                              onClick={() => abrirExclusao(p)}
                            >
                              <ExcluirIcon />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

      <p className="text-[12px] text-steel tabular-nums">
        Mostrando {filtered.length} de {lista.length} produto{lista.length !== 1 ? 's' : ''}
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
                placeholder="Opcional - scraper preenche depois"
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

      <Dialog
        open={editando !== null}
        onClose={fecharEdicao}
        title="Editar Produto"
        description={editando ? `Atualize os dados de ${editando.nome}` : undefined}
        size="md"
      >
        <form onSubmit={handleSalvarEdicao} className="space-y-4" data-testid="form-editar-produto">
          {erroEdicao && (
            <div className="badge badge-error w-full justify-center" role="alert">
              {erroEdicao}
            </div>
          )}
          <div>
            <Label htmlFor="editar-prod-nome" required>Nome</Label>
            <Input
              id="editar-prod-nome"
              type="text"
              value={edicao.nome}
              onChange={setCampoEdicao('nome')}
              required
              disabled={salvandoEdicao}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="editar-prod-marca">Marca</Label>
              <Input
                id="editar-prod-marca"
                type="text"
                value={edicao.marca}
                onChange={setCampoEdicao('marca')}
                disabled={salvandoEdicao}
              />
            </div>
            <div>
              <Label htmlFor="editar-prod-unidade">Unidade</Label>
              <Input
                id="editar-prod-unidade"
                type="text"
                value={edicao.unidade}
                onChange={setCampoEdicao('unidade')}
                disabled={salvandoEdicao}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="editar-prod-estoque" required>Estoque Atual</Label>
              <Input
                id="editar-prod-estoque"
                type="number"
                min={0}
                step="0.01"
                value={edicao.estoque_atual}
                onChange={setCampoEdicao('estoque_atual')}
                required
                disabled={salvandoEdicao}
              />
            </div>
            <div>
              <Label htmlFor="editar-prod-preco">Preço (R$)</Label>
              <Input
                id="editar-prod-preco"
                type="number"
                min={0}
                step="0.01"
                value={edicao.preco_atual}
                onChange={setCampoEdicao('preco_atual')}
                disabled={salvandoEdicao}
              />
            </div>
            <div>
              <Label htmlFor="editar-prod-qtd" required>Qtd/Cesta</Label>
              <Input
                id="editar-prod-qtd"
                type="number"
                min={0}
                step="0.01"
                value={edicao.qtd_por_cesta}
                onChange={setCampoEdicao('qtd_por_cesta')}
                required
                disabled={salvandoEdicao}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="editar-prod-token">Token Tenda</Label>
              <Input
                id="editar-prod-token"
                type="text"
                value={edicao.token_tenda}
                onChange={setCampoEdicao('token_tenda')}
                disabled={salvandoEdicao}
              />
            </div>
            <div>
              <Label htmlFor="editar-prod-termo">Termo de Busca</Label>
              <Input
                id="editar-prod-termo"
                type="text"
                value={edicao.termo_busca}
                onChange={setCampoEdicao('termo_busca')}
                disabled={salvandoEdicao}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={fecharEdicao}
              disabled={salvandoEdicao}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={salvandoEdicao}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        title="Excluir produto"
        description="O produto sai do estoque, mas o histórico de compras continua no banco."
        size="sm"
      >
        {excluindo && (
          <div className="space-y-4">
            <p className="text-sm text-ink">
              Tem certeza que quer excluir{' '}
              <strong className="font-semibold text-navy">{excluindo.nome}</strong>? Ele deixa de
              aparecer no estoque e nas cestas.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setExcluindo(null)}
                disabled={excluindoEmAndamento}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                type="button"
                onClick={handleConfirmarExclusao}
                loading={excluindoEmAndamento}
                data-testid="confirmar-exclusao"
              >
                Excluir produto
              </Button>
            </div>
          </div>
        )}
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
