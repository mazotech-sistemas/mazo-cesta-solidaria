import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Backups vivem no Storage do Supabase, não em tabela. Isso evita depender de
// migração de banco: o bucket é criado na primeira gravação e o índice fica num
// JSON pequeno (`_indice.json`) que a tela de Usuários lê.

export const BUCKET_BACKUPS = 'backups';
const OBJETO_INDICE = '_indice.json';
const MAX_REGISTROS = 50;

export type RegistroBackup = {
  id: string;
  criado_em: string;
  autor: string;
  linhas: number;
  arquivo: string;
  bytes: number;
};

// `2026-10-29T03:00:00.000Z` -> `backup-2026-10-29T03-00-00-000Z.json`
export function nomeArquivo(iso: string): string {
  return `backup-${iso.replace(/[:.]/g, '-')}.json`;
}

export function contarLinhas(conteudo: Record<string, unknown>): number {
  return Object.values(conteudo).reduce<number>(
    (total, valor) => total + (Array.isArray(valor) ? valor.length : 0),
    0,
  );
}

export function normalizarIndice(bruto: unknown): RegistroBackup[] {
  if (!Array.isArray(bruto)) return [];
  const registros: RegistroBackup[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.arquivo !== 'string' || typeof r.criado_em !== 'string') continue;
    registros.push({
      id: typeof r.id === 'string' ? r.id : r.arquivo,
      criado_em: r.criado_em,
      autor: typeof r.autor === 'string' ? r.autor : 'desconhecido',
      linhas: typeof r.linhas === 'number' ? r.linhas : 0,
      arquivo: r.arquivo,
      bytes: typeof r.bytes === 'number' ? r.bytes : 0,
    });
  }
  return registros;
}

// Cliente com service role. Só roda no servidor; devolve null quando a chave
// não está no ambiente (build local sem .env, por exemplo).
export function clienteServico(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave || chave === '[SENSITIVE]') return null;
  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function garantirBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(BUCKET_BACKUPS, { public: false });
  // Bucket já existente devolve erro; qualquer outro erro vai aparecer no
  // upload, que é o passo que realmente importa.
  if (error && !/already exists|duplicate|já existe/i.test(error.message)) {
    console.warn('Bucket de backup:', error.message);
  }
}

export async function lerIndice(admin: SupabaseClient): Promise<RegistroBackup[]> {
  const { data, error } = await admin.storage.from(BUCKET_BACKUPS).download(OBJETO_INDICE);
  if (error || !data) return [];
  try {
    return normalizarIndice(JSON.parse(await data.text()));
  } catch {
    return [];
  }
}

export async function salvarBackup(
  admin: SupabaseClient,
  conteudo: Record<string, unknown>,
  autor: string,
): Promise<RegistroBackup> {
  await garantirBucket(admin);

  const geradoEm =
    typeof conteudo.gerado_em === 'string' ? conteudo.gerado_em : new Date().toISOString();
  const arquivo = nomeArquivo(geradoEm);
  const corpo = JSON.stringify(conteudo, null, 2);

  const { error } = await admin.storage
    .from(BUCKET_BACKUPS)
    .upload(arquivo, corpo, { contentType: 'application/json', upsert: true });
  if (error) throw new Error(error.message);

  const registro: RegistroBackup = {
    id: arquivo,
    criado_em: geradoEm,
    autor,
    linhas: contarLinhas(conteudo),
    arquivo,
    bytes: Buffer.byteLength(corpo, 'utf8'),
  };

  const indice = await lerIndice(admin);
  const atualizado = [registro, ...indice.filter((r) => r.arquivo !== arquivo)].slice(
    0,
    MAX_REGISTROS,
  );
  const { error: erroIndice } = await admin.storage
    .from(BUCKET_BACKUPS)
    .upload(OBJETO_INDICE, JSON.stringify(atualizado, null, 2), {
      contentType: 'application/json',
      upsert: true,
    });
  if (erroIndice) throw new Error(`Falha ao atualizar índice: ${erroIndice.message}`);

  return registro;
}

// Lista os últimos backups. Usa o índice; se ele se perder, cai para a listagem
// crua do bucket (sem autor e sem contagem).
export async function listarBackups(limite = 10): Promise<RegistroBackup[]> {
  const admin = clienteServico();
  if (!admin) return [];

  const indice = await lerIndice(admin);
  if (indice.length > 0) return indice.slice(0, limite);

  const { data } = await admin.storage
    .from(BUCKET_BACKUPS)
    .list('', { limit: limite, sortBy: { column: 'created_at', order: 'desc' } });

  return (data ?? [])
    .filter((obj) => obj.name.endsWith('.json') && obj.name !== OBJETO_INDICE)
    .slice(0, limite)
    .map((obj) => ({
      id: obj.name,
      criado_em: obj.created_at ?? '',
      autor: 'desconhecido',
      linhas: 0,
      arquivo: obj.name,
      bytes: Number(obj.metadata?.size ?? 0),
    }));
}
