'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Produto, ProdutoUpdate } from '@/types/database';
import { Input } from '@/components/ui/input';
import { SearchIcon, PlusIcon, DownloadIcon, UploadIcon, EditIcon, TrashIcon, AlertTriangleIcon } from '@/components/icons';
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
  precoStaleDias?: number;
}

type StatusPreco = 'todos' | 'automatico' | 'manual' | 'desatualizado';

function precoDesatualizado(produto: Produto, dias: number): boolean {
  if (!produto.ultima_atualizacao_preco) return true;
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const ultimo = new Date(produto.ultima_atualizacao_preco);
  return ultimo < limite;
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

function EstoqueInner({ produtos, isAdmin, precoStaleDias = 7 }: EstoqueClientProps) {
  const [lista, setLista] = useState<Produto[]>(produtos);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [statusPreco, setStatusPreco] = useState<StatusPreco>('todos');
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
  const [acoesSobreConteudo, setAcoesSobreConteudo] = useState(false);

  const tabelaRef = useRef<HTMLDivElement>(null);

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
      if (statusPreco === 'automatico' && !p.token_tenda) {
        return false;
      }
      if (statusPreco === 'manual' && p.token_tenda) {
        return false;
      }
      if (statusPreco === 'desatualizado' && (!p.token_tenda || !precoDesatualizado(p, precoStaleDias))) {
        return false;
      }
      return true;
    });

  const limparFiltros = () => {
    setSearch('');
    setShowLowStock(false);
    setStatusPreco('todos');
  };

  const desatualizados = lista.filter(
    (p) => p.token_tenda && precoDesatualizado(p, precoStaleDias)
  ).length;

  // A coluna de ações fica presa à direita enquanto a tabela rola. O hairline
  // dela só aparece quando a tabela realmente transborda; se ela cabe inteira
  // na tela, a coluna não cobre nada e o traço viraria borda solta.
  useEffect(() => {
    // O scroll horizontal mora no wrapper que o Table cria em volta do <table>.
    const scroller = tabelaRef.current?.querySelector('table')?.parentElement;
    if (!(scroller instanceof HTMLElement)) return;

    const avaliar = () =>
      setAcoesSobreConteudo(scroller.scrollWidth > scroller.clientWidth + 1);

    avaliar();
    const observador =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(avaliar);
    observador?.observe(scroller);
    window.addEventListener('resize', avaliar);

    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', avaliar);
    };
  }, [filtered.length, isAdmin]);

  // Sombra inset: em border-collapse o Chrome não pinta sombra externa de célula,
  // então o traço fica no 1px de dentro da borda esquerda.
  const sombraAcoes = acoesSobreConteudo ? ' shadow-[inset_1px_0_0_0_var(--line)]' : '';
  // Fundos opacos porque a célula presa passa por cima do conteúdo: o hover é
  // ice/40 achatado sobre paper (#F8F8F8) e o cabeçalho é ice/70 achatado (#F2F2F2).
  // A coluna de ações fica presa à direita com `sticky right-0`. O
  // `min-width` maior garante que a tabela sempre transborde em telas estreitas,
  // forçando o overflow necessário para o sticky colar. 140px cobre os dois
  // botões (editar + excluir) com padding e garante que o sticky cole.
  // `pointer-events-auto` evita que o elementFromPoint falhe por cima de overlays.
  const celulaAcoes =
    'sticky right-0 z-20 min-w-[140px] whitespace-nowrap bg-paper px-2 align-middle group-hover:bg-[#F8F8F8] pointer-events-auto' + sombraAcoes;
  const cabecalhoAcoes =
    'sticky right-0 z-30 min-w-[140px] whitespace-nowrap bg-[#F2F2F2] px-2 text-right' + sombraAcoes;

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
    // Mesma ordem e nomes das colunas que o seed/produtos_initial.csv usa,
    // para o arquivo exportado ser reimportável pelo próprio app.
    const headers = ['id','nome','marca','unidade','qtd_por_cesta','estoque_atual','preco_atual','token_tenda','url_tenda','termo_busca','ativo'];
    const linhas = lista.map(p => [
      p.id,
      p.nome,
      p.marca || '',
      p.unidade || '',
      p.qtd_por_cesta,
      p.estoque_atual,
      p.preco_atual,
      p.token_tenda || '',
      p.url_tenda || '',
      p.termo_busca || '',
      p.ativo,
    ].map((v, i) => (i === 0 || i === 10 ? String(v) : `"${String(v ?? '').replace(/"/g,'""')}"`)).join(','));
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

      // Detecta o cabeçalho para mapear as colunas. Aceita o layout do
      // seed (id, nome, marca, unidade, qtd_por_cesta, estoque_atual,
      // preco_atual, token_tenda, url_tenda, termo_busca, ativo) e o layout
      // mais enxuto de exportação (nome, marca, unidade, qtd, estoque,
      // preco, token, termo). Id é ignorado de propósito: a sequence gera.
      const cab = linhas[0]
        .split(',')
        .map((v) => v.trim().toLowerCase().replace(/^"|"$/g, ''));
      const idx = (nome: string) => cab.indexOf(nome);
      const col = {
        nome: idx('nome'),
        marca: idx('marca'),
        unidade: idx('unidade'),
        qtd: idx('qtd_por_cesta') >= 0 ? idx('qtd_por_cesta') : idx('qtd_por_cesta'),
        estoque: idx('estoque_atual'),
        preco: idx('preco_atual'),
        token: idx('token_tenda'),
        url: idx('url_tenda'),
        termo: idx('termo_busca'),
      };
      const valor = (vals: string[], i: number) => (i >= 0 && i < vals.length ? vals[i] : '');

      const dados = linhas.slice(1).map(l => {
        const vals = l.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        const nome = valor(vals, col.nome);
        return {
          nome,
          marca: valor(vals, col.marca) || null,
          unidade: valor(vals, col.unidade) || null,
          qtd_por_cesta: parseFloat(valor(vals, col.qtd)) || 1,
          estoque_atual: parseFloat(valor(vals, col.estoque)) || 0,
          preco_atual: parseFloat(valor(vals, col.preco)) || 0,
          token_tenda: valor(vals, col.token) || null,
          url_tenda: valor(vals, col.url) || null,
          termo_busca: valor(vals, col.termo) || null,
        };
      }).filter(d => d.nome);

      if (dados.length === 0) {
        toast('Nenhum produto válido no CSV', 'error');
        return;
      }

      const supabase = createClient();

      // 1) Linha por linha: permite falhar sem poluir o banco e conta
      //    novos e já existentes para a mensagem final.
      let novos = 0;
      let existentes = 0;
      const erros: string[] = [];
      for (const p of dados) {
        const { data: jaExiste } = await supabase
          .from('produtos')
          .select('id')
          .eq('nome', p.nome)
          .limit(1);
        if (jaExiste && jaExiste.length > 0) {
          existentes += 1;
          continue;
        }
        const { error } = await supabase.from('produtos').insert(p);
        if (error) {
          erros.push(`${p.nome}: ${error.message}`);
        } else {
          novos += 1;
        }
      }

      if (erros.length > 0) {
        toast(`Importação parcial: ${novos} novo(s), ${existentes} já existiam, ${erros.length} falha(s). Primeira: ${erros[0]}`, 'error');
        window.location.reload();
        return;
      }

      toast(`${novos} produto(s) importado(s), ${existentes} já existente(s)`, 'success');
      window.location.reload();
    };
    leitor.readAsText(arquivo);
    // Limpar o input para permitir reimportar o mesmo arquivo
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: busca e filtro à esquerda, ações à direita */}
      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center min-w-0 min-[1360px]:w-auto min-[1360px]:flex-1">
          <div className="relative flex-1 min-w-0">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel/70"
            />
            <Input
              type="text"
              placeholder="Buscar produto..."
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
              className="w-4 h-4 rounded border-[var(--line)] text-royal"
            />
            <span className="text-[13px] text-steel font-medium">Só estoque baixo (≤2)</span>
          </label>

          <div className="flex items-center gap-2">
            <label htmlFor="filtro-status-preco" className="text-[13px] text-steel font-medium whitespace-nowrap">Preço</label>
            <select
              id="filtro-status-preco"
              value={statusPreco}
              onChange={(e) => setStatusPreco(e.target.value as StatusPreco)}
              className="h-8 rounded-lg border border-[var(--line)] bg-paper px-2 text-[13px] text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            >
              <option value="todos">todos</option>
              <option value="automatico">automático</option>
              <option value="manual">manual</option>
              <option value="desatualizado">desatualizado</option>
            </select>
          </div>
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

        <p className="text-[12px] text-steel tabular-nums whitespace-nowrap sm:ml-auto min-[1360px]:ml-0 min-[1360px]:border-l min-[1360px]:border-[var(--line)] min-[1360px]:pl-3">
          Mostrando {filtered.length} de {lista.length} produto{lista.length !== 1 ? 's' : ''}
          {desatualizados > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-warn font-medium">
              <AlertTriangleIcon size={12} />
              {desatualizados} desatualizado{desatualizados !== 1 ? 's' : ''}
            </span>
          )}
        </p>
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
            <div ref={tabelaRef}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="hidden md:table-cell">Marca</TableHead>
                    <TableHead align="right">Estoque</TableHead>
                    <TableHead align="right" className="hidden sm:table-cell">Preço Atual</TableHead>
                    <TableHead align="right" className="hidden xl:table-cell">Qtd/Cesta</TableHead>
                    <TableHead align="right" className="hidden min-[1360px]:table-cell">Última Atualização</TableHead>
                    {isAdmin && (
                      <TableHead align="right" className={cabecalhoAcoes}>Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="group">
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
                      <TableCell align="right" className="hidden min-[1360px]:table-cell text-steel text-[13px] tabular-nums">
                        {p.ultima_atualizacao_preco
                          ? new Date(p.ultima_atualizacao_preco).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right" className={celulaAcoes}>
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
                              <EditIcon size={16} />
                            </Button>
                            <Button
                              type="button"
                              variant="danger-ghost"
                              size="sm"
                              className="px-2"
                              data-testid={`excluir-produto-${p.id}`}
                              aria-label={`Excluir ${p.nome}`}
                              onClick={() => abrirExclusao(p)}
                            >
                              <TrashIcon size={16} />
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
                placeholder="Opcional"
              />
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
          <p className="text-xs text-steel">Deixe o preço em branco para o scraper da Tenda buscar o valor.</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="prod-token">Token Tenda</Label>
              <Input
                id="prod-token"
                type="text"
                value={novo.token_tenda}
                onChange={setCampo('token_tenda')}
                placeholder="Opcional"
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
                placeholder="Ex: arroz"
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
                placeholder="Opcional"
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
          <p className="text-xs text-steel">Deixe o preço em branco para o scraper da Tenda buscar o valor.</p>
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
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-danger-line bg-danger-soft px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-danger">
                <AlertTriangleIcon size={17} />
              </span>
              <p className="text-[13px] leading-relaxed text-ink">
                Tem certeza que quer excluir{' '}
                <strong className="font-semibold text-navy">{excluindo.nome}</strong>? Ele deixa de
                aparecer no estoque e nas cestas.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setExcluindo(null)}
                disabled={excluindoEmAndamento}
                autoFocus
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
