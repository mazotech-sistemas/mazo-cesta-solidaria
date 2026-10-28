'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BasketIcon } from '@/components/icons';

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
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Últimas Compras</h2>
        </div>
        <div className="panel p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-3 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-[11px] bg-ice" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-ice rounded" />
                <div className="h-3 w-24 bg-ice rounded" />
              </div>
              <div className="w-20 h-5 bg-ice rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (purchases.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Últimas Compras</h2>
        </div>
        <div className="panel px-6 py-12 text-center">
          <span className="inline-flex w-12 h-12 rounded-[14px] bg-royal/10 text-royal items-center justify-center mb-4">
            <BasketIcon size={22} />
          </span>
          <h3 className="font-semibold text-navy mb-1 text-[16px]">Nenhuma compra registrada</h3>
          <p className="text-steel text-sm mb-5">Faça sua primeira simulação e salve no Simulador</p>
          <Link href="/simulador">
            <Button>Ir para Simulador</Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Últimas Compras</h2>
        <Link
          href="/historico"
          className="text-[12.5px] font-semibold text-royal hover:text-royal/80 transition-colors"
        >
          Ver histórico
        </Link>
      </div>

      <div className="panel overflow-hidden">
        <ul className="divide-y divide-[var(--line)]">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-ice/40 transition-colors">
              <span className="hidden sm:flex w-9 h-9 rounded-[11px] bg-royal/10 text-royal items-center justify-center flex-shrink-0">
                <BasketIcon size={17} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-medium text-ink tabular-nums">
                  {new Date(purchase.criado_em).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  <span className="text-steel ml-2 font-normal">
                    {new Date(purchase.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              </span>
              <Badge variant="secondary">
                {purchase.numero_cestas} cesta{purchase.numero_cestas > 1 ? 's' : ''}
              </Badge>
              <span className="w-24 sm:w-32 text-right text-[15px] font-extrabold text-navy tabular-nums">
                R$ {purchase.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
