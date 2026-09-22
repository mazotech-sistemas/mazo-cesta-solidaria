# Cesta Solidária — contexto local (não commitar)

## Credenciais de teste (gerar novas periodicamente)
- Login prod: Thaisd808@gmail.com / tG^#2BSFLZ2 (admin)
- SUPABASE_URL: https://necnzsdlxfeyuysctwfb.supabase.co
- ANON_KEY, SERVICE_ROLE_KEY e BACKUP_KEY: ver em `.env.local` se existir

## Infra local
- `uv run --no-project --with pytest --with requests --with pandas --with fpdf2 --with streamlit --with ruff pytest tests/ -q -p no:cacheprovider`
- Ruff: `ruff check .`
- Servidor dev: `SUPABASE_URL=... SUPABASE_ANON_KEY=... uv run --no-project --with streamlit --with pandas --with requests --with fpdf2 streamlit run app.py --server.port 8501 --server.headless true`
- Playwright já instalado globalmente em `~/.config/opencode/opencode.json` com `--executable-path /home/matozo/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --headless --isolated`

## Branches
- `main` — produção
- `feat/excluir-editar-produto-marca` — mergeado em main (128 testes)
- Dependabots: pandas 3.0.6, streamlit 1.64.0, ruff >=0.16.8, upload-artifact v7 — todos mergeados

## Limpeza pós-teste
- Ao terminar teste com dados de prova: `git stash` (se houver mudanças locais não-stage), `git checkout main`, remover produtos que começam com "ZZZ" pelo SQL ou pela UI do Supabase.
