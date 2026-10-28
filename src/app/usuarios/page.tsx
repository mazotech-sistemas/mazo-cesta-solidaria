import { createClient } from '@/lib/supabase/server';
import UsuariosClient from '@/components/usuarios/usuarios-client';

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

  if (!profile?.is_admin) {
    return null; // Layout handles redirect
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('criado_em', { ascending: false });

  // Últimos backups registrados (falha silenciosamente se a tabela 002
  // ainda não foi aplicada neste projeto).
  const { data: backups } = await supabase
    .from('backup_registros')
    .select('id, criado_em, linhas, autor')
    .order('criado_em', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Gerencie os usuários do sistema</p>
        </div>
      </div>

      <UsuariosClient
        users={users || []}
        currentUserId={user?.id || ''}
        backups={backups || []}
      />
    </div>
  );
}