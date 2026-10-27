import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tendaBearerToken = process.env.TENDA_BEARER_TOKEN!;

const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TendaProduct {
  id: string;
  name: string;
  price: number;
  brand?: string;
  unit?: string;
  imageUrl?: string;
}

async function fetchTendaProducts(regionId: string, searchTerms: string[]): Promise<TendaProduct[]> {
  const products: TendaProduct[] = [];

  for (const term of searchTerms) {
    try {
      const url = `https://api.tendaatacado.com.br/v1/products/search?q=${encodeURIComponent(term)}&region=${regionId}&limit=20`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tendaBearerToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        console.warn(`Tenda API error for "${term}": ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        products.push(...data.products);
      }
    } catch (err) {
      console.error(`Erro ao buscar "${term}":`, err);
    }
  }

  return products;
}

async function runScraper(produtos: Array<{ id: number; token_tenda: string; termo_busca: string | null }>): Promise<number> {
  const { data: config } = await supabaseAdmin
    .from('config')
    .select('valor')
    .eq('chave', 'tenda_region_id')
    .single();

  const regionId = config?.valor || '000010';

  const searchMap = new Map<string, number[]>();
  for (const p of produtos) {
    if (p.token_tenda) {
      const term = p.termo_busca || p.token_tenda;
      if (!searchMap.has(term)) searchMap.set(term, []);
      searchMap.get(term)!.push(p.id);
    }
  }

  const searchTerms = Array.from(searchMap.keys());
  if (searchTerms.length === 0) {
    console.log('Nenhum produto com token_tenda para buscar');
    return 0;
  }

  console.log(`Buscando ${searchTerms.length} termos na Tenda para região ${regionId}...`);
  const tendaProducts = await fetchTendaProducts(regionId, searchTerms);

  const tendaByToken = new Map<string, TendaProduct>();
  for (const tp of tendaProducts) {
    if (tp.id) tendaByToken.set(tp.id, tp);
  }

  let atualizados = 0;
  for (const [term, produtoIds] of searchMap.entries()) {
    const tendaProd = tendaByToken.get(term);
    if (!tendaProd) {
      console.warn(`Produto "${term}" não encontrado na Tenda`);
      continue;
    }

    const preco = tendaProd.price;
    const agora = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('produtos')
      .update({
        preco_atual: preco,
        ultimaAtualizacao_preco: agora,
      })
      .in('id', produtoIds);

    if (updateError) {
      console.error(`Erro ao atualizar produtos ${ produtoIds.join(',') }:`, updateError.message);
      continue;
    }

    const historicoEntries = produtoIds.map(pid => ({
      produto_id: pid,
      preco,
      dia: new Date().toISOString().split('T')[0],
      region_id: regionId,
    }));

    const { error: histError } = await supabaseAdmin
      .from('precos_historico')
      .upsert(historicoEntries, { onConflict: 'produto_id,dia' });

    if (histError) {
      console.error(`Erro ao inserir histórico para ${ produtoIds.join(',') }:`, histError.message);
    } else {
      atualizados += produtoIds.length;
      console.log(`  ✓ ${ atualizados } produtos atualizados (preço: R$ ${ preco.toFixed(2) })`);
    }
  }

  return atualizados;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: produtos, error } = await supabaseAdmin
      .from('produtos')
      .select('id, token_tenda, termo_busca')
      .eq('ativo', true)
      .not('token_tenda', 'is', null);

    if (error) {
      throw new Error(`Erro ao buscar produtos: ${ error.message }`);
    }

    if (!produtos || produtos.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum produto com token_tenda', updated: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const atualizados = await runScraper(produtos);

    return new Response(JSON.stringify({
      message: 'Scraper executado com sucesso',
      produtos_verificados: produtos.length,
      precosAtualizados: atualizados,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Erro no scraper:', err);
    return new Response(JSON.stringify({
      error: 'Erro interno',
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}