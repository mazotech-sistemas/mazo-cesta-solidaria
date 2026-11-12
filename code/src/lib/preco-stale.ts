// Lógica de detecção de preço desatualizado, compartilhada entre a tela de
// Estoque e o BDD. Mantida aqui (não em componente) para os testes de
// comportamento poderem importar sem React.
//
// Um produto está desatualizado quando `ultima_atualizacao_preco` é nulo ou
// é anterior a `hoje - dias`. A comparação usa o fuso America/Sao_Paulo
// (o `dia` gravado pelo scraper já é nesse fuso, ver `diaEmSaoPaulo` em
// `src/lib/scraper/atualizar-precos.ts`).

const FUSO = 'America/Sao_Paulo';

// Formata YYYY-MM-DD no fuso America/Sao_Paulo para a data dada (ou agora).
function hojeNoFuso(data: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(data);
}

// Converte string de data (ISO ou YYYY-MM-DD) para Date normalizada ao meio-dia UTC
// representando o dia em America/Sao_Paulo.
function parseDataFuso(dataStr: string): Date {
  if (dataStr.includes('T')) {
    return new Date(dataStr);
  }
  // Assume YYYY-MM-DD no fuso America/Sao_Paulo -> cria Date ao meio-dia
  return new Date(`${dataStr}T12:00:00-03:00`);
}

// Core da comparação: recebe "hoje" já resolvido em UTC (meia-noite do dia no fuso)
// e a string da última atualização. Usado pelos testes para injetar "hoje" fixo.
function precoDesatualizadoCore(
  ultimaAtualizacao: string | null | undefined,
  dias: number,
  hojeUTC: Date,
): boolean {
  if (!ultimaAtualizacao) return true;
  const limite = new Date(hojeUTC);
  limite.setUTCDate(limite.getUTCDate() - dias);
  const ultimo = parseDataFuso(ultimaAtualizacao);
  const ultimoDia = new Date(Date.UTC(ultimo.getUTCFullYear(), ultimo.getUTCMonth(), ultimo.getUTCDate()));
  return ultimoDia < limite;
}

function idadePrecoDiasCore(
  ultimaAtualizacao: string | null | undefined,
  hojeUTC: Date,
): number | null {
  if (!ultimaAtualizacao) return null;
  const ultimo = parseDataFuso(ultimaAtualizacao);
  const ultimoDia = new Date(Date.UTC(ultimo.getUTCFullYear(), ultimo.getUTCMonth(), ultimo.getUTCDate()));
  const diffMs = hojeUTC.getTime() - ultimoDia.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

export function precoDesatualizado(
  ultimaAtualizacao: string | null | undefined,
  dias: number,
): boolean {
  const hojeStr = hojeNoFuso();
  const [ano, mes, dia] = hojeStr.split('-').map(Number);
  const hojeUTC = new Date(Date.UTC(ano, mes - 1, dia));
  return precoDesatualizadoCore(ultimaAtualizacao, dias, hojeUTC);
}

export function idadePrecoDias(
  ultimaAtualizacao: string | null | undefined,
): number | null {
  const hojeStr = hojeNoFuso();
  const [ano, mes, dia] = hojeStr.split('-').map(Number);
  const hojeUTC = new Date(Date.UTC(ano, mes - 1, dia));
  return idadePrecoDiasCore(ultimaAtualizacao, hojeUTC);
}

// Exporta as funções core para testes com data de referência injetável
export { precoDesatualizadoCore, idadePrecoDiasCore };