import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SimuladorClient from '@/components/simulador/simulador-client';

export default async function SimuladorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/simulador');
  }

  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy">Simulador de Cesta</h1>
        <p className="text-steel mt-1">Selecione os produtos e quantidades para simular sua compra</p>
      </div>

      <SimuladorClient
        produtos={produtos || []}
        userId={user.id}
      />
    </div>
  );
}