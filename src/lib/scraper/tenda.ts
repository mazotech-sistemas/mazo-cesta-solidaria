// Leitura de preço nas páginas públicas do Tenda Atacado.
//
// A API `api.tendaatacado.com.br/v1/products/search` que o produto usava saiu do
// ar (responde 404 desde outubro de 2026) e o `TENDA_BEARER_TOKEN` não abre mais
// nada. O preço que o site mostra vem no JSON do `<script id="__NEXT_DATA__">` de
// cada página de produto, então é de lá que a gente lê.
//
// Limitação conhecida: não existe seleção de filial estável no lado do servidor.
// Testado em outubro de 2026 na página de produto e na API pública
// (`/api/public/store/product/<token>`): query string (`?branchId=`, `?filial=`,
// `?branch=`, `?regionId=`), cookie (`_Tendaatacado-branchID`, `branchId`,
// `filial`) e header (`x-branch-id`, `branchId`, `filial`) não mudam nada.
// `props.pageProps.branchId` vem `null` e `product.price` é o mesmo em toda
// filial; o que varia por filial é só o estoque (`product.inventory[].branchId`).
// O site guarda a loja escolhida no cookie `_Tendaatacado-branchID`, escrito pelo
// navegador, e o render do servidor não lê esse cookie. Por isso o preço lido é
// sempre o do site, sem filial: `config.tenda_region_id` é referência de
// catálogo (rótulo em `precos_historico.region_id`), não parâmetro de preço.

const BASE_PRODUTO = 'https://www.tendaatacado.com.br/produto/';
const BASE_BUSCA = 'https://www.tendaatacado.com.br/busca?q=';

// Sem User-Agent de navegador o site pode devolver página de bloqueio.
export const USER_AGENT_NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface ProdutoComEnderecoTenda {
  url_tenda?: string | null;
  token_tenda?: string | null;
}

export interface ProdutoDaBuscaTenda {
  token: string;
  nome: string;
  preco: number | null;
  marca: string | null;
}

// Resultado bruto de uma busca: cada item guardou também a url de onde veio,
// para o painel exibir e conferir. O preço aqui é sempre número: `produtosDaBuscaOrdenados`
// já descarta o item com preço nulo antes de devolver.
export interface ResultadoBuscaTenda {
  token: string;
  nome: string;
  preco: number;
  marca: string | null;
  url: string;
  // Peso do produto em kg extraído do nome (ex.: "Arroz 5kg"). `null` quando
  // não há indicação de peso: não dá para garantir que cabe na faixa pedida.
  tamanhoKg: number | null;
  // Texto da embalagem como a Tenda escreve no nome (ex.: "5kg", "900ml",
  // "395g"). É o que vai para `produtos.unidade` e para a tela, para a pessoa
  // achar a mercadoria na prateleira.
  tamanhoTexto: string | null;
}

// `produtosDaBuscaOrdenados` aceita a faixa de tamanho do produto da cesta:
// resultados com peso fora dela (ou com peso desconhecido) ficam de fora.
export interface FaixaDeTamanho {
  min?: number | null;
  max?: number | null;
}

// Palavras que aparecem em quase todo termo e não ajudam a separar categoria:
// "milho de pipoca" precisa casar milho e pipoca, não o "de".
const STOPWORDS_DO_TERMO = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'com',
  'para',
  'sem',
  'em',
  'no',
  'na',
  'tipo',
]);

// A Tenda costuma escrever o peso na descrição; campos separados de
// especificação nem sempre existem, então o nome é a fonte confiável. O padrão
// pega número seguido de kg/g/ml/l e serve para os três usos: normalizar a
// comparação, o valor em kg do filtro e o texto que aparece na tela.
const UNIDADES_DE_PESO = 'kg|g|ml|l';
const PADRAO_TAMANHO = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${UNIDADES_DE_PESO})\\b`);
const PADRAO_TAMANHO_GLOBAL = new RegExp(PADRAO_TAMANHO.source, 'g');

// Minúsculas, sem acento, hífen e barra viram espaço, número colado na unidade
// e espaço repetido colapsado. É a forma usada para comparar termo e nome.
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-/]/g, ' ')
    .replace(PADRAO_TAMANHO_GLOBAL, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palavras que o nome do candidato precisa conter. Stopword e token de uma
// letra ("1" de "arroz tipo 1") não entram na conta.
export function palavrasDoTermo(termo: string): string[] {
  return normalizarTexto(termo)
    .split(' ')
    .filter((palavra) => palavra.length >= 2 && !STOPWORDS_DO_TERMO.has(palavra));
}

// A palavra precisa aparecer inteira: "sal" não casa com "salgado".
function contemPalavra(nomeNormalizado: string, palavra: string): boolean {
  const escapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escapada}([^a-z0-9]|$)`).test(nomeNormalizado);
}

// Filtra os candidatos pelo nome antes de olhar preço. Primeiro tenta exigir
// todas as palavras do termo; se nenhum candidato casar com todas, aceita os
// que casarem com pelo menos metade (mínimo de 2, ou 1 para termo de uma
// palavra). Sem isso o mais barato da página pode ser de outra categoria:
// "milho de pipoca" pegava pipoca doce pronta.
export function candidatosDoTermo(
  termo: string,
  resultados: ResultadoBuscaTenda[],
): ResultadoBuscaTenda[] {
  const palavras = palavrasDoTermo(termo);
  if (palavras.length === 0) return resultados;

  const pontuados = resultados.map((item) => {
    const nome = normalizarTexto(item.nome);
    const casadas = palavras.filter((palavra) => contemPalavra(nome, palavra)).length;
    return { item, casadas };
  });

  const completos = pontuados.filter(({ casadas }) => casadas === palavras.length);
  if (completos.length > 0) return completos.map(({ item }) => item);

  const minimo =
    palavras.length === 1 ? 1 : Math.max(2, Math.ceil(palavras.length / 2));
  return pontuados.filter(({ casadas }) => casadas >= minimo).map(({ item }) => item);
}

function faixaTemRestricao(faixa?: FaixaDeTamanho | null): boolean {
  if (!faixa) return false;
  return (Number(faixa.min) > 0) || (Number(faixa.max) > 0);
}

function dentroDaFaixa(tamanhoKg: number | null, faixa?: FaixaDeTamanho | null): boolean {
  if (!faixaTemRestricao(faixa)) return true;
  if (tamanhoKg === null) return false;
  const min = Number(faixa?.min) || 0;
  const max = Number(faixa?.max) || 0;
  if (min > 0 && tamanhoKg < min) return false;
  if (max > 0 && tamanhoKg > max) return false;
  return true;
}

// Texto da embalagem como veio no nome, sem o espaço entre número e unidade.
export function extrairTamanhoTexto(nome: string): string | null {
  const correspondencia = PADRAO_TAMANHO.exec(nome.toLowerCase());
  if (!correspondencia) return null;
  return `${correspondencia[1]}${correspondencia[2]}`;
}

// Peso do produto em kg, olhando no próprio nome (ex.: "Arroz Tipo 1 5kg").
// Converte a unidade para kg e pega o primeiro tamanho encontrado (o peso do
// produto em si, não o da embalagem).
export function extrairTamanhoKg(nome: string): number | null {
  const correspondencia = PADRAO_TAMANHO.exec(nome.toLowerCase());
  if (!correspondencia) return null;

  const numero = Number(correspondencia[1].replace(',', '.'));
  if (!Number.isFinite(numero)) return null;

  const unidade = correspondencia[2];
  switch (unidade) {
    case 'g':
      return numero / 1000;
    case 'ml':
      return numero / 1000;
    case 'kg':
      return numero;
    case 'l':
      return numero;
    default:
      return null;
  }
}

function lerNome(produto: Record<string, unknown>): string {
  return typeof produto.name === 'string' ? produto.name.trim() : '';
}

function lerMarca(produto: Record<string, unknown>): string | null {
  const marca = typeof produto.brand === 'string' ? produto.brand.trim() : '';
  return marca || null;
}

function lerUrl(produto: Record<string, unknown>, token: string | null): string {
  const url = typeof produto.url === 'string' ? produto.url.trim() : '';
  if (url) return url;
  if (token) return `${BASE_PRODUTO}${encodeURIComponent(token)}`;
  return '';
}

// Todos os produtos com preço válido da página de busca, no máximo 5, do mais
// barato para o mais caro. O caminho `props.initialMobxState.productStore`
// vem de `produtosDaBusca` (com a varredura de fallback), daqui filtramos nome,
// tamanho e ordenamos. O nome vem antes do tamanho: pegar o mais barato de
// outra categoria é pior do que ficar sem preço.
export function produtosDaBuscaOrdenados(
  html: string,
  maximo = 5,
  faixa?: FaixaDeTamanho,
  termo?: string,
): ResultadoBuscaTenda[] {
  const dados = lerNextData(html);
  if (dados === null) return [];

  const comPreco: ResultadoBuscaTenda[] = [];
  for (const item of produtosDaBusca(dados)) {
    const produto = comoObjeto(item);
    if (!produto) continue;
    const preco = lerPreco(produto.price);
    if (preco === null) continue;
    const token = tokenDe(produto);
    if (!token) continue;
    const nome = lerNome(produto) || token;
    comPreco.push({
      token,
      nome,
      preco,
      marca: lerMarca(produto),
      url: lerUrl(produto, token),
      tamanhoKg: extrairTamanhoKg(nome),
      tamanhoTexto: extrairTamanhoTexto(nome),
    });
  }

  const doTermo = termo ? candidatosDoTermo(termo, comPreco) : comPreco;
  const resultados = doTermo.filter((item) => dentroDaFaixa(item.tamanhoKg, faixa));

  resultados.sort((a, b) => a.preco - b.preco);
  return resultados.slice(0, maximo);
}

function comoObjeto(valor: unknown): Record<string, unknown> | null {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

// O `__NEXT_DATA__` é o único bloco JSON confiável da página. Regex serve para
// achar a tag pelo id; o conteúdo quem interpreta é o JSON.parse.
function lerNextData(html: string): unknown {
  const tag = /<script[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!tag) return null;
  try {
    return JSON.parse(tag[1]);
  } catch {
    return null;
  }
}

// O site às vezes manda número, às vezes string ("2.79" ou "2,79").
function lerPreco(valor: unknown): number | null {
  let numero: number;
  if (typeof valor === 'number') {
    numero = valor;
  } else if (typeof valor === 'string') {
    numero = Number(valor.trim().replace(',', '.'));
  } else {
    return null;
  }
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero;
}

export function extrairPrecoDoHtml(html: string): number | null {
  const dados = comoObjeto(lerNextData(html));
  const pageProps = comoObjeto(comoObjeto(dados?.props)?.pageProps);
  const produto = comoObjeto(pageProps?.product);
  if (!produto) return null;
  return lerPreco(produto.price);
}

export function urlDoProduto(produto: ProdutoComEnderecoTenda): string | null {
  const url = produto.url_tenda?.trim();
  if (url) return url;
  const token = produto.token_tenda?.trim();
  if (!token) return null;
  return `${BASE_PRODUTO}${encodeURIComponent(token)}`;
}

export function urlDaBusca(termo: string): string {
  return `${BASE_BUSCA}${encodeURIComponent(termo.trim())}`;
}

function tokenDe(produto: Record<string, unknown>): string | null {
  const token = typeof produto.token === 'string' ? produto.token.trim() : '';
  if (token) return token;
  const url = typeof produto.url === 'string' ? produto.url : '';
  const marca = '/produto/';
  const posicao = url.indexOf(marca);
  if (posicao === -1) return null;
  const resto = url.slice(posicao + marca.length).replace(/\/+$/, '');
  return resto || null;
}

function coletarProdutos(no: unknown, achados: unknown[], restantes = 200): void {
  if (restantes <= 0 || achados.length >= 50) return;
  if (Array.isArray(no)) {
    for (const item of no) coletarProdutos(item, achados, restantes - 1);
    return;
  }
  const objeto = comoObjeto(no);
  if (!objeto) return;
  if (typeof objeto.url === 'string' && objeto.url.includes('/produto/') && 'price' in objeto) {
    achados.push(objeto);
    return;
  }
  for (const valor of Object.values(objeto)) coletarProdutos(valor, achados, restantes - 1);
}

// A página de busca guarda os produtos em `props.initialMobxState.productStore`,
// mas o caminho já mudou de lugar outras vezes. Quando ele não existe, varre o
// JSON atrás do primeiro objeto que tenha url de produto e preço.
function produtosDaBusca(dados: unknown): unknown[] {
  const props = comoObjeto(comoObjeto(dados)?.props);
  const loja = comoObjeto(comoObjeto(props?.initialMobxState)?.productStore);
  const produtos = loja?.products;
  if (Array.isArray(produtos)) return produtos;

  const achados: unknown[] = [];
  coletarProdutos(dados, achados);
  return achados;
}

export function extrairProdutoDaBusca(html: string): ProdutoDaBuscaTenda | null {
  const dados = lerNextData(html);
  if (dados === null) return null;

  for (const bruto of produtosDaBusca(dados)) {
    const produto = comoObjeto(bruto);
    if (!produto) continue;
    const token = tokenDe(produto);
    if (!token) continue;
    return {
      token,
      nome: lerNome(produto) || token,
      preco: lerPreco(produto.price),
      marca: lerMarca(produto),
    };
  }

  return null;
}
