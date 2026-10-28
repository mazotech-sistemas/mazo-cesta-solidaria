'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  DashboardIcon,
  PackageIcon,
  CalculatorIcon,
  HistoryIcon,
  UsersIcon,
  SettingsIcon,
  LogOutIcon,
  XIcon,
} from '@/components/icons';

interface SidebarProps {
  user: { id: string; email?: string; user_metadata?: { nome?: string } };
  profile: { nome: string; is_admin: boolean } | null;
  open?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/estoque', label: 'Estoque', Icon: PackageIcon },
  { href: '/simulador', label: 'Simulador', Icon: CalculatorIcon },
  { href: '/historico', label: 'Histórico', Icon: HistoryIcon },
] as const;

const adminNavItems = [
  { href: '/usuarios', label: 'Usuários', Icon: UsersIcon },
  { href: '/configuracoes', label: 'Configurações', Icon: SettingsIcon },
] as const;

export default function Sidebar({ user, profile, open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();

  const userName = profile?.nome || user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside
      id="app-sidebar"
      className={`navy-panel flex flex-col w-[272px] shrink-0 h-screen z-50
        fixed inset-y-0 left-0 transition-transform duration-200 ease-out
        lg:sticky lg:top-0 lg:z-auto lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <div className="flex items-start justify-between gap-2 px-5 pt-6 pb-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-[14px] bg-white/10 ring-1 ring-white/15 flex items-center justify-center flex-shrink-0">
              <img
                src="/logos/mazotech-sem-texto-white.svg"
                alt="Mazotech Sistemas"
                width={24}
                height={24}
                className="w-full h-full"
              />
            </span>
            <span className="leading-tight">
              <span className="block text-[16px] font-extrabold tracking-[-0.02em] text-paper">Cesta Solidária</span>
              <span className="block mt-0.5 text-[10px] tracking-[0.16em] uppercase text-white/50 font-semibold">
                Mazotech Sistemas
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="lg:hidden -mr-1 mt-0.5 p-1.5 rounded-lg text-white/60 hover:text-paper hover:bg-white/10 transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.06] ring-1 ring-white/10 px-3 py-2.5">
            <span className="w-9 h-9 rounded-[11px] bg-white/10 text-paper flex items-center justify-center font-extrabold text-[13px] tracking-wide">
              {initials}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-paper truncate text-[13px]">{userName}</span>
              <span className="block text-[11px] text-white/55 truncate">
                {profile?.is_admin ? 'Administrador' : 'Voluntário'}
              </span>
            </span>
          </div>
        </div>

        <nav className="flex-1 min-h-0 px-3 pb-4 overflow-y-auto scrollbar-thin" aria-label="Navegação principal">
          <p className="px-3 pb-2 text-[10px] font-semibold text-white/45 uppercase tracking-[0.16em]">
            Principal
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.Icon size={18} className={isActive ? 'text-mint' : 'text-white/50'} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {profile?.is_admin && (
            <>
              <p className="px-3 pt-6 pb-2 text-[10px] font-semibold text-white/45 uppercase tracking-[0.16em]">
                Administração
              </p>
              <div className="space-y-0.5">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <item.Icon size={18} className={isActive ? 'text-mint' : 'text-white/50'} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white/70 hover:text-paper hover:bg-white/10 rounded-xl transition-colors"
          >
            <LogOutIcon size={17} />
            Sair
          </button>
          <p className="mt-3 text-center text-[10px] tracking-wider text-white/35">Cesta Solidária v1.0</p>
        </div>
      </div>
    </aside>
  );
}
