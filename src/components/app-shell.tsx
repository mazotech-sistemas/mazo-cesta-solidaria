'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { MenuIcon } from '@/components/icons';

interface AppShellProps {
  user: { id: string; email?: string; user_metadata?: { nome?: string } };
  profile: { nome: string; is_admin: boolean } | null;
  children: React.ReactNode;
}

export default function AppShell({ user, profile, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-ice lg:flex">
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-paper border-b border-[var(--line)]">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          className="p-2 -ml-1 rounded-xl text-navy hover:bg-ice transition-colors"
        >
          <MenuIcon size={20} />
        </button>
        <span className="text-[15px] font-extrabold tracking-[-0.02em] text-navy">Cesta Solidária</span>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-steel">
          {profile?.is_admin ? 'Admin' : 'Voluntário'}
        </span>
      </header>

      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-navy/45"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar user={user} profile={profile} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="flex-1 min-w-0">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
