import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UsuariosClient from '@/components/usuarios/usuarios-client';

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/usuarios');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/dashboard');
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('criado_em', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy">Usuários</h1>
          <p className="text-steel mt-1">Gerencie os usuários do sistema</p>
        </div>
      </div>

      <UsuariosClient
        users={users || []}
        currentUserId={user.id}
      />
    </div>
  );
}