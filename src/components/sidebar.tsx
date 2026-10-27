'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface SidebarProps {
  user: { id: string; email?: string; user_metadata?: { nome?: string } };
  profile: { nome: string; is_admin: boolean } | null;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/estoque', label: 'Estoque', icon: 'package' },
  { href: '/simulador', label: 'Simulador', icon: 'calculator' },
  { href: '/historico', label: 'Histórico', icon: 'history' },
] as const;

const adminNavItems = [
  { href: '/usuarios', label: 'Usuários', icon: 'users' },
  { href: '/configuracoes', label: 'Configurações', icon: 'settings' },
] as const;

export default function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();

  const userName = profile?.nome || user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside className="w-[280px] navy-panel flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-3 mb-6" aria-label="Cesta Solidária - Dashboard">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Image
              src="/logos/mazotech-sem-texto.svg"
              alt="Mazotech Sistemas"
              width={28}
              height={28}
              className="flex-shrink-0 invert"
              priority
            />
          </div>
          <div className="leading-tight">
            <span className="font-extrabold tracking-[-0.02em] text-[17px] block text-paper">Cesta Solidária</span>
            <span className="text-[11px] tracking-widest uppercase text-white/60 font-semibold">Mazotech Sistemas</span>
          </div>
        </Link>
      </div>

      {/* User */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 text-paper flex items-center justify-center font-extrabold text-[14px]">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-paper truncate text-[14px]">{userName}</p>
            <p className="text-xs text-white/60 capitalize">{profile?.is_admin ? 'Administrador' : 'Voluntário'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Navegação principal">
        <div className="px-3 pb-2 text-[10px] font-semibold text-white/40 uppercase tracking-widest">
          Principal
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}

        {profile?.is_admin && (
          <>
            <div className="px-3 pt-4 mt-4 border-t border-white/10">
              <p className="px-0 pb-2 text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                Administração
              </p>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="p-6 pt-4 mt-auto border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white/80 hover:text-paper hover:bg-white/10 rounded-[12px] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
        <p className="mt-4 text-center text-xs text-white/30">Cesta Solidária v1.0</p>
      </div>
    </aside>
  );
}