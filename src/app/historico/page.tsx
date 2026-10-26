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
    .select('*, profiles(nome)')
    .order('criado_em', { ascending: false });

  if (!profile?.is_admin) {
    query.eq('criado_por', user.id);
  }

  const { data: compras, error } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy">Histórico de Compras</h1>
        <p className="text-steel mt-1">Consulte todas as compras realizadas</p>
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