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
    <aside className="w-64 bg-paper border-r border-[var(--line)] flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-5 border-b border-[var(--line)]">
        <Link href="/dashboard" className="flex items-center gap-3 mb-6" aria-label="Cesta Solidária - Dashboard">
          <Image
            src="/logos/mazotech-sem-texto.svg"
            alt="Mazotech Sistemas"
            width={32}
            height={32}
            className="flex-shrink-0"
            priority
          />
          <span className="font-extrabold text-navy tracking-[-0.02em] text-base">Cesta Solidária</span>
        </Link>
        <p className="text-xs text-royal font-semibold tracking-widest uppercase">MAZOTECH SISTEMAS</p>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy text-paper flex items-center justify-center font-extrabold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-navy truncate">{userName}</p>
            <p className="text-xs text-steel capitalize">{profile?.is_admin ? 'Administrador' : 'Voluntário'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Navegação principal">
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
            <div className="pt-3 mt-3 border-t border-[var(--line)]">
              <p className="px-3 text-xs font-semibold text-steel/60 tracking-wider uppercase mb-2">
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
      <div className="p-4 border-t border-[var(--line)]">
        <button
          onClick={handleLogout}
          className="btn-secondary w-full justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
        <p className="mt-4 text-center text-xs text-steel/50">Cesta Solidária v1.0</p>
      </div>
    </aside>
  );
}