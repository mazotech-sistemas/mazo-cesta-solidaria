import {
  extrairTamanhoKg,
  produtosDaBuscaOrdenados,
  urlDaBusca,
  USER_AGENT_NAVEGADOR,
  type FaixaDeTamanho,
} from './tenda';

// Busca o termo na página pública da Tenda e devolve os 5 mais baratos.
// O parser e a varredura de fallback vivem em `tenda.ts`, daqui sai só a
// chamada HTTP com User-Agent de navegador, redirect e timeout.
// O nome do candidato precisa conter as palavras do termo (senão o mais barato
// da página pode ser de outra categoria) e a `faixa` restringe o peso:
// resultados fora dela, ou com peso desconhecido, ficam de fora antes do corte.

export { extrairTamanhoKg };

const TIMEOUT_MS = 15_000;

export type ResultadoBuscaTenda = import('./tenda').ResultadoBuscaTenda;

export async function buscarTermoNaTenda(
  termo: string,
  faixa?: FaixaDeTamanho,
): Promise<ResultadoBuscaTenda[]> {
  const texto = termo.trim();
  if (!texto) return [];

  const resposta = await fetch(urlDaBusca(texto), {
    headers: {
      'User-Agent': USER_AGENT_NAVEGADOR,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resposta.ok) return [];

  return produtosDaBuscaOrdenados(await resposta.text(), 5, faixa, texto);
}
