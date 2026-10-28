-- 002: tabela de registro de backups
-- ----------------------------------
-- Armazena metadados de cada backup gerado pela API /api/backup?baixar=1
-- (autor, momento, total de linhas e o próprio conteúdo em JSON). A tela
-- de Usuários mostra os últimos registros; o download em si continua sendo
-- o que a API devolve no mesmo momento.
--
-- RLS: leitura para autenticados (lista dos últimos 10 sem o conteúdo
-- pesado, filtrado pela API), escrita só para admins.

CREATE TABLE IF NOT EXISTS public.backup_registros (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  autor TEXT NOT NULL,
  linhas INT NOT NULL,
  conteudo JSONB NOT NULL
);

ALTER TABLE public.backup_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura livre para autenticados"
  ON public.backup_registros
  TO authenticated
  USING (true);

CREATE POLICY "Escrita apenas para administradores"
  ON public.backup_registros
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Índice para a consulta mais comum: últimos N por data.
CREATE INDEX IF NOT EXISTS idx_backup_registros_criado_em
  ON public.backup_registros (criado_em DESC);
