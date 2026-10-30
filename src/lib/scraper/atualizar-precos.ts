import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buscarTermoNaTenda } from './buscar-termo';
import { extrairTamanhoKg, type FaixaDeTamanho, type ResultadoBuscaTenda } from './tenda';

// O cron e o botão do painel fazem a mesma coisa; ficam aqui para não voltarem a
// divergir (a versão anterior tinha até nome de coluna diferente em cada rota).

const CONCORRENCIA_MAXIMA = 5;
const REGIAO_PADRAO = '000010';
const LIMITE_IDENTIFICADORES_NO_RELATORIO = 10;

// O item já escolhido só troca de marca quando outro fica mais de 10% abaixo
// do preço dele. Abaixo disso, mantém o que está gravado: o objetivo é a
// marca não pular de um dia para o outro por diferença de centavos.
const MARGEM_DE_TROCA = 0.1;

// A faixa de tamanho sai do próprio termo: "arroz tipo 1 5kg" aceita de 4 a
// 6 kg. É folga suficiente para o mesmo item vendido em embalagem vizinha,
// sem deixar entrar o pacote de 10 kg.
const MARGEM_DA_FAIXA = 0.2;

export interface ProdutoParaAtualizar {
  id: number;
  termo_busca: string | null;
  token_tenda: string | null;
  preco_atual: number | string | null;
}

export interface ResultadoAtualizacaoPrecos {
  produtos_verificados: number;
  atualizados: number;
  mantidos: number;
  sem_preco: number;
  sem_tamanho: number;
  erros: { total: number; identificadores: string[] };
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

// `tenda_region_id` é rótulo de catálogo, não parâmetro de preço. O site não
// aceita filial por query string, cookie nem header: o `props.pageProps.branchId`
// vem nulo e o `product.price` é o mesmo em qualquer filial (a filial só muda
// estoque, em `product.inventory[].branchId`). O valor fica gravado em
// `precos_historico.region_id` porque a coluna é FK de `regions` e serve para
// agrupar a série.
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

function precoAnteriorDe(valor: number | string | null): number | null {
  const numero = Number(valor);
  if (valor === null || valor === '' || !Number.isFinite(numero) || numero <= 0) {
    return null;
  }
  return numero;
}

function arredondarMedida(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// Faixa de peso deduzida do termo de busca. Termo sem tamanho ("miojo",
// "biscoito cream cracker") devolve faixa vazia, que não filtra nada.
export function faixaDoTermo(termo: string): FaixaDeTamanho {
  const tamanho = extrairTamanhoKg(termo);
  if (tamanho === null || tamanho <= 0) return {};
  return {
    min: arredondarMedida(tamanho * (1 - MARGEM_DA_FAIXA)),
    max: arredondarMedida(tamanho * (1 + MARGEM_DA_FAIXA)),
  };
}

function faixaTemRestricao(faixa: FaixaDeTamanho): boolean {
  return (Number(faixa.min) > 0) || (Number(faixa.max) > 0);
}

function itemDoToken(
  itens: ResultadoBuscaTenda[],
  token: string | null,
): ResultadoBuscaTenda | null {
  const procurado = token?.trim();
  if (!procurado) return null;
  return itens.find((item) => item.token === procurado) ?? null;
}

// O item atual continua na prateleira e não está caro o bastante para justificar
// a troca: o preço dele pode subir até 10% acima do mais barato que ainda vale.
function dentroDaMargemDeTroca(precoAtual: number, maisBarato: number): boolean {
  if (maisBarato <= 0) return false;
  const diferenca = (precoAtual - maisBarato) / maisBarato;
  return diferenca <= MARGEM_DE_TROCA + 1e-9;
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
  const comTermo = produtos.filter(
    (produto) => (produto.termo_busca ?? '').trim() !== '',
  );
  const resultado: ResultadoAtualizacaoPrecos = {
    produtos_verificados: comTermo.length,
    atualizados: 0,
    mantidos: 0,
    sem_preco: 0,
    sem_tamanho: 0,
    erros: { total: 0, identificadores: [] },
  };
  if (produtos.length > comTermo.length) {
    console.warn(
      `Tenda: ${produtos.length - comTermo.length} produto(s) ativo(s) sem termo_busca`,
    );
  }
  if (comTermo.length === 0) return resultado;

  const regionId = await lerRegiaoDoCatalogo(supabase);
  const dia = diaEmSaoPaulo();

  const anotarErro = (identificador: string, motivo: string) => {
    resultado.erros.total += 1;
    if (resultado.erros.identificadores.length < LIMITE_IDENTIFICADORES_NO_RELATORIO) {
      resultado.erros.identificadores.push(identificador);
    }
    console.warn(`Tenda: falha em ${identificador}: ${motivo}`);
  };

  const buscas = await mapComConcorrencia(comTermo, CONCORRENCIA_MAXIMA, async (produto) => {
    const termo = (produto.termo_busca ?? '').trim();
    const identificador = `#${produto.id} ${termo}`.trim();
    const faixa = faixaDoTermo(termo);
    try {
      const itens = await buscarTermoNaTenda(termo, faixa);
      return { produto, identificador, itens, faixa, erro: null as string | null };
    } catch (excecao) {
      const motivo = excecao instanceof Error ? excecao.message : String(excecao);
      return { produto, identificador, itens: [] as ResultadoBuscaTenda[], faixa, erro: motivo };
    }
  });

  for (const { produto, identificador, itens, faixa, erro } of buscas) {
    if (erro) {
      anotarErro(identificador, erro);
      continue;
    }

    if (itens.length === 0) {
      // Sem resultado dentro da faixa (ou sem resultado nenhum na busca). O
      // preço anterior continua valendo e o histórico de hoje não ganha linha
      // (só grava quando existe preço confirmado).
      if (faixaTemRestricao(faixa)) {
        resultado.sem_tamanho += 1;
        console.warn(
          `Tenda: ${identificador} sem resultado dentro da faixa ${fmtFaixa(faixa)}, preço anterior mantido`,
        );
      } else {
        resultado.sem_preco += 1;
        console.warn(`Tenda: ${identificador} sem resultado na busca, preço anterior mantido`);
      }
      continue;
    }

    const maisBarato = itens[0];
    const itemAtual = itemDoToken(itens, produto.token_tenda);
    const precoAtual = precoAnteriorDe(produto.preco_atual);
    const mantem =
      itemAtual !== null &&
      precoAtual !== null &&
      dentroDaMargemDeTroca(precoAtual, maisBarato.preco);
    const escolhido = mantem && itemAtual ? itemAtual : maisBarato;
    const precoFinal = arredondarPreco(escolhido.preco);

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

    // Marca e unidade só são sobrescritas quando vieram preenchidas: nome
    // ausente na Tenda não pode apagar o que já está na ficha do item.
    const { error: erroDoProduto } = await supabase
      .from('produtos')
      .update({
        preco_atual: precoFinal,
        token_tenda: escolhido.token,
        ...(escolhido.url ? { url_tenda: escolhido.url } : {}),
        ...(escolhido.marca ? { marca: escolhido.marca } : {}),
        ...(escolhido.tamanhoTexto ? { unidade: escolhido.tamanhoTexto } : {}),
        ultima_atualizacao_preco: new Date().toISOString(),
      })
      .eq('id', produto.id);
    if (erroDoProduto) {
      anotarErro(identificador, `produto: ${erroDoProduto.message}`);
      continue;
    }

    if (mantem) {
      resultado.mantidos += 1;
    } else {
      resultado.atualizados += 1;
    }
  }

  console.log(
    `Tenda: ${resultado.produtos_verificados} verificados, ${resultado.atualizados} atualizados, ` +
      `${resultado.mantidos} mantidos, ${resultado.sem_preco} sem preço, ` +
      `${resultado.sem_tamanho} sem tamanho, ${resultado.erros.total} erros ` +
      `(rótulo de catálogo ${regionId}; o preço lido é o do site, sem filial)`,
  );
  return resultado;
}

function tamanhoDe(valor: number | string | null): number {
  if (valor === null || valor === '') return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function fmtFaixa(faixa: FaixaDeTamanho): string {
  const min = tamanhoDe(faixa.min ?? null);
  const max = tamanhoDe(faixa.max ?? null);
  if (min === 0 && max === 0) return 'qualquer';
  return `${min || '0'}-${max || 'inf'} kg`;
}
