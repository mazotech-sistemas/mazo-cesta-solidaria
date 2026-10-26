'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Regiao } from '@/types/database';

interface ConfiguracoesClientProps {
  regioes: Regiao[];
  config: Record<string, string>;
  precosDesatualizados: number;
}

export default function ConfiguracoesClient({ regioes, config, precosDesatualizados }: ConfiguracoesClientProps) {
  const [editingRegiao, setEditingRegiao] = useState<Regiao | null>(null);
  const [savingRegiao, setSavingRegiao] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [tendaRegionId, setTendaRegionId] = useState(config['tenda_region_id'] || '');
  const [precoStaleDias, setPrecoStaleDias] = useState(config['preco_stale_dias'] || '7');
  const [showAddRegiao, setShowAddRegiao] = useState(false);
  const [newRegiao, setNewRegiao] = useState({ region_id: '', nome: '', cep_referencia: '' });
  const [message, setMessage] = useState('');

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setMessage('');

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
    setMessage('Configuracoes salvas com sucesso');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveRegiao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRegiao(true);
    setMessage('');

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
      setMessage('Erro ao salvar regiao: ' + error.message);
      setSavingRegiao(false);
      return;
    }

    setSavingRegiao(false);
    setEditingRegiao(null);
    setShowAddRegiao(false);
    setNewRegiao({ region_id: '', nome: '', cep_referencia: '' });
    setMessage('Regiao salva com sucesso');
    setTimeout(() => setMessage(''), 3000);
    window.location.reload();
  };

  const handleToggleRegiaoAtivo = async (region_id: string, ativo: boolean) => {
    const supabase = createClient();
    await supabase.from('regions').update({ ativo: !ativo }).eq('region_id', region_id);
    window.location.reload();
  };

  const handleDeleteRegiao = async (region_id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regiao?')) return;
    const supabase = createClient();
    await supabase.from('regions').delete().eq('region_id', region_id);
    window.location.reload();
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
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`card p-4 ${message.includes('Erro') ? 'bg-red-50' : 'bg-mint/10'} border-none`} role="alert">
          <p className={`text-sm font-medium ${message.includes('Erro') ? 'text-red-700' : 'text-navy'}`}>{message}</p>
        </div>
      )}

      {precosDesatualizados > 0 && (
        <div className="card p-4 border-l-4 border-amber-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-navy">
                {precosDesatualizados} preco{precosDesatualizados > 1 ? 's' : ''} desatualizado{precosDesatualizados > 1 ? 's' : ''}
              </h3>
              <p className="text-steel text-sm mt-1">
                Ha mais de {precoStaleDias} dias sem atualizacao. Verifique o scraper ou atualize manualmente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Regioes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy">Regioes</h2>
          <button onClick={() => setShowAddRegiao(true)} className="btn-primary text-xs">
            Adicionar Regiao
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--line)]">
            <div className="p-4 bg-ice/50 table-header">
              <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold">
                <span className="col-span-3">ID</span>
                <span className="col-span-4">Nome</span>
                <span className="col-span-3">CEP</span>
                <span className="col-span-2 text-right">Acoes</span>
              </div>
            </div>
            {regioes.map((r) => (
              <div key={r.region_id} className="p-4 table-row">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <span className="col-span-3 font-mono text-sm text-navy">{r.region_id}</span>
                  <span className="col-span-4">
                    <span className={`font-medium ${r.ativo ? 'text-navy' : 'text-steel line-through'}`}>{r.nome}</span>
                    {!r.ativo && <span className="ml-2 badge badge-warning text-xs">Inativo</span>}
                  </span>
                  <span className="col-span-3 text-sm text-steel">{r.cep_referencia || '-'}</span>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingRegiao(r)}
                      className="btn-ghost text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleRegiaoAtivo(r.region_id, r.ativo)}
                      className="btn-ghost text-xs"
                    >
                      {r.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleDeleteRegiao(r.region_id)}
                      className="btn-ghost text-xs text-red-700 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Configuracoes do Scraper */}
      <section>
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy mb-4">Configuracoes do Scraper</h2>
        <div className="card p-6">
          <form onSubmit={handleSaveConfig} className="space-y-4 max-w-lg">
            <div>
              <label htmlFor="tenda-region-id" className="label">Regiao Tenda</label>
              <input
                id="tenda-region-id"
                type="text"
                value={tendaRegionId}
                onChange={(e) => setTendaRegionId(e.target.value)}
                className="input"
                placeholder="Ex: 000010"
              />
              <p className="text-xs text-steel mt-1">Identificador da regiao para o scraper de precos</p>
            </div>
            <div>
              <label htmlFor="preco-stale-dias" className="label">Dias para considerar preco desatualizado</label>
              <input
                id="preco-stale-dias"
                type="number"
                min={1}
                value={precoStaleDias}
                onChange={(e) => setPrecoStaleDias(e.target.value)}
                className="input"
              />
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="btn-primary"
            >
              {savingConfig ? 'Salvando...' : 'Salvar Configuracoes'}
            </button>
          </form>
        </div>
      </section>

      {/* Backup */}
      <section>
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy mb-4">Backup</h2>
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <button onClick={handleExportCSV} className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Regioes CSV
            </button>
          </div>
        </div>
      </section>

      {/* Modal Editar/Adicionar Regiao */}
      {(editingRegiao || showAddRegiao) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setEditingRegiao(null); setShowAddRegiao(false); }}
        >
          <div
            className="card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy mb-4">
              {editingRegiao ? 'Editar Regiao' : 'Adicionar Regiao'}
            </h2>
            <form onSubmit={handleSaveRegiao} className="space-y-4">
              <div>
                <label htmlFor="region-id" className="label">ID da Regiao</label>
                <input
                  id="region-id"
                  type="text"
                  value={editingRegiao ? editingRegiao.region_id : newRegiao.region_id}
                  onChange={(e) => {
                    if (editingRegiao) setEditingRegiao({ ...editingRegiao, region_id: e.target.value });
                    else setNewRegiao({ ...newRegiao, region_id: e.target.value });
                  }}
                  className="input"
                  required
                  disabled={savingRegiao}
                />
              </div>
              <div>
                <label htmlFor="region-nome" className="label">Nome</label>
                <input
                  id="region-nome"
                  type="text"
                  value={editingRegiao ? editingRegiao.nome : newRegiao.nome}
                  onChange={(e) => {
                    if (editingRegiao) setEditingRegiao({ ...editingRegiao, nome: e.target.value });
                    else setNewRegiao({ ...newRegiao, nome: e.target.value });
                  }}
                  className="input"
                  required
                  disabled={savingRegiao}
                />
              </div>
              <div>
                <label htmlFor="region-cep" className="label">CEP de Referencia</label>
                <input
                  id="region-cep"
                  type="text"
                  value={editingRegiao ? editingRegiao.cep_referencia || '' : newRegiao.cep_referencia}
                  onChange={(e) => {
                    if (editingRegiao) setEditingRegiao({ ...editingRegiao, cep_referencia: e.target.value });
                    else setNewRegiao({ ...newRegiao, cep_referencia: e.target.value });
                  }}
                  className="input"
                  disabled={savingRegiao}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingRegiao(null); setShowAddRegiao(false); setNewRegiao({ region_id: '', nome: '', cep_referencia: '' }); }}
                  className="btn-secondary flex-1"
                  disabled={savingRegiao}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={savingRegiao}
                >
                  {savingRegiao ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}