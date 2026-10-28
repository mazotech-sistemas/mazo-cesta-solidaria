import { createClient } from '@/lib/supabase/server';
import SimuladorClient from '@/components/simulador/simulador-client';

export default async function SimuladorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  return (
    <div className="space-y-8">
      <div className="page-head">
        <div>
          <h1 className="page-title">Simulador de Cesta</h1>
          <p className="page-subtitle">Selecione os produtos e quantidades para simular sua compra</p>
        </div>
      </div>

      <SimuladorClient
        produtos={produtos || []}
        userId={user?.id || ''}
      />
    </div>
  );
}