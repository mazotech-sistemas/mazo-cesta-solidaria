import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StatsCards from '@/components/dashboard/stats-cards';
import QuickActions from '@/components/dashboard/quick-actions';
import Alerts from '@/components/dashboard/alerts';
import RecentPurchases from '@/components/dashboard/recent-purchases';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch stats
  const [
    { count: totalProdutos },
    { data: produtosEstoqueBaixo },
    { count: precosDesatualizados },
    { count: comprasMes },
    { data: produtosSemToken },
    { data: configRows },
  ] = await Promise.all([
    supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('produtos').select('id').eq('ativo', true).lte('estoque_atual', 2),
    supabase.from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)
      .not('token_tenda', 'is', null)
      .lt('ultima_atualizacao_preco', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('compras').select('*', { count: 'exact', head: true })
      .eq('criado_por', user.id)
      .gte('criado_em', new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0).toISOString()),
    supabase.from('produtos').select('id').eq('ativo', true).is('token_tenda', null),
    supabase.from('config').select('chave, valor'),
  ]);

  const configMap: Record<string, string> = {};
  for (const c of configRows || []) configMap[c.chave] = c.valor;
  const precoStaleDias = parseInt(configMap['preco_stale_dias'] || '7', 10) || 7;

  const stats = {
    totalProdutos: totalProdutos || 0,
    estoqueBaixo: produtosEstoqueBaixo?.length || 0,
    precosDesatualizados: precosDesatualizados || 0,
    semToken: produtosSemToken?.length || 0,
    comprasMes: comprasMes || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title">
            Bem-vindo, {profile?.nome?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="page-subtitle">Visão geral do seu projeto Cesta Solidária</p>
        </div>
        <p className="text-[12px] text-steel-strong hidden sm:block pb-1 tabular-nums">
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Quick Actions */}
      <QuickActions isAdmin={profile?.is_admin || false} />

      {/* Alerts */}
      <Alerts
        estoqueBaixo={stats.estoqueBaixo}
        precosDesatualizados={stats.precosDesatualizados}
        semToken={stats.semToken}
        precoStaleDias={precoStaleDias}
        temCompras={stats.comprasMes > 0}
      />

      {/* Recent Purchases */}
      <RecentPurchases userId={user.id} />
    </div>
  );
}