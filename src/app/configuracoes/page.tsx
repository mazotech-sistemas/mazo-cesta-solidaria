import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConfiguracoesClient from '@/components/configuracoes/configuracoes-client';

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/configuracoes');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/dashboard');
  }

  const [{ data: regioes }, { data: configs }, { count: precosDesatualizados }] = await Promise.all([
    supabase.from('regions').select('*').order('nome'),
    supabase.from('config').select('*'),
    supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)
      .not('token_tenda', 'is', null)
      .lt('ultima_atualizacao_preco', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const configMap = Object.fromEntries((configs || []).map(c => [c.chave, c.valor]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy">Configurações</h1>
          <p className="text-steel mt-1">Gerencie regiões, scraper e backup do sistema</p>
        </div>
      </div>

      <ConfiguracoesClient
        regioes={regioes || []}
        config={configMap}
        precosDesatualizados={precosDesatualizados || 0}
      />
    </div>
  );
}