-- O seed grava ids explícitos vindos do CSV, então `produtos_id_seq` continua no
-- começo enquanto a tabela já tem id alto. O próximo produto criado pela tela
-- estoura "duplicate key value violates unique constraint produtos_pkey".
-- Aqui a sequência é acertada com o maior id existente e o seed repete o ajuste
-- depois de cada carga.

SELECT setval(
  'public.produtos_id_seq',
  COALESCE((SELECT MAX(id) FROM public.produtos), 0) + 1,
  false
);

CREATE OR REPLACE FUNCTION public.sincroniza_sequencia_produtos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM setval(
    'public.produtos_id_seq',
    COALESCE((SELECT MAX(id) FROM public.produtos), 0) + 1,
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sincroniza_sequencia_produtos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincroniza_sequencia_produtos() TO service_role;
