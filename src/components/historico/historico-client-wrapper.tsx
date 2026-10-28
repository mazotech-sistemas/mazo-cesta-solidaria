'use client';

import dynamic from 'next/dynamic';
import type { HistoricoClientProps } from '@/components/historico/historico-client';

const HistoricoClientDynamic = dynamic(
  () => import('@/components/historico/historico-client').then((mod) => mod.default),
  { ssr: false, loading: () => <div className="panel p-8 text-center text-steel">Carregando histórico…</div> }
);

export default function HistoricoClientWrapper(props: HistoricoClientProps) {
  return <HistoricoClientDynamic {...props} />;
}