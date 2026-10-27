import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tendaBearerToken = process.env.TENDA_BEARER_TOKEN!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TendaSearchResult {
  products: Array<{
    id: string;
    name: string;
    price: number;
    brand?: string;
    unit?: string;
  }>;
}

async function buscarTenda(termo: string, regionId: string): Promise<TendaSearchResult | null> {
  const url = `https://api.tendaatacado.com.br/v1/products/search?q=${encodeURIComponent(termo)}&region=${regionId}&limit=5`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${tendaBearerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { termo_busca, region_id } = await request.json();

    if (!termo_busca) {
      return new Response(JSON.stringify({ error: 'termo_busca é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: config } = await supabase
      .from('config')
      .select('valor')
      .eq('chave', 'tenda_region_id')
      .single();

    const regionId = region_id || config?.valor || '000010';
    const data = await buscarTenda(termo_busca, regionId);

    if (!data || !data.products || data.products.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum produto encontrado na Tenda', token: null }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const primeiro = data.products[0];

    return new Response(JSON.stringify({
      token: primeiro.id,
      nome: primeiro.name,
      preço: primeiro.price,
      marca: primeiro.brand || null,
      unidade: primeiro.unit || null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Erro ao buscar token:', err);
    return new Response(JSON.stringify({
      error: 'Erro interno',
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}