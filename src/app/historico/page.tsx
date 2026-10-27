import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import HistoricoClient from '@/components/historico/historico-client';

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/historico');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const query = supabase
    .from('compras')
    .select('*')
    .order('criado_em', { ascending: false });

  if (!profile?.is_admin) {
    query.eq('criado_por', user.id);
  }

  const { data: comprasRaw, error } = await query;

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
    <div className="space-y-8">
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
          userId={user.id}
        />
      )}
    </div>
  );
}