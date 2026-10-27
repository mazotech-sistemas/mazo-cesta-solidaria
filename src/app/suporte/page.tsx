'use client';

import Link from 'next/link';
import Image from 'next/image';

const faq = [
  {
    pergunta: 'Como faço login no sistema?',
    resposta: 'Use o email e senha fornecidos pelo administrador do projeto. Se é sua primeira vez, peça ao administrador para criar sua conta.',
  },
  {
    pergunta: 'Como simulo uma cesta básica?',
    resposta: 'Acesse o Simulador pelo menu lateral, selecione os produtos desejados, ajuste as quantidades e clique em Salvar Compra.',
  },
  {
    pergunta: 'Posso ver as compras de outros usuários?',
    resposta: 'Apenas administradores podem visualizar o histórico completo de compras. Voluntários veem apenas suas próprias compras.',
  },
  {
    pergunta: 'Como são atualizados os preços dos produtos?',
    resposta: 'Os preços são atualizados automaticamente via scraper. Administradores podem forçar a atualização nas Configurações.',
  },
  {
    pergunta: 'O que significa estoque baixo?',
    resposta: 'Um produto com estoque baixo tem quantidade inferior ou igual a 2 unidades. Use o Simulador para gerar lista de reposição.',
  },
  {
    pergunta: 'Como adiciono um novo produto?',
    resposta: 'Apenas administradores podem adicionar produtos. Acesse a página Estoque e clique em "Novo Produto" no topo.',
  },
  {
    pergunta: 'Como exporto os dados do histórico?',
    resposta: 'No Histórico, use os filtros de data e busca. Para exportar, administradores podem usar a API ou acessar o banco diretamente.',
  },
  {
    pergunta: 'O sistema funciona offline?',
    resposta: 'Não. O Cesta Solidária requer conexão com a internet para sincronizar dados com o Supabase.',
  },
];

export default function SuportePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ice px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <Image
            src="/logos/mazotech-com-texto.svg"
            alt="Mazotech Sistemas"
            width={400}
            height={180}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-navy mb-1">Precisa de ajuda?</h1>
          <p className="text-steel">Cesta Solidária - Mazotech Sistemas</p>
        </div>

        {/* Contato */}
        <div className="card p-6">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy mb-4">Contato</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-royal/10 text-royal flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-navy text-sm">Email</p>
                <p className="text-steel text-sm">mazotech.sistemas@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-royal/10 text-royal flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-navy text-sm">Telefone</p>
                <p className="text-steel text-sm">(19) 99837-4154</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-royal/10 text-royal flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-navy text-sm">Endereço</p>
                <p className="text-steel text-sm">Indaiatuba, SP - Brasil</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="card p-6">
          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-navy mb-4">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {faq.map((item, index) => (
              <details key={index} className="group border border-[var(--line)] rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-ice/50 transition-colors list-none">
                  <span className="font-medium text-navy">{item.pergunta}</span>
                  <svg className="w-5 h-5 text-steel group-open:rotate-180 transition-transform flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-steel text-sm leading-relaxed">
                  {item.resposta}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Login link */}
        <div className="text-center">
          <Link href="/login" className="btn-primary inline-flex">
            Voltar ao Login
          </Link>
        </div>

        <p className="text-center text-xs text-steel/60">
          Cesta Solidária v1.0 - Mazotech Sistemas
        </p>
      </div>
    </div>
  );
}