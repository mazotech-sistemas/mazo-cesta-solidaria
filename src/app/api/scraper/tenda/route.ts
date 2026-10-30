import { NextResponse } from 'next/server';
import {
  atualizarPrecosDosProdutos,
  criarClienteServico,
  type ProdutoParaAtualizar,
} from '@/lib/scraper/atualizar-precos';

// Cron diário. Busca o `termo_busca` de cada produto ativo na página de busca
// da Tenda, escolhe o mais barato e grava preço, marca e histórico.
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  // Se o segredo estiver configurado, ele é obrigatório. Se não estiver, a
  // rota responde 503 em vez de ficar aberta para chamadas anônimas.
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET não configurado' },
      { status: 503 },
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = criarClienteServico();
  if (!supabase) {
    return NextResponse.json({ error: 'Configuração Supabase ausente' }, { status: 500 });
  }

  try {
    const { data: produtos, error } = await supabase
      .from('produtos')
      .select('id, termo_busca, token_tenda, preco_atual')
      .eq('ativo', true);

    if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);

    const resultado = await atualizarPrecosDosProdutos(
      supabase,
      (produtos ?? []) as ProdutoParaAtualizar[],
    );

    return NextResponse.json({
      ...resultado,
      relatorio_cesta: resultado.relatorio_cesta ?? undefined,
    });
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
