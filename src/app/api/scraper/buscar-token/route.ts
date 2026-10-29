import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extrairProdutoDaBusca,
  urlDaBusca,
  USER_AGENT_NAVEGADOR,
} from '@/lib/scraper/tenda';

// Preenche o token do produto no cadastro do estoque. Antes consultava a API
// `api.tendaatacado.com.br`, que responde 404; agora lê a página de busca, onde
// cada produto vem com token, nome, marca e preço. Exige sessão: sem isso a rota
// virava proxy aberto para qualquer um mandar o servidor consultar a Tenda.
export const maxDuration = 30;

async function buscarNaPaginaDeBusca(termo: string) {
  const resposta = await fetch(urlDaBusca(termo), {
    headers: {
      'User-Agent': USER_AGENT_NAVEGADOR,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) return null;
  return extrairProdutoDaBusca(await resposta.text());
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { termo_busca } = await request.json();
    const termo = typeof termo_busca === 'string' ? termo_busca.trim() : '';

    if (!termo) {
      return NextResponse.json({ error: 'termo_busca é obrigatório' }, { status: 400 });
    }

    const encontrado = await buscarNaPaginaDeBusca(termo);
    if (!encontrado) {
      return NextResponse.json(
        { error: 'Nenhum produto encontrado na Tenda', token: null },
        { status: 404 },
      );
    }

    return NextResponse.json({
      token: encontrado.token,
      nome: encontrado.nome,
      preco: encontrado.preco,
      marca: encontrado.marca,
    });
  } catch (erro) {
    console.error('Erro ao buscar token:', erro);
    return NextResponse.json(
      {
        error: 'Erro interno',
        message: erro instanceof Error ? erro.message : 'Erro desconhecido',
      },
      { status: 500 },
    );
  }
}
