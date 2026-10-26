import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EstoqueClient from '@/components/estoque/estoque-client';

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/estoque');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy">Estoque</h1>
          <p className="text-steel mt-1">Gerencie os produtos e seus preços</p>
        </div>
      </div>

      <EstoqueClient
        produtos={produtos || []}
        isAdmin={profile?.is_admin || false}
      />
    </div>
  );
}