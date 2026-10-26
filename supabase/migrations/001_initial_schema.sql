-- migração 001: schema base do Cesta Solidária
-- Tabela: produtos
-- Colunas: id (serial PK), nome, marca, unidade, qtd_por_cesta, estoque_atual, preco_atual, token_tenda, url_tenda, termo_busca, ativo, ultima_atualizacao_preco, criado_em, atualizado_em

CREATE TABLE IF NOT EXISTS public.produtos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  marca TEXT,
  unidade TEXT,
  qtd_por_cesta DECIMAL(10,2) NOT NULL DEFAULT 1.0,
  estoque_atual DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  preco_atual DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  token_tenda TEXT,
  url_tenda TEXT,
  termo_busca TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_atualizacao_preco TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: regions
-- Colunas: region_id (text PK), nome, ativo, cep_referencia

CREATE TABLE IF NOT EXISTS public.regions (
  region_id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  cep_referencia TEXT
);

-- Tabela: precos_historico
-- Colunas: id (bigserial PK), produto_id (FK produtos), preco, dia (date), region_id (FK regions)

CREATE TABLE IF NOT EXISTS public.precos_historico (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  preco DECIMAL(10,2) NOT NULL,
  dia DATE NOT NULL,
  region_id TEXT NOT NULL REFERENCES public.regions(region_id),
  UNIQUE(produto_id, dia)
);

-- Tabela: compras
-- Colunas: id (bigserial PK), numero_cestas, itens (JSON), total, criado_por (FK auth.users)

CREATE TABLE IF NOT EXISTS public.compras (
  id BIGSERIAL PRIMARY KEY,
  numero_cestas INT NOT NULL,
  itens JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: profiles (extensão do auth.users)
-- Colunas: id (FK auth.users PK), nome, is_admin, criado_em

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: config (key-value store)
-- Colunas: chave (text PK), valor (text)

CREATE TABLE IF NOT EXISTS public.config (
  chave TEXT PRIMARY KEY,
  valor TEXT
);

-- Índices para performance

CREATE INDEX IF NOT EXISTS idx_produtos_ativo_nome ON public.produtos(ativo, nome);
CREATE INDEX IF NOT EXISTS idx_produtos_token_tenda ON public.produtos(token_tenda) WHERE token_tenda IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_precos_historico_produto_dia ON public.precos_historico(produto_id, dia DESC);
CREATE INDEX IF NOT EXISTS idx_compras_criado_por ON public.compras(criado_por);
CREATE INDEX IF NOT EXISTS idx_compras_criado_em ON public.compras(criado_em DESC);

-- Função: atualizar campo atualizado_em automaticamente

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger: produtos

DROP TRIGGER IF EXISTS update_produtos_updated_at ON public.produtos;
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: produtos

CREATE POLICY "Usuarios podem listar produtos" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem inserir produtos" ON public.produtos FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);
CREATE POLICY "Admins podem atualizar produtos" ON public.produtos FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);
CREATE POLICY "Admins podem deletar produtos" ON public.produtos FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- RLS Policies: regions (público para leitura, admins para escrita)

CREATE POLICY "Todos podem ver regioes" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem gerenciar regioes" ON public.regions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- RLS Policies: precos_historico

CREATE POLICY "Usuarios podem ver precos historicos" ON public.precos_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem inserir precos historicos" ON public.precos_historico FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- RLS Policies: compras

CREATE POLICY "Usuarios podem ver suas compras" ON public.compras FOR SELECT TO authenticated USING (auth.uid() = criado_por OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
CREATE POLICY "Usuarios podem inserir compras" ON public.compras FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
CREATE POLICY "Admins podem ver todas as compras" ON public.compras FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);
CREATE POLICY "Admins podem deletar compras" ON public.compras FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- RLS Policies: profiles

CREATE POLICY "Usuarios podem ver perfis" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem inserir perfis" ON public.profiles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);
CREATE POLICY "Admins podem atualizar perfis" ON public.profiles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- RLS Policies: config

CREATE POLICY "Todos podem ler config" ON public.config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins podem escrever config" ON public.config FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);

-- RPC Functions: admin_criar_usuario

CREATE OR REPLACE FUNCTION public.admin_criar_usuario(
  p_email TEXT,
  p_senha TEXT,
  p_nome TEXT,
  p_is_admin BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  new_raw_email TEXT := p_email;
BEGIN
  -- Cria usuario no auth.users
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_senha, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nome', p_nome, 'is_admin', p_is_admin),
    now(),
    now(),
    'authenticated'
  ) RETURNING id INTO new_user_id;

  -- Cria perfil na tabela profiles
  INSERT INTO public.profiles (id, nome, is_admin)
  VALUES (new_user_id, p_nome, p_is_admin);

  RETURN new_user_id;
END;
$$;

-- RPC Functions: admin_excluir_usuario

CREATE OR REPLACE FUNCTION public.admin_excluir_usuario(p_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Não permite excluir a si mesmo
  IF p_id = auth.uid()::TEXT THEN
    RAISE EXCEPTION 'Não é possível excluir sua própria conta';
  END IF;

  -- Exclui usuario do auth.users (cascade delete nas tabelas relacionadas)
  DELETE FROM auth.users WHERE id::TEXT = p_id;
END;
$$;