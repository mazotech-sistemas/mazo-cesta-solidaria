'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Purchase {
  id: number;
  numero_cestas: number;
  total: number;
  criado_em: string;
}

interface RecentPurchasesProps {
  userId: string;
}

export default function RecentPurchases({ userId }: RecentPurchasesProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPurchases() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('compras')
        .select('id, numero_cestas, total, criado_em')
        .eq('criado_por', userId)
        .order('criado_em', { ascending: false })
        .limit(5);

      if (!error && data) {
        setPurchases(data);
      }
      setLoading(false);
    }
    fetchPurchases();
  }, [userId]);

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy">Últimas Compras</h2>
        </div>
        <Card className="p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-ice" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-ice rounded" />
                <div className="h-3 w-1/2 bg-ice rounded" />
              </div>
              <div className="w-24 h-8 bg-ice rounded" />
            </div>
          ))}
        </Card>
      </section>
    );
  }

  if (purchases.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy">Últimas Compras</h2>
        </div>
        <Card className="p-8 text-center">
          <CardContent>
            <svg className="w-16 h-16 mx-auto mb-4 text-steel/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="font-semibold text-navy mb-1">Nenhuma compra registrada</h3>
            <p className="text-steel mb-4">Faça sua primeira simulação e salve no Simulador</p>
            <Link href="/simulador">
              <Button>Ir para Simulador</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy">Últimas Compras</h2>
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--line)]">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="p-4 hover:bg-ice/50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-royal/10 text-royal flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-navy">{purchase.numero_cestas} cesta{purchase.numero_cestas > 1 ? 's' : ''}</p>
                    <p className="text-sm text-steel">
                      {new Date(purchase.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-navy text-lg">R$ {purchase.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}