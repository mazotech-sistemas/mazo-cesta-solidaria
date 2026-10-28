import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/sidebar';

export default async function UsuariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="h-screen bg-ice flex overflow-hidden">
      <Sidebar user={user} profile={profile} />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}