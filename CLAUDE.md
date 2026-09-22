# Cesta Solidária — notas para sessões futuras

## Convenções do projeto

- Português em nomes de variáveis/campos (produto, não `product`; estoque, não `stock`).
- Zero emoji em código, docs ou commits.
- TDD: escreve teste primeiro (RED), implementa o mínimo (GREEN), refatora.
- `ruff` com regra `E501` desligada (SVGs e strings longas de HTML não quebram).
- Configuração está em `pyproject.toml` (pytest/ruff) — não use linhas de comando soltas.

## Arquitetura rápida

- **Frontend:** Streamlit multipage nativo (`app.py:st.navigation`); sidebar renderizada pela própria UI (`pages/*.py` chamam `render_sidebar()`).
- **Backend:** nenhum SDK Supabase; `src/db.py` via `requests` direto (PostgREST). Frontend usa `anon_key` + JWT do usuário; scripts/Ações usam `SERVICE_ROLE_KEY`.
- **Auth:** `_headers(token, service=False)` em `src/db.py:24` — sempre passe `token` mesmo nas páginas (null safety).
- **RLS:** escrita de produto é admin-only; compras aceitam insert de qualquer autenticado com `criado_por=auth.uid()`.
- **Paginação:** `listar_tabela` usa header `Range` (PostgREST), não cursor.

## Testes

- `pytest` com fixtures simples (`FakeResp`, `monkeypatch.setattr(db.requests, ...)`).
- `conftest.py` injeta stub de `streamlit` para rodar sem servidor.
- Contagem atual: 128 testes em `tests/`. README atualizado sincronamente.

## Scraper Tenda

- API pública em `api.tendaatacado.com.br/api/public/store`.
- `TendaScraper` implementa anti-bloqueio: rotação de UA, jitter, retry exponencial.
- Novos endpoints precisam ser adicionados em `src/scraper_tenda.py` e testados em `tests/test_scraper.py`.
- `cotar_produto(prod, cliente)` é a rotina única de cotação; reutilize-a, não duplique lógica.

## Fluxo comum para mudanças

1. Red — teste novo em `tests/`.
2. Green — implementação mínima.
3. Verificação: `pytest tests/ -q` + `ruff check .`.
4. Se tocar em UI: subir o app (`uv run --with streamlit streamlit run app.py`) e testar no navegador com Playwright.
