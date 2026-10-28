import { createClient } from '@/lib/supabase/server';
import HistoricoClient from '@/components/historico/historico-client';

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

  const query = supabase
    .from('compras')
    .select('*')
    .order('criado_em', { ascending: false });

  if (!profile?.is_admin) {
    query.eq('criado_por', user?.id);
  }

  const { data: comprasRaw, error } = await query;

  // Histórico de preços do produto para os gráficos de evolução
  const { data: precos } = await supabase.from('precos_historico').select('*').order('dia');

  // Produtos ativos para nomear os pontos do gráfico de preço
  const { data: produtos } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome');

  // Buscar perfis separadamente (FK compras.criado_por → auth.users, não profiles)
  let compras = comprasRaw;
  if (comprasRaw && comprasRaw.length > 0) {
    const userIds = [...new Set(comprasRaw.map(c => c.criado_por))];
    const { data: perfis } = await supabase
      .from('profiles')
      .select('id, nome, is_admin')
      .in('id', userIds);
    const perfilMap = new Map((perfis || []).map(p => [p.id, p]));
    compras = comprasRaw.map(c => ({
      ...c,
      profiles: perfilMap.get(c.criado_por) || null,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h1 className="page-title">Histórico de Compras</h1>
          <p className="page-subtitle">Consulte todas as compras realizadas</p>
        </div>
      </div>

      {error ? (
        <div className="badge badge-error w-full justify-center" role="alert">
          Erro ao carregar compras: {error.message}
        </div>
      ) : (
        <HistoricoClient
          compras={compras || []}
          isAdmin={profile?.is_admin || false}
          userId={user?.id || ''}
          precos={precos || []}
          produtos={produtos || []}
        />
      )}
    </div>
  );
}