import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { extrairPrecoDoHtml, urlDoProduto, USER_AGENT_NAVEGADOR } from './tenda';

// O cron e o botão do painel fazem a mesma coisa; ficam aqui para não voltarem a
// divergir (a versão anterior tinha até nome de coluna diferente em cada rota).

const CONCORRENCIA_MAXIMA = 5;
const TIMEOUT_POR_PRODUTO_MS = 15_000;
const REGIAO_PADRAO = '000010';
const LIMITE_TOKENS_NO_RELATORIO = 10;

export interface ProdutoParaAtualizar {
  id: number;
  token_tenda: string | null;
  url_tenda: string | null;
  preco_atual: number | string | null;
  ultima_atualizacao_preco: string | null;
}

export interface ResultadoAtualizacaoPrecos {
  produtos_verificados: number;
  atualizados: number;
  sem_preco: number;
  erros: { total: number; tokens: string[] };
}

export function criarClienteServico(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave || chave === '[SENSITIVE]') return null;
  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function mapComConcorrencia<T, R>(
  itens: T[],
  limite: number,
  tarefa: (item: T) => Promise<R>,
): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  const operarios = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    for (;;) {
      const indice = proximo;
      proximo += 1;
      if (indice >= itens.length) return;
      resultados[indice] = await tarefa(itens[indice]);
    }
  });
  await Promise.all(operarios);
  return resultados;
}

async function lerPrecoDaPagina(url: string): Promise<number | null> {
  const resposta = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT_NAVEGADOR,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_POR_PRODUTO_MS),
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return extrairPrecoDoHtml(await resposta.text());
}

// `tenda_region_id` é rótulo de catálogo, não parâmetro de preço. O site não
// aceita filial por query string, cookie nem header: o `props.pageProps.branchId`
// vem nulo e o `product.price` é o mesmo em qualquer filial (a filial só muda
// estoque, em `product.inventory[].branchId`). A seleção de loja do site vive no
// cookie `_Tendaatacado-branchID`, escrito pelo navegador, e o servidor ignora.
// O valor fica gravado em `precos_historico.region_id` porque a coluna é FK de
// `regions` e serve para agrupar a série.
async function lerRegiaoDoCatalogo(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('config')
    .select('valor')
    .eq('chave', 'tenda_region_id')
    .maybeSingle();
  const valor = typeof data?.valor === 'string' ? data.valor.trim() : '';
  return valor || REGIAO_PADRAO;
}

function arredondarPreco(preco: number): number {
  return Math.round(preco * 100) / 100;
}

function precoMudou(anterior: number | string | null, atual: number): boolean {
  if (anterior === null || anterior === '') return true;
  const numero = Number(anterior);
  if (!Number.isFinite(numero)) return true;
  return Math.abs(numero - atual) >= 0.005;
}

// A série diária de `precos_historico` é do dia de Brasília, não do dia UTC.
// Com `toISOString()` o registro das 21h às 0h caía no dia seguinte e a série
// ganhava um dia extra (ou perdia, na volta).
const FORMATADOR_DIA_SAO_PAULO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function diaEmSaoPaulo(data: Date = new Date()): string {
  return FORMATADOR_DIA_SAO_PAULO.format(data);
}

export async function atualizarPrecosDosProdutos(
  supabase: SupabaseClient,
  produtos: ProdutoParaAtualizar[],
): Promise<ResultadoAtualizacaoPrecos> {
  const comEndereco = produtos.filter((produto) => urlDoProduto(produto) !== null);
  const resultado: ResultadoAtualizacaoPrecos = {
    produtos_verificados: comEndereco.length,
    atualizados: 0,
    sem_preco: 0,
    erros: { total: 0, tokens: [] },
  };
  if (produtos.length > comEndereco.length) {
    console.warn(
      `Tenda: ${produtos.length - comEndereco.length} produto(s) ativo(s) sem token_tenda nem url_tenda`,
    );
  }
  if (comEndereco.length === 0) return resultado;

  const regionId = await lerRegiaoDoCatalogo(supabase);
  const dia = diaEmSaoPaulo();

  const anotarErro = (identificador: string, motivo: string) => {
    resultado.erros.total += 1;
    if (resultado.erros.tokens.length < LIMITE_TOKENS_NO_RELATORIO) {
      resultado.erros.tokens.push(identificador);
    }
    console.warn(`Tenda: falha em ${identificador}: ${motivo}`);
  };

  const leituras = await mapComConcorrencia(comEndereco, CONCORRENCIA_MAXIMA, async (produto) => {
    const token = produto.token_tenda?.trim();
    const identificador = token || String(produto.id);
    try {
      const preco = await lerPrecoDaPagina(urlDoProduto(produto)!);
      return { produto, identificador, preco, motivo: null as string | null };
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      return { produto, identificador, preco: null as number | null, motivo };
    }
  });

  for (const { produto, identificador, preco, motivo } of leituras) {
    if (motivo) {
      anotarErro(identificador, motivo);
      continue;
    }
    if (preco === null) {
      resultado.sem_preco += 1;
      console.warn(`Tenda: ${identificador} sem preço na página do produto`);
      continue;
    }

    const precoFinal = arredondarPreco(preco);

    // O histórico guarda um registro por produto e por dia, com ou sem mudança
    // de preço. Sem isso a série diária fica com buraco. O `region_id` vem da
    // config e é rótulo de catálogo: o preço é sempre o do site, sem filial.
    const { error: erroHistorico } = await supabase.from('precos_historico').upsert(
      { produto_id: produto.id, dia, preco: precoFinal, region_id: regionId },
      { onConflict: 'produto_id,dia' },
    );
    if (erroHistorico) {
      anotarErro(identificador, `histórico: ${erroHistorico.message}`);
      continue;
    }

    const nuncaAtualizado = produto.ultima_atualizacao_preco === null;
    if (!nuncaAtualizado && !precoMudou(produto.preco_atual, precoFinal)) continue;

    const { error: erroDoProduto } = await supabase
      .from('produtos')
      .update({ preco_atual: precoFinal, ultima_atualizacao_preco: new Date().toISOString() })
      .eq('id', produto.id);
    if (erroDoProduto) {
      anotarErro(identificador, `produto: ${erroDoProduto.message}`);
      continue;
    }

    resultado.atualizados += 1;
  }

  console.log(
    `Tenda: ${resultado.produtos_verificados} verificados, ${resultado.atualizados} atualizados, ` +
      `${resultado.sem_preco} sem preço, ${resultado.erros.total} erros ` +
      `(rótulo de catálogo ${regionId}; o preço lido é o do site, sem filial)`,
  );
  return resultado;
}
