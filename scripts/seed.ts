import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definido');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
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
  const headers = lines[0].split(',');

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

  console.log(`\n✅ Seed concluído: ${inseridos} produtos, ${regioes.length} regiões, ${configs.length} configs`);
}

seed().catch(console.error);