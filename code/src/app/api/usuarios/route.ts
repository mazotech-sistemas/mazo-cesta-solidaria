import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clienteServico } from '@/lib/backup/armazenamento';

// Criação e exclusão de usuários rodam aqui, com a service role, em vez de
// depender das funções `admin_criar_usuario` / `admin_excluir_usuario` do banco.
// A sessão do chamador continua sendo checada: só admin passa.

async function exigirAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erro: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { erro: NextResponse.json({ error: 'Apenas administradores' }, { status: 403 }) };
  }

  const admin = clienteServico();
  if (!admin) {
    return { erro: NextResponse.json({ error: 'Service role ausente no ambiente' }, { status: 500 }) };
  }

  return { user, admin };
}

export async function POST(req: NextRequest) {
  const sessao = await exigirAdmin();
  if (sessao.erro) return sessao.erro;
  const { admin } = sessao;

  const corpo = await req.json().catch(() => null);
  const email = typeof corpo?.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const senha = typeof corpo?.senha === 'string' ? corpo.senha : '';
  const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim() : '';
  const isAdmin = corpo?.is_admin === true;

  if (!email || !senha || !nome) {
    return NextResponse.json({ error: 'Informe email, senha e nome' }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: 'Senha precisa de pelo menos 6 caracteres' }, { status: 400 });
  }

  const criado = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (criado.error || !criado.data.user) {
    const mensagem = criado.error?.message ?? 'Falha ao criar usuário';
    const jaExiste = /already|registered|exists/i.test(mensagem);
    return NextResponse.json(
      { error: jaExiste ? 'Já existe usuário com esse email' : mensagem },
      { status: jaExiste ? 409 : 500 },
    );
  }

  const { error: erroPerfil } = await admin
    .from('profiles')
    .insert({ id: criado.data.user.id, nome, is_admin: isAdmin });

  if (erroPerfil) {
    // Sem perfil o usuário não entra no app; desfaz para não deixar órfão.
    await admin.auth.admin.deleteUser(criado.data.user.id);
    return NextResponse.json({ error: 'Falha ao criar perfil: ' + erroPerfil.message }, { status: 500 });
  }

  return NextResponse.json({ id: criado.data.user.id, email, nome, is_admin: isAdmin }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const sessao = await exigirAdmin();
  if (sessao.erro) return sessao.erro;
  const { admin, user } = sessao;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Informe o id do usuário' }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'Você não pode excluir a própria conta' }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // O profile cai junto pelo ON DELETE CASCADE; o delete explícito cobre
  // bancos onde a FK não foi criada.
  await admin.from('profiles').delete().eq('id', id);

  return NextResponse.json({ ok: true });
}
