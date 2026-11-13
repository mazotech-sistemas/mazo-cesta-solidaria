import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lê `.env.local` e `.env` de `code/` sem sobrescrever o que já veio do
 * ambiente. `tsx` não carrega `.env` sozinho (quem carrega é o Next), então
 * sem isso `npm run seed` exigiria a chave na mão em toda execução.
 */
export function carregarEnvLocal() {
  for (const nome of ['.env.local', '.env']) {
    const arquivo = path.join(__dirname, '..', nome);
    if (!fs.existsSync(arquivo)) continue;
    for (const linha of fs.readFileSync(arquivo, 'utf-8').split('\n')) {
      const achado = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(linha);
      if (!achado) continue;
      const valor = achado[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[achado[1]] === undefined) process.env[achado[1]] = valor;
    }
  }
}

export function clienteServico() {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definido');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function seed(supabase = clienteServico()) {
  console.log('🌱 Iniciando seed do Cesta Solidária...');

  // 1. Regiões
  const regioes = [
    { region_id: '000010', nome: 'Indaiatuba', ativo: true },
    { region_id: '000020', nome: 'Campinas', ativo: true },
    { region_id: '000030', nome: 'Salto', ativo: true },
  ];

  console.log('📍 Inserindo regiões...');
  for (const r of regioes) {
    const { error } = await supabase
      .from('regions')
      .upsert(r, { onConflict: 'region_id' });
    if (error) console.error(`  Erro região ${r.nome}:`, error.message);
    else console.log(`  ✓ ${r.nome}`);
  }

  // 2. Configs padrão
  const configs = [
    { chave: 'tenda_region_id', valor: '000010' },
    { chave: 'preco_stale_dias', valor: '7' },
  ];

  console.log('⚙️ Inserindo configs...');
  for (const c of configs) {
    const { error } = await supabase
      .from('config')
      .upsert(c, { onConflict: 'chave' });
    if (error) console.error(`  Erro config ${c.chave}:`, error.message);
    else console.log(`  ✓ ${c.chave}`);
  }

  // 3. Produtos do seed CSV
  const csvPath = path.join(__dirname, '../seed/produtos_initial.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo seed não encontrado:', csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  // O CSV tem CRLF no fim de cada linha; sem o trim no cabeçalho o último
  // campo vira "ativo\r" e `row.ativo` fica undefined — o catálogo inteiro
  // entrava como inativo.
  const headers = lines[0].split(',').map((h) => h.trim());

  console.log('📦 Inserindo produtos...');
  let inseridos = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => row[h] = values[idx]?.trim() || '');

    const produto = {
      id: parseInt(row.id) || null,
      nome: row.nome,
      marca: row.marca || null,
      unidade: row.unidade || null,
      qtd_por_cesta: parseFloat(row.qtd_por_cesta) || 1,
      estoque_atual: parseFloat(row.estoque_atual) || 0,
      preco_atual: parseFloat(row.preco_atual) || 0,
      token_tenda: row.token_tenda || null,
      url_tenda: row.url_tenda || null,
      termo_busca: row.termo_busca || null,
      ativo: row.ativo === 'True',
    };

    const { error } = await supabase
      .from('produtos')
      .upsert(produto, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error(`  Erro produto ${produto.nome}:`, error.message);
    } else {
      inseridos++;
      console.log(`  ✓ ${produto.nome}`);
    }
  }

  // Os ids vieram do CSV, então a sequência ficou atrás do maior id da tabela e o
  // próximo produto criado pela tela colidiria na chave primária.
  const { error: erroSequencia } = await supabase.rpc('sincroniza_sequencia_produtos');
  if (erroSequencia) {
    console.error('  Erro ao sincronizar a sequência de produtos:', erroSequencia.message);
  }

  console.log(`\n✅ Seed concluído: ${inseridos} produtos, ${regioes.length} regiões, ${configs.length} configs`);
}

const executadoDireto = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (executadoDireto) {
  carregarEnvLocal();
  seed().catch(console.error);
}
