import { NextRequest, NextResponse } from 'next/server';
import { clienteServico, salvarBackup } from '@/lib/backup/armazenamento';

// Cron semanal de backup. O Vercel Cron chama com Authorization: Bearer <CRON_SECRET>.
// Grava o JSON no Storage (bucket `backups`) e atualiza o índice que a tela de
// Usuários lê. Não depende de tabela nem de migração de banco.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const esperado = process.env.CRON_SECRET;
  const recebido = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!esperado || recebido !== esperado) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const admin = clienteServico();
  if (!admin) {
    return NextResponse.json({ error: 'Configuração Supabase ausente' }, { status: 500 });
  }

  const [produtos, compras, precos, regions, config] = await Promise.all([
    admin.from('produtos').select('*').order('id'),
    admin.from('compras').select('*').order('criado_em', { ascending: false }),
    admin.from('precos_historico').select('*').order('dia', { ascending: false }),
    admin.from('regions').select('*').order('region_id'),
    admin.from('config').select('*').order('chave'),
  ]);

  const falhas = [produtos, compras, precos, regions, config]
    .map((r) => r.error?.message)
    .filter(Boolean);
  if (falhas.length > 0) {
    return NextResponse.json(
      { error: 'Falha ao ler tabelas', details: falhas },
      { status: 500 },
    );
  }

  const conteudo = {
    gerado_em: new Date().toISOString(),
    gerado_por: 'cron-semanal',
    produtos: produtos.data ?? [],
    compras: compras.data ?? [],
    precos_historico: precos.data ?? [],
    regions: regions.data ?? [],
    config: config.data ?? [],
  };

  try {
    const registro = await salvarBackup(admin, conteudo, 'cron-semanal');
    return NextResponse.json({
      success: true,
      gerado_em: conteudo.gerado_em,
      arquivo: registro.arquivo,
      bytes: registro.bytes,
      total_linhas: registro.linhas,
      tabelas: {
        produtos: conteudo.produtos.length,
        compras: conteudo.compras.length,
        precos_historico: conteudo.precos_historico.length,
        regions: conteudo.regions.length,
        config: conteudo.config.length,
      },
    });
  } catch (err) {
    console.error('Erro no cron de backup:', err);
    return NextResponse.json(
      { error: 'Falha ao gravar backup', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
