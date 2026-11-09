// Lógica de detecção de preço desatualizado, compartilhada entre a tela de
// Estoque e o BDD. Mantida aqui (não em componente) para os testes de
// comportamento poderem importar sem React.
//
// Um produto está desatualizado quando `ultima_atualizacao_preco` é nulo ou
// é anterior a `hoje - dias`. A comparação é em data UTC (o `dia` gravado
// pelo scraper já é em America/Sao_Paulo, ver `diaEmSaoPaulo` em
// `src/lib/scraper/atualizar-precos.ts`).

export function precoDesatualizado(
  ultimaAtualizacao: string | null | undefined,
  dias: number,
): boolean {
  if (!ultimaAtualizacao) return true;
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  const ultimo = new Date(ultimaAtualizacao);
  return ultimo < limite;
}

export function idadePrecoDias(
  ultimaAtualizacao: string | null | undefined,
): number | null {
  if (!ultimaAtualizacao) return null;
  const ultimo = new Date(ultimaAtualizacao);
  const diffMs = Date.now() - ultimo.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}