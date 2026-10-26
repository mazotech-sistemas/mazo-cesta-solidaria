'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Regiao } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

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

    setSavingRegiao(false);
    setEditingRegiao(null);
    setShowAddRegiao(false);
    setNewRegiao({ region_id: '', nome: '', cep_referencia: '' });
    toast('Região salva com sucesso', 'success');
    window.location.reload();
  };

  const handleToggleRegiaoAtivo = async (region_id: string, ativo: boolean) => {
    const supabase = createClient();
    await supabase.from('regions').update({ ativo: !ativo }).eq('region_id', region_id);
    toast(ativo ? 'Região desativada' : 'Região ativada', 'success');
    window.location.reload();
  };

  const handleDeleteRegiao = async (region_id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta região?')) return;
    const supabase = createClient();
    await supabase.from('regions').delete().eq('region_id', region_id);
    toast('Região excluída', 'success');
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
    toast('CSV exportado', 'success');
  };

  return (
    <div className="space-y-6">
      {precosDesatualizados > 0 && (
        <Card className="border-l-4 border-amber-500">
          <CardContent className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-navy">
                {precosDesatualizados} preço{precosDesatualizados > 1 ? 's' : ''} desatualizado{precosDesatualizados > 1 ? 's' : ''}
              </h3>
              <p className="text-steel text-sm mt-1">
                Há mais de {precoStaleDias} dias sem atualização. Verifique o scraper ou atualize manualmente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regiões */}
      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Regiões</CardTitle>
            <Button size="sm" onClick={() => setShowAddRegiao(true)}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-ice/50">
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CEP</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regioes.map((r) => (
                  <TableRow key={r.region_id}>
                    <TableCell className="font-mono text-sm text-navy">{r.region_id}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${r.ativo ? 'text-navy' : 'text-steel line-through'}`}>{r.nome}</span>
                      {!r.ativo && <Badge variant="warning" className="ml-2 text-xs">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-steel">{r.cep_referencia || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingRegiao(r)}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleRegiaoAtivo(r.region_id, r.ativo)}>
                          {r.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => handleDeleteRegiao(r.region_id)}>
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Configurações do Scraper */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Scraper</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveConfig} className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="tenda-region-id">Região Tenda</Label>
                <Input
                  id="tenda-region-id"
                  type="text"
                  value={tendaRegionId}
                  onChange={(e) => setTendaRegionId(e.target.value)}
                  placeholder="Ex: 000010"
                />
                <p className="text-xs text-steel mt-1">Identificador da região para o scraper de preços</p>
              </div>
              <div>
                <Label htmlFor="preco-stale-dias">Dias para considerar preço desatualizado</Label>
                <Input
                  id="preco-stale-dias"
                  type="number"
                  min={1}
                  value={precoStaleDias}
                  onChange={(e) => setPrecoStaleDias(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={savingConfig} loading={savingConfig}>
                Salvar Configurações
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Backup */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={handleExportCSV}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Regiões CSV
            </Button>
          </CardContent>
        </Card>
      </section>

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
          <div className="flex gap-3 pt-2">
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