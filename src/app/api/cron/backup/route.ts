import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Endpoint interno para cron semanal de backup
// Usa SUPABASE_SERVICE_ROLE_KEY para autenticar como serviço
// Protegido por CRON_SECRET (Vercel passa no header Authorization: Bearer <secret>)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  // Vercel Cron passa: Authorization: Bearer <CRON_SECRET>
  const cronSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Configuração Supabase ausente' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const [produtos, compras, precos, regions, config] = await Promise.all([
      supabase.from('produtos').select('*').order('id'),
      supabase.from('compras').select('*').order('criado_em', { ascending: false }),
      supabase.from('precos_historico').select('*').order('dia', { ascending: false }),
      supabase.from('regions').select('*').order('region_id'),
      supabase.from('config').select('*').order('chave'),
    ]);

    const conteudo = {
      gerado_em: new Date().toISOString(),
      gerado_por: 'cron-semanal',
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

    // Registra na tabela backup_registros
    const { error: insertError } = await supabase.from('backup_registros').insert({
      criado_em: conteudo.gerado_em,
      autor: 'cron-semanal',
      linhas: totalLinhas,
      conteudo: conteudo,
    });

    if (insertError) {
      console.error('Erro ao registrar backup:', insertError);
      return NextResponse.json({ error: 'Falha ao registrar backup', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      gerado_em: conteudo.gerado_em,
      total_linhas: totalLinhas,
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
    return NextResponse.json({ error: 'Erro interno', details: String(err) }, { status: 500 });
  }
}