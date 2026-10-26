'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password) {
      setError('Preencha email e senha');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Email inválido');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message.includes('Invalid login credentials')
        ? 'Email ou senha inválidos'
        : authError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ice px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Logo Mazotech */}
          <div className="text-center mb-8">
            <svg className="w-20 h-20 mx-auto mb-4" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mazotech Sistemas">
              <g transform="translate(150,200)">
                <polygon points="0,-70 60.6,-35 60.6,35 0,70 -60.6,35 -60.6,-35" fill="#021D44" stroke="#0052FA" strokeWidth="4"/>
                <polygon points="0,-35 30.3,-17.5 30.3,17.5 0,35 -30.3,17.5 -30.3,-17.5" fill="none" stroke="#0E5DFC" strokeWidth="3"/>
                <line x1="0" y1="-70" x2="45" y2="-70" stroke="#0052FA" strokeWidth="3"/>
                <circle cx="48" cy="-70" r="6" fill="#0052FA"/>
                <line x1="60.6" y1="35" x2="95" y2="35" stroke="#0052FA" strokeWidth="3"/>
                <circle cx="98" cy="35" r="6" fill="#0052FA"/>
                <line x1="0" y1="70" x2="-40" y2="70" stroke="#0E5DFC" strokeWidth="3"/>
                <circle cx="-43" cy="70" r="6" fill="#0E5DFC"/>
                <line x1="-60.6" y1="-35" x2="-95" y2="-35" stroke="#0E5DFC" strokeWidth="3"/>
                <circle cx="-98" cy="-35" r="6" fill="#0E5DFC"/>
                <line x1="60.6" y1="-35" x2="60.6" y2="-65" stroke="#0E5DFC" strokeWidth="3"/>
                <circle cx="60.6" cy="-68" r="6" fill="#0E5DFC"/>
                <line x1="-60.6" y1="35" x2="-60.6" y2="65" stroke="#0052FA" strokeWidth="3"/>
                <circle cx="-60.6" cy="68" r="6" fill="#0052FA"/>
              </g>
            </svg>
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy mb-1">Cesta Solidária</h1>
            <p className="text-steel">Gestão de cestas básicas para projetos sociais</p>
            <p className="text-xs text-royal font-semibold tracking-widest mt-2">MAZOTECH SISTEMAS</p>
          </div>

          <div className="border-t border-[var(--line)] my-6" />

          {error && (
            <div className="badge badge-error mb-6 w-full justify-center" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                disabled={loading}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 text-royal border-[var(--line)] rounded focus:ring-2 focus:ring-royal/20"
                />
                <span className="text-sm text-steel">Lembrar-me (30 dias)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-steel">
              Dúvidas? <Link href="/suporte" className="text-royal hover:underline font-medium">Fale conosco</Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-steel/60">Cesta Solidária v1.0 — Mazotech Sistemas</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-ice"><div className="animate-pulse text-navy">Carregando...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}