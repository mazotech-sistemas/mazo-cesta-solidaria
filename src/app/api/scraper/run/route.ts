import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  atualizarPrecosDosProdutos,
  criarClienteServico,
  type ProdutoParaAtualizar,
} from '@/lib/scraper/atualizar-precos';

// Botão do painel. Mesmo caminho do cron: lê a página pública de cada produto.
// A `api.tendaatacado.com.br` responde 404 e o TENDA_BEARER_TOKEN não é mais usado.
export const maxDuration = 60;

export async function POST(): Promise<Response> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const admin = criarClienteServico();
    if (!admin) {
      return NextResponse.json({ error: 'Configuração Supabase ausente' }, { status: 500 });
    }

    const { data: produtos, error } = await admin
      .from('produtos')
      .select('id, token_tenda, url_tenda, preco_atual, ultima_atualizacao_preco')
      .eq('ativo', true);

    if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);

    const resultado = await atualizarPrecosDosProdutos(
      admin,
      (produtos ?? []) as ProdutoParaAtualizar[],
    );

    return NextResponse.json(resultado);
  } catch (erro) {
    console.error('Erro no scraper:', erro);
    return NextResponse.json(
      {
        error: 'Erro interno',
        message: erro instanceof Error ? erro.message : 'Erro desconhecido',
      },
      { status: 500 },
    );
  }
}
