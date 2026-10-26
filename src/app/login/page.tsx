'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen flex items-center justify-center bg-ice px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          {/* Logo Mazotech */}
          <div className="text-center mb-8">
            <Image
              src="/logos/mazotech-com-texto.svg"
              alt="Mazotech Sistemas"
              width={280}
              height={144}
              className="mx-auto mb-4"
              priority
            />
            <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy mb-1">Cesta Solidária</h1>
            <p className="text-steel">Gestão de cestas básicas para projetos sociais</p>
          </div>

          <div className="border-t border-[var(--line)] my-6" />

          {error && (
            <div className="badge badge-error mb-6 w-full justify-center" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={loading}
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3"
              loading={loading}
            >
              Entrar
            </Button>
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