import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const EMAIL_ADMIN = process.env.CESTA_E2E_ADMIN_EMAIL || 'admin@cestasolidaria.org';
const SENHA_ADMIN = process.env.CESTA_E2E_ADMIN_SENHA || 'senha123';

function lerArquivoEnv(nome: string): Record<string, string> {
  const caminho = path.resolve(process.cwd(), nome);
  if (!fs.existsSync(caminho)) return {};
  const pares: Record<string, string> = {};
  for (const linha of fs.readFileSync(caminho, 'utf8').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const corte = limpa.indexOf('=');
    if (corte < 0) continue;
    const chave = limpa.slice(0, corte).trim();
    const valor = limpa.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
    if (chave) pares[chave] = valor;
  }
  return pares;
}

function resolverCredenciais() {
  const arquivos = { ...lerArquivoEnv('.env.local'), ...lerArquivoEnv('.env') };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || arquivos.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || arquivos.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY para limpar os produtos de teste'
    );
  }
  return { url, anon };
}

let cliente: SupabaseClient | null = null;

async function clienteAdmin(): Promise<SupabaseClient> {
  if (cliente) return cliente;
  const { url, anon } = resolverCredenciais();
  const supabase = createClient(url, anon);
  const { error } = await supabase.auth.signInWithPassword({
    email: EMAIL_ADMIN,
    password: SENHA_ADMIN,
  });
  if (error) throw new Error('Falha ao autenticar para limpeza: ' + error.message);
  cliente = supabase;
  return supabase;
}

/**
 * Soft delete igual ao usado pela tela de estoque (update ativo = false).
 * Remove pelo nome exato, que os specs geram com marcador unico por execucao.
 */
export async function excluirProdutosDeTeste(nomes: string[]): Promise<number> {
  const alvos = [...new Set(nomes.filter(Boolean))];
  if (alvos.length === 0) return 0;
  const supabase = await clienteAdmin();
  const { error, count } = await supabase
    .from('produtos')
    .update({ ativo: false }, { count: 'exact' })
    .in('nome', alvos)
    .eq('ativo', true);
  if (error) throw new Error('Falha ao excluir produtos de teste: ' + error.message);
  return count ?? 0;
}

/** Marcador unico por execucao, para nao apagar produto de execucao anterior por engano. */
export function marcadorExecucao(): string {
  return process.env.E2E_RUN_ID || Date.now().toString(36);
}

/**
 * Compras salvas pela suite carregam o nome do produto de teste dentro do JSON `itens`.
 * Remove pelo nome do produto (unico por execucao), usando o mesmo delete da tela de historico.
 */
export async function excluirComprasDeTeste(nomes: string[]): Promise<number> {
  const alvos = [...new Set(nomes.filter(Boolean))];
  if (alvos.length === 0) return 0;
  const supabase = await clienteAdmin();
  const { data, error } = await supabase.from('compras').select('id,itens').limit(2000);
  if (error) throw new Error('Falha ao listar compras para limpeza: ' + error.message);
  const ids = (data || [])
    .filter((compra) => {
      const itens = Array.isArray(compra.itens) ? compra.itens : [];
      return itens.some((item: { nome?: string }) => item?.nome && alvos.includes(item.nome));
    })
    .map((compra) => compra.id);
  if (ids.length === 0) return 0;
  const { error: erroDelete } = await supabase.from('compras').delete().in('id', ids);
  if (erroDelete) throw new Error('Falha ao excluir compras de teste: ' + erroDelete.message);
  return ids.length;
}

/** Limpa tudo que a execucao criou: compras primeiro, depois os produtos. */
export async function limparDadosDeTeste(nomes: string[]): Promise<{ produtos: number; compras: number }> {
  const compras = await excluirComprasDeTeste(nomes);
  const produtos = await excluirProdutosDeTeste(nomes);
  return { produtos, compras };
}
