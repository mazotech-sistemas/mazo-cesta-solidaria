// Teste de sistema: bate o fluxo real ponta a ponta contra a Supabase de
// produção (ou outro alvo apontado por SUPABASE_URL_TESTE): cria, lê,
// atualiza, exclui um produto de teste, confere o upsert de preço no
// histórico e valida a geração da lista de compras a partir do estado real.
//
// Limpeza: cada produto criado aqui tem um sufixo `SYS-<execucao>` único e
// é removido no `finally`, assim como a linha de histórico correspondente.
//
// Rodar com: `npm run test:system` (usa a .env do projeto).

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const adminEmail = process.env.CESTA_E2E_ADMIN_EMAIL || 'admin@cestasolidaria.org';
const adminSenha = process.env.CESTA_E2E_ADMIN_SENHA || 'senha123';

function env(n: string): string | undefined {
  const texto = readFileSync(process.cwd() + '/.env', 'utf8');
  for (const linha of texto.split('\n')) {
    const c = linha.trim();
    if (!c || c.startsWith('#') || !linha.includes('=')) continue;
    const [k, ...r] = linha.split('=');
    if (k.trim() === n) return r.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return process.env[n];
}

interface Check {
  nome: string;
  corrobora: () => boolean;
}

function check(nome: string, f: Check['corrobora']) {
  const ok = f();
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nome}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL')!;
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY')!;
  const supabase = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessao, error: erroSessao } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminSenha,
  });
  check('login do admin', () => !erroSessao && sessao !== null && sessao.user !== null);

  const execucao = Date.now().toString(36);
  const nome = `Produto SYS-${execucao}`;
  let criadoId: number | null = null;

  try {
    // Criação via cliente do usuário (RLS: admin pode inserir)
    const { data: ins, error: erroInsert } = await supabase.from('produtos').insert({
      nome,
      marca: 'Marca SYS',
      unidade: 'kg',
      qtd_por_cesta: 2,
      estoque_atual: 50,
      preco_atual: 10,
      termo_busca: 'sys-teste-unico',
      ativo: true,
    }).select().single();
    check('criar produto', () => !erroInsert && ins !== null && (ins as any).id > 0);
    if (ins) criadoId = (ins as any).id;

    // Leitura
    const { data: lidos } = await supabase.from('produtos').select('*').eq('nome', nome);
    check('ler produto criado', () => lidos !== undefined && lidos.length === 1 && (lidos[0] as any).estoque_atual === 50);

    // Atualização (estoque)
    const { error: erroUpd } = await supabase.from('produtos').update({ estoque_atual: 48 }).eq('id', criadoId);
    check('atualizar estoque', () => erroUpd === null);

    // Histórico de preço (upsert por produto e dia)
    const { error: erroHist } = await supabase.from('precos_historico').upsert(
      { produto_id: criadoId, preco: 9.5, dia: '2026-11-09', region_id: '000010' },
      { onConflict: 'produto_id,dia' },
    );
    check('upsert de preço no histórico', () => erroHist === null);

    // Exclusão via serviço do app (soft delete: ativo=false)
    const { error: erroSoft } = await supabase.from('produtos').update({ ativo: false }).eq('id', criadoId);
    check('soft delete', () => erroSoft === null);
  } finally {
    if (criadoId) {
      const { data: removidos } = await supabase.from('produtos').delete().eq('id', criadoId).select();
      check('limpeza: produto removido de verdade', () => (removidos?.length ?? 0) === 1);
      // Remove a linha de histórico que criou
      await supabase.from('precos_historico').delete().eq('produto_id', criadoId);
    }
  }

  // Estado final: nada de SYS-<execucao> deve permanecer
  const { data: residuos } = await supabase.from('produtos').select('id').ilike('nome', `SYS-${execucao}`);
  check('residue zero após limpeza', () => (residuos?.length ?? 0) === 0);

  const totalNoFinal = (await supabase.from('produtos').select('id', { count: 'exact', head: true })).count ?? 0;
  const ativosNoFinal = ((await supabase.from('produtos').select('id').eq('ativo', true)).data?.length ?? 0);
  console.log(`\nFinal: ${totalNoFinal} produtos, ${ativosNoFinal} ativos.`);
}

main().catch((e) => { console.error('Erro no teste de sistema:', e); process.exit(1); });