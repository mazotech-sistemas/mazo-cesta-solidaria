'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Regiao } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { PlusIcon, DownloadIcon, AlertTriangleIcon } from '@/components/icons';

interface ConfiguracoesClientProps {
  regioes: Regiao[];
  config: Record<string, string>;
  precosDesatualizados: number;
}

export default function ConfiguracoesClient({ regioes: regioesIniciais, config, precosDesatualizados }: ConfiguracoesClientProps) {
  const [regioes, setRegioes] = useState<Regiao[]>(regioesIniciais);
  const [editingRegiao, setEditingRegiao] = useState<Regiao | null>(null);
  const [savingRegiao, setSavingRegiao] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [tendaRegionId, setTendaRegionId] = useState(config['tenda_region_id'] || '');
  const [precoStaleDias, setPrecoStaleDias] = useState(config['preco_stale_dias'] || '7');
  const [showAddRegiao, setShowAddRegiao] = useState(false);
  const [newRegiao, setNewRegiao] = useState({ region_id: '', nome: '', cep_referencia: '' });
  const [rodandoScraper, setRodandoScraper] = useState(false);
  const [scraperResultado, setScraperResultado] = useState<string | null>(null);
  const { push: toast } = useToast();

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);

    const supabase = createClient();
    await supabase.from('config').upsert(
      { chave: 'tenda_region_id', valor: tendaRegionId },
      { onConflict: 'chave' }
    );
    await supabase.from('config').upsert(
      { chave: 'preco_stale_dias', valor: precoStaleDias },
      { onConflict: 'chave' }
    );

    setSavingConfig(false);
    toast('Configurações salvas com sucesso', 'success');
  };

  const handleExecutarScraper = async () => {
    setRodandoScraper(true);
    setScraperResultado(null);

    try {
      const res = await fetch('/api/scraper/run', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setScraperResultado('Erro: ' + (data.message || data.error));
        toast('Erro ao executar scraper', 'error');
        return;
      }

      const msg = `${data.atualizados} preço(s) atualizado(s) de ${data.produtos_verificados} produto(s) verificado(s)`;
      setScraperResultado(msg);
      toast('Scraper executado com sucesso', 'success');
    } catch (err) {
      setScraperResultado('Erro de conexão: ' + (err instanceof Error ? err.message : 'erro'));
      toast('Erro ao executar scraper', 'error');
    } finally {
      setRodandoScraper(false);
    }
  };

  const handleSaveRegiao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRegiao(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('regions')
      .upsert({
        region_id: editingRegiao ? editingRegiao.region_id : newRegiao.region_id,
        nome: editingRegiao ? editingRegiao.nome : newRegiao.nome,
        cep_referencia: editingRegiao ? editingRegiao.cep_referencia : newRegiao.cep_referencia,
        ativo: editingRegiao?.ativo ?? true,
      }, { onConflict: 'region_id' });

    if (error) {
      toast('Erro ao salvar região: ' + error.message, 'error');
      setSavingRegiao(false);
      return;
    }

    const { data: atualizadas } = await supabase
      .from('regions')
      .select('*')
      .order('nome');
    if (atualizadas) setRegioes(atualizadas);

    setSavingRegiao(false);
    setEditingRegiao(null);
    setShowAddRegiao(false);
    setNewRegiao({ region_id: '', nome: '', cep_referencia: '' });
    toast('Região salva com sucesso', 'success');
  };

  const handleToggleRegiaoAtivo = async (region_id: string, ativo: boolean) => {
    setRegioes(prev => prev.map(r => r.region_id === region_id ? { ...r, ativo: !ativo } : r));
    const supabase = createClient();
    const { error } = await supabase.from('regions').update({ ativo: !ativo }).eq('region_id', region_id);
    if (error) {
      toast('Erro ao atualizar região: ' + error.message, 'error');
      setRegioes(prev => prev.map(r => r.region_id === region_id ? { ...r, ativo } : r));
      return;
    }
    toast(ativo ? 'Região desativada' : 'Região ativada', 'success');
  };

  const handleDeleteRegiao = async (region_id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta região?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('regions').delete().eq('region_id', region_id);
    if (error) {
      toast('Erro ao excluir região: ' + error.message, 'error');
      return;
    }
    setRegioes(prev => prev.filter(r => r.region_id !== region_id));
    toast('Região excluída', 'success');
  };

  const handleExportCSV = () => {
    const csvContent = [
      'region_id,nome,ativo,cep_referencia',
      ...regioes.map(r => `${r.region_id},"${r.nome}",${r.ativo},"${r.cep_referencia || ''}"`),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cesta-solidaria-regioes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado', 'success');
  };

  const [gerandoBackup, setGerandoBackup] = useState(false);
  const handleGerarBackup = async () => {
    setGerandoBackup(true);
    try {
      // A API faz a leitura com a sessão do usuário, guarda uma cópia no
      // Storage e devolve o JSON. Se a rota não responder, caímos para a
      // coleta local das tabelas.
      let conteudo: string;
      try {
        const res = await fetch('/api/backup?baixar=1', { cache: 'no-store' });
        if (!res.ok) throw new Error('rota indisponível');
        conteudo = await res.text();
      } catch {
        const supabase = createClient();
        const [produtos, compras, precos, config] = await Promise.all([
          supabase.from('produtos').select('*').order('id'),
          supabase.from('compras').select('*').order('criado_em'),
          supabase.from('precos_historico').select('*').order('id'),
          supabase.from('config').select('*').order('chave'),
        ]);
        const tables = {
          gerado_em: new Date().toISOString(),
          produtos: produtos.data ?? [],
          compras: compras.data ?? [],
          precos_historico: precos.data ?? [],
          regions: regioes,
          config: config.data ?? [],
        };
        conteudo = JSON.stringify(tables, null, 2);
      }
      const blob = new Blob([conteudo], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `backup_cesta_solidaria_${ts}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const parse = JSON.parse(conteudo);
      const contagens = Object.fromEntries(
        Object.entries(parse).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length])
      );
      toast(`Backup gerado: ${JSON.stringify(contagens)}`, 'success');
    } catch (err) {
      toast('Erro ao gerar backup: ' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setGerandoBackup(false);
    }
  };

  return (
    <div className="space-y-5">
      {precosDesatualizados > 0 && (
        <div className="panel flex items-start gap-4 px-5 py-4 border-l-[3px] border-l-warn">
          <span className="w-10 h-10 rounded-[12px] bg-warn-soft text-warn flex items-center justify-center flex-shrink-0">
            <AlertTriangleIcon size={20} />
          </span>
          <div>
            <h3 className="font-semibold text-navy text-[14.5px]">
              {precosDesatualizados} preço{precosDesatualizados > 1 ? 's' : ''} desatualizado{precosDesatualizados > 1 ? 's' : ''}
            </h3>
            <p className="text-steel text-[13px] mt-0.5">
              Há mais de {precoStaleDias} dias sem atualização. Verifique o scraper ou atualize manualmente.
            </p>
          </div>
        </div>
      )}

      {/* Regiões */}
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)]">
          <div>
            <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-navy">Regiões</h3>
            <p className="text-[12.5px] text-steel mt-0.5">
              Região de preço do atacado usada pelo scraper
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddRegiao(true)}>
            <PlusIcon size={15} />
            Adicionar
          </Button>
        </div>

        {regioes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-navy font-semibold mb-1">Nenhuma região cadastrada</p>
            <p className="text-steel text-sm mb-4">Cadastre a primeira região para o scraper buscar preços</p>
            <Button size="sm" onClick={() => setShowAddRegiao(true)}>
              <PlusIcon size={15} />
              Adicionar região
            </Button>
          </div>
        ) : (
          <div>
            <div className="hidden sm:flex items-center gap-4 px-4 py-2.5 bg-ice/70 border-b border-[var(--line)]">
              <span className="th w-[180px] px-0">ID</span>
              <span className="th flex-1 px-0">Nome</span>
              <span className="th w-[130px] px-0">CEP</span>
              <span className="th w-[210px] px-0 text-right">Ações</span>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {regioes.map((r) => (
                <div
                  key={r.region_id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-ice/40 sm:flex-nowrap"
                >
                  <span className="hidden font-mono text-[12.5px] text-steel sm:block sm:w-[180px] truncate">{r.region_id}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={`font-medium text-[14px] truncate ${r.ativo ? 'text-navy' : 'text-steel line-through'}`}>
                      {r.nome}
                    </span>
                    {!r.ativo && <Badge variant="warning">Inativo</Badge>}
                  </span>
                  <span className="hidden text-[13px] text-steel tabular-nums sm:block sm:w-[130px]">{r.cep_referencia || '-'}</span>
                  <div className="flex w-full items-center justify-end gap-1 sm:w-[210px]">
                    <Button variant="ghost" size="sm" onClick={() => setEditingRegiao(r)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleRegiaoAtivo(r.region_id, r.ativo)}>
                      {r.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteRegiao(r.region_id)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="space-y-5">
        {/* Configurações do Scraper */}
        <section className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--line)]">
            <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-navy">Configurações do Scraper</h3>
            <p className="text-[12.5px] text-steel mt-0.5">Rótulo de catálogo e janela de validade do preço</p>
          </div>
          <div className="p-5">
            <form onSubmit={handleSaveConfig} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tenda-region-id">Região Tenda</Label>
                <Input
                  id="tenda-region-id"
                  type="text"
                  value={tendaRegionId}
                  onChange={(e) => setTendaRegionId(e.target.value)}
                  placeholder="Ex: 000010"
                />
                <p className="text-[11.5px] text-steel mt-1.5">
                  Região Tenda (referência de catálogo; o preço lido é o do site)
                </p>
              </div>
              <div>
                <Label htmlFor="preco-stale-dias">Dias para considerar preço desatualizado</Label>
                <Input
                  id="preco-stale-dias"
                  type="number"
                  min={1}
                  value={precoStaleDias}
                  onChange={(e) => setPrecoStaleDias(e.target.value)}
                  className="max-w-[140px]"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1 sm:col-span-2">
                <Button type="submit" disabled={savingConfig} loading={savingConfig}>
                  Salvar Configurações
                </Button>
                <Button type="button" variant="secondary" onClick={handleExecutarScraper} disabled={rodandoScraper}>
                  {rodandoScraper ? 'Executando...' : 'Executar Scraper Agora'}
                </Button>
              </div>
            </form>
            {scraperResultado && (
              <div
                className={`mt-4 px-3 py-2.5 rounded-xl text-[13px] border ${
                  scraperResultado.startsWith('Erro')
                    ? 'bg-danger-soft text-danger border-danger-line'
                    : 'bg-success-soft text-success border-success-line'
                }`}
              >
                {scraperResultado}
              </div>
            )}
          </div>
        </section>

        {/* Backup */}
        <section className="panel overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--line)]">
            <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-navy">Backup</h3>
            <p className="text-[12.5px] text-steel mt-0.5">Regiões em CSV e todas as tabelas em JSON</p>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <p className="text-[13px] text-steel max-w-lg">
              O backup JSON reúne <strong className="text-navy">produtos</strong>, <strong className="text-navy">compras</strong>, <strong className="text-navy">preços históricos</strong>, <strong className="text-navy">regiões</strong> e <strong className="text-navy">configurações</strong> em um arquivo único, pronto para restauração. Cada download fica registrado na tela de Usuários.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="secondary" onClick={handleGerarBackup} disabled={gerandoBackup}>
                {gerandoBackup ? 'Gerando…' : 'Gerar Backup (JSON)'}
              </Button>
              <Button variant="secondary" onClick={handleExportCSV}>
                <DownloadIcon size={15} />
                Exportar Regiões CSV
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal Editar/Adicionar Região */}
      <Dialog open={editingRegiao !== null || showAddRegiao} onClose={() => { setEditingRegiao(null); setShowAddRegiao(false); setNewRegiao({ region_id: '', nome: '', cep_referencia: '' }); }} title={editingRegiao ? 'Editar Região' : 'Adicionar Região'} size="md">
        <form onSubmit={handleSaveRegiao} className="space-y-4">
          <div>
            <Label htmlFor="region-id">ID da Região</Label>
            <Input
              id="region-id"
              type="text"
              value={editingRegiao ? editingRegiao.region_id : newRegiao.region_id}
              onChange={(e) => {
                if (editingRegiao) setEditingRegiao({ ...editingRegiao, region_id: e.target.value });
                else setNewRegiao({ ...newRegiao, region_id: e.target.value });
              }}
              required
              disabled={savingRegiao}
            />
          </div>
          <div>
            <Label htmlFor="region-nome">Nome</Label>
            <Input
              id="region-nome"
              type="text"
              value={editingRegiao ? editingRegiao.nome : newRegiao.nome}
              onChange={(e) => {
                if (editingRegiao) setEditingRegiao({ ...editingRegiao, nome: e.target.value });
                else setNewRegiao({ ...newRegiao, nome: e.target.value });
              }}
              required
              disabled={savingRegiao}
            />
          </div>
          <div>
            <Label htmlFor="region-cep">CEP de Referência</Label>
            <Input
              id="region-cep"
              type="text"
              value={editingRegiao ? editingRegiao.cep_referencia || '' : newRegiao.cep_referencia}
              onChange={(e) => {
                if (editingRegiao) setEditingRegiao({ ...editingRegiao, cep_referencia: e.target.value });
                else setNewRegiao({ ...newRegiao, cep_referencia: e.target.value });
              }}
              disabled={savingRegiao}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <Button variant="secondary" type="button" onClick={() => { setEditingRegiao(null); setShowAddRegiao(false); setNewRegiao({ region_id: '', nome: '', cep_referencia: '' }); }} disabled={savingRegiao}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingRegiao} loading={savingRegiao}>
              Salvar
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
