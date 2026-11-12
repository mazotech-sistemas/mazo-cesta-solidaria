import { createClient } from '@/lib/supabase/server';
import EstoqueClient from '@/components/estoque/estoque-client';
import { redirect } from 'next/navigation';

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

  const { data: configRows } = await supabase.from('config').select('chave, valor');
  const configMap: Record<string, string> = {};
  for (const c of configRows || []) configMap[c.chave] = c.valor;
  const precoStaleDias = parseInt(configMap['preco_stale_dias'] || '7', 10) || 7;

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h1 className="page-title">Estoque</h1>
          <p className="page-subtitle">Gerencie os produtos e seus preços</p>
        </div>
      </div>

      <EstoqueClient
        produtos={produtos || []}
        isAdmin={profile?.is_admin || false}
        precoStaleDias={precoStaleDias}
      />
    </div>
  );
}