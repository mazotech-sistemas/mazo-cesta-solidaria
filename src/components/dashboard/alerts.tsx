'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface AlertsProps {
  estoqueBaixo: number;
  precosDesatualizados: number;
}

export default function Alerts({ estoqueBaixo, precosDesatualizados }: AlertsProps) {
  const alerts = [];

  if (estoqueBaixo > 0) {
    alerts.push({
      title: `${estoqueBaixo} produto${estoqueBaixo > 1 ? 's' : ''} com estoque baixo`,
      description: 'Verifique o estoque e gere lista de compras no Simulador',
      href: '/estoque',
      variant: 'warning' as const,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
      iconBg: 'bg-amber/10 text-amber-700',
      borderColor: 'border-l-4 border-amber-500',
    });
  }

  if (precosDesatualizados > 0) {
    alerts.push({
      title: `${precosDesatualizados} preço${precosDesatualizados > 1 ? 's' : ''} desatualizado${precosDesatualizados > 1 ? 's' : ''} (>7 dias)`,
      description: 'Execute o scraper ou atualize manualmente nas Configurações',
      href: '/configuracoes',
      variant: 'error' as const,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      iconBg: 'bg-red/10 text-red-700',
      borderColor: 'border-l-4 border-red-500',
    });
  }

  if (alerts.length === 0) {
    return (
      <section>
        <div className="surface surface-strong p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-mint/10 text-mint flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-navy text-[17px]">Tudo em ordem!</h3>
            <p className="text-steel text-sm mt-0.5">Seu estoque está atualizado e os preços sincronizados</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-navy mb-4">Próximas Ações Sugeridas</h2>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <Link
            key={index}
            href={alert.href}
            className={`block surface surface-strong p-5 flex items-start gap-4 hover:shadow-[0_4px_12px_rgba(2,29,68,0.08)] transition-all hover:-translate-y-0.5 ${alert.borderColor}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.iconBg}`}>
              {alert.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-navy text-[15px]">{alert.title}</h3>
              <p className="text-steel text-sm mt-1">{alert.description}</p>
            </div>
            <svg className="w-5 h-5 text-steel/40 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}