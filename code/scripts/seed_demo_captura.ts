/**
 * Seed de demonstração para captura de mídia (prints + vídeo).
 *
 * Roda o seed base (`scripts/seed.ts`), garante o admin de login, cria dois
 * voluntários fictícios, deixa o estoque coerente com `qtd_por_cesta`, marca
 * dois produtos com preço vencido, grava histórico de preço e quatro compras
 * recentes para as telas de dashboard e histórico ficarem vivas.
 *
 * Idempotente: usuários são criados só se faltarem, compras demo são apagadas
 * e recriadas, preços fazem upsert por (produto_id, dia).
 *
 * Uso:
 *   cd produtos/mazo-cesta-solidaria/code
 *   npx tsx scripts/seed_demo_captura.ts
 *
 * Lê .env.local (ou .env) de `code/` para a URL e a service_role key.
 * Todos os dados são fictícios: nenhum nome, e-mail ou telefone real.
 */

import { carregarEnvLocal, clienteServico, seed } from './seed';

carregarEnvLocal();

const ADMIN = {
  email: 'admin@cestasolidaria.org',
  senha: 'senha123',
  nome: 'Marta Oliveira',
};
const VOLUNTARIOS = [
  { email: 'ana.voluntaria@cestasolidaria.org', senha: 'senha123', nome: 'Ana Ribeiro' },
  { email: 'carlos.voluntario@cestasolidaria.org', senha: 'senha123', nome: 'Carlos Menezes' },
];

const REGIAO = '000010';

/** Estoque saudável por item, coerente com o qtd_por_cesta de cada produto. */
const ESTOQUE_SAUDAVEL: Record<number, number> = {
  29: 2, 2: 45, 25: 18, 13: 18, 12: 18, 14: 40, 7: 12, 15: 22, 31: 20,
  9: 30, 32: 26, 6: 28, 30: 16, 26: 40, 8: 26, 10: 18, 16: 20, 5: 34,
  3: 44, 4: 30, 17: 20, 28: 36, 1: 20, 27: 32, 23: 2, 11: 20,
};

/** Dias atrás da última leitura de preço. Ausente = 2 dias. */
const PRECO_VENCIDO: Record<number, number> = { 7: 21, 26: 24 };

const HISTORICO: Array<{ produto_id: number; precos: number[] }> = [
  { produto_id: 25, precos: [17.4, 17.4, 17.9, 17.9, 17.9, 17.9] },
  { produto_id: 26, precos: [6.59, 6.59, 6.89, 6.89, 6.89, 6.89] },
  { produto_id: 1, precos: [6.99, 6.99, 7.35, 7.35, 7.35, 7.35] },
  { produto_id: 2, precos: [2.69, 2.69, 2.79, 2.79, 2.79, 2.79] },
  { produto_id: 7, precos: [19.9, 20.59, 20.59, 20.59, 20.59, 20.59] },
];

type ItemDemo = { produto_id: number; nome: string; preco: number; quantidade: number; qtd_por_cesta: number };

const CESTA_BASE: ItemDemo[] = [
  { produto_id: 25, nome: 'Arroz Tipo 1 (5kg)', preco: 17.9, quantidade: 2, qtd_por_cesta: 2 },
  { produto_id: 26, nome: 'Feijão Carioca (1kg)', preco: 6.89, quantidade: 3, qtd_por_cesta: 3 },
  { produto_id: 1, nome: 'Óleo de Soja (900ml)', preco: 7.35, quantidade: 3, qtd_por_cesta: 3 },
  { produto_id: 2, nome: 'Açúcar (1kg)', preco: 2.79, quantidade: 5, qtd_por_cesta: 5 },
];

const COMPRAS_DEMO: Array<{ diasAtras: number; cestas: number; itens: ItemDemo[] }> = [
  { diasAtras: 1, cestas: 10, itens: CESTA_BASE },
  {
    diasAtras: 5,
    cestas: 6,
    itens: [
      ...CESTA_BASE,
      { produto_id: 7, nome: 'Café Torrado e Moído (500g)', preco: 20.59, quantidade: 1, qtd_por_cesta: 1 },
    ],
  },
  {
    diasAtras: 10,
    cestas: 8,
    itens: [
      ...CESTA_BASE,
      { produto_id: 5, nome: 'Macarrão Espaguete com Ovos (500g)', preco: 2.59, quantidade: 2, qtd_por_cesta: 2 },
      { produto_id: 28, nome: 'Molho de Tomate (300g)', preco: 1.39, quantidade: 2, qtd_por_cesta: 2 },
    ],
  },
  { diasAtras: 16, cestas: 4, itens: CESTA_BASE },
];

function diasAtras(dias: number, hora = 10) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  data.setHours(hora, 15, 0, 0);
  return data;
}

function diaISO(dias: number) {
  return diasAtras(dias).toISOString().slice(0, 10);
}

async function garantirUsuario(
  supabase: ReturnType<typeof clienteServico>,
  pessoa: { email: string; senha: string; nome: string },
  isAdmin: boolean,
) {
  const { data: lista, error: erroLista } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (erroLista) throw new Error(`listUsers falhou: ${erroLista.message}`);

  const existente = lista.users.find((u) => u.email?.toLowerCase() === pessoa.email.toLowerCase());

  let id: string;
  if (existente) {
    id = existente.id;
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: pessoa.senha,
      email_confirm: true,
      user_metadata: { nome: pessoa.nome, is_admin: isAdmin },
    });
    if (error) throw new Error(`updateUserById ${pessoa.email} falhou: ${error.message}`);
    console.log(`  ✓ usuário já existia: ${pessoa.email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: pessoa.email,
      password: pessoa.senha,
      email_confirm: true,
      user_metadata: { nome: pessoa.nome, is_admin: isAdmin },
    });
    if (error || !data.user) throw new Error(`createUser ${pessoa.email} falhou: ${error?.message}`);
    id = data.user.id;
    console.log(`  ✓ usuário criado: ${pessoa.email}`);
  }

  const { error: erroPerfil } = await supabase
    .from('profiles')
    .upsert({ id, nome: pessoa.nome, is_admin: isAdmin }, { onConflict: 'id' });
  if (erroPerfil) throw new Error(`upsert profiles ${pessoa.email} falhou: ${erroPerfil.message}`);

  return id;
}

async function main() {
  const supabase = clienteServico();

  console.log('🌱 Seed base (regiões, config, produtos)...');
  await seed(supabase);

  console.log('👤 Garantindo usuários demo...');
  const adminId = await garantirUsuario(supabase, ADMIN, true);
  const voluntarioIds: string[] = [];
  for (const v of VOLUNTARIOS) {
    voluntarioIds.push(await garantirUsuario(supabase, v, false));
  }

  console.log('📦 Ajustando estoque e data de preço...');
  for (const [id, estoque] of Object.entries(ESTOQUE_SAUDAVEL)) {
    const dias = PRECO_VENCIDO[Number(id)] ?? 2;
    const { error } = await supabase
      .from('produtos')
      .update({
        estoque_atual: estoque,
        ultima_atualizacao_preco: diasAtras(dias, 6).toISOString(),
      })
      .eq('id', Number(id));
    if (error) throw new Error(`update produto ${id} falhou: ${error.message}`);
  }

  console.log('📈 Gravando histórico de preço...');
  for (const serie of HISTORICO) {
    const linhas = serie.precos.map((preco, indice) => ({
      produto_id: serie.produto_id,
      preco,
      dia: diaISO(serie.precos.length - 1 - indice),
      region_id: REGIAO,
    }));
    const { error } = await supabase
      .from('precos_historico')
      .upsert(linhas, { onConflict: 'produto_id,dia' });
    if (error) throw new Error(`upsert precos_historico ${serie.produto_id} falhou: ${error.message}`);
  }

  console.log('🧺 Recriando compras demo...');
  const donos = [adminId, ...voluntarioIds];
  const { error: erroLimpeza } = await supabase.from('compras').delete().in('criado_por', donos);
  if (erroLimpeza) throw new Error(`delete compras falhou: ${erroLimpeza.message}`);

  for (const compra of COMPRAS_DEMO) {
    const itens = compra.itens.map((item) => ({
      produto_id: item.produto_id,
      nome: item.nome,
      preco_unitario: item.preco,
      quantidade: item.quantidade,
      qtd_por_cesta: item.qtd_por_cesta,
      subtotal: Number((item.preco * item.quantidade * compra.cestas).toFixed(2)),
    }));
    const total = Number(itens.reduce((soma, item) => soma + item.subtotal, 0).toFixed(2));
    const { error } = await supabase.from('compras').insert({
      numero_cestas: compra.cestas,
      itens,
      total,
      criado_por: adminId,
      criado_em: diasAtras(compra.diasAtras).toISOString(),
    });
    if (error) throw new Error(`insert compra falhou: ${error.message}`);
    console.log(`  ✓ ${compra.cestas} cestas · R$ ${total.toFixed(2)} · ${compra.diasAtras}d atrás`);
  }

  const { count: totalProdutos } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })
    .eq('ativo', true);
  const { count: totalCompras } = await supabase
    .from('compras')
    .select('*', { count: 'exact', head: true });

  console.log('\n✅ Demo pronta');
  console.log(`   admin: ${ADMIN.email} / ${ADMIN.senha}`);
  console.log(`   ${totalProdutos} produtos ativos, ${totalCompras} compras, ${HISTORICO.length} séries de preço`);
}

main().catch((erro) => {
  console.error('❌ seed demo falhou:', erro.message);
  process.exit(1);
});
