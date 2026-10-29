import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clienteServico, listarBackups, salvarBackup } from '@/lib/backup/armazenamento';

// Gera um backup em JSON das 5 tabelas de dados e lista os mais recentes.
// Admins podem baixar; usuários comuns só veem a lista.
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

    // Guarda uma cópia no Storage para a tela de Usuários listar. Se a service
    // role não estiver configurada, o download continua funcionando.
    const admin = clienteServico();
    if (admin) {
      try {
        await salvarBackup(admin, conteudo, user.email ?? user.id);
      } catch (err) {
        console.error('Falha ao guardar backup no Storage:', err);
      }
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

  const backups = await listarBackups(10);
  return NextResponse.json({ backups });
}
