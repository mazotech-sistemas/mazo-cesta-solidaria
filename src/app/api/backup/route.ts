import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Gera um backup em JSON das 5 tabelas de dados e lista os mais recentes
// já feitos. Admins podem baixar; usuários comuns só veem a lista.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const querBaixar = searchParams.get('baixar') === '1';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (querBaixar) {
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const [produtos, compras, precos, regions, config] = await Promise.all([
      supabase.from('produtos').select('*').order('id'),
      supabase.from('compras').select('*').order('criado_em', { ascending: false }),
      supabase.from('precos_historico').select('*').order('dia', { ascending: false }),
      supabase.from('regions').select('*').order('region_id'),
      supabase.from('config').select('*').order('chave'),
    ]);

    const conteudo = {
      gerado_em: new Date().toISOString(),
      gerado_por: user.email ?? user.id,
      produtos: produtos.data ?? [],
      compras: compras.data ?? [],
      precos_historico: precos.data ?? [],
      regions: regions.data ?? [],
      config: config.data ?? [],
    };

    const totalLinhas =
      conteudo.produtos.length +
      conteudo.compras.length +
      conteudo.precos_historico.length +
      conteudo.regions.length +
      conteudo.config.length;

    // Registra na tabela backup_registros (criada na migração 002) para a
    // tela de usuários mostrar os últimos gerados.
    try {
      await supabase.from('backup_registros').insert({
        criado_em: conteudo.gerado_em,
        autor: user.email,
        linhas: totalLinhas,
        conteudo: conteudo,
      });
    } catch {
      // Não bloqueia o download se a tabela não existir ainda
    }

    return new NextResponse(JSON.stringify(conteudo, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="backup_cesta_solidaria_${conteudo.gerado_em.replace(/[:.]/g, '-').slice(0, 19)}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Sem ?baixar=1: lista os 10 backups mais recentes (leitura livre para
  // usuários autenticados; o campo conteúdo fica de fora para não pesar).
  const { data: registros } = await supabase
    .from('backup_registros')
    .select('id, criado_em, linhas, autor')
    .order('criado_em', { ascending: false })
    .limit(10);

  return NextResponse.json({ backups: registros ?? [] });
}
