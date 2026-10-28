'use client';

import Link from 'next/link';
import { CheckIcon } from '@/components/icons';

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      ),
      iconBg: 'bg-warn-soft text-warn',
      borderColor: 'border-l-[3px] border-l-warn',
    });
  }

  if (precosDesatualizados > 0) {
    alerts.push({
      title: `${precosDesatualizados} preço${precosDesatualizados > 1 ? 's' : ''} desatualizado${precosDesatualizados > 1 ? 's' : ''} (>7 dias)`,
      description: 'Execute o scraper ou atualize manualmente nas Configurações',
      href: '/configuracoes',
      variant: 'error' as const,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      iconBg: 'bg-danger-soft text-danger',
      borderColor: 'border-l-[3px] border-l-danger',
    });
  }

  if (alerts.length === 0) {
    return (
      <section className="panel flex items-center gap-4 px-5 py-4">
        <span className="w-10 h-10 rounded-[12px] bg-success-soft text-success flex items-center justify-center flex-shrink-0">
          <CheckIcon size={20} />
        </span>
        <div>
          <h3 className="font-semibold text-navy text-[15px]">Tudo em ordem!</h3>
          <p className="text-steel text-[13px] mt-0.5">Seu estoque está atualizado e os preços sincronizados</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="section-title mb-3">Próximas Ações Sugeridas</h2>
      <div className="space-y-2.5">
        {alerts.map((alert, index) => (
          <Link
            key={index}
            href={alert.href}
            className={`group panel flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ice/40 ${alert.borderColor}`}
          >
            <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${alert.iconBg}`}>
              {alert.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-navy text-[14.5px]">{alert.title}</h3>
              <p className="text-steel text-[13px] mt-0.5">{alert.description}</p>
            </div>
            <svg className="w-4 h-4 text-steel/50 flex-shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
