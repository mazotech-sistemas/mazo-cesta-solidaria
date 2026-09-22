# Regras de teste para Cesta Solidária

## Regras

- Nenhum teste new deve depender de `streamlit` real; use `_fake_streamlit` do `conftest.py`.
- Mock de rede: use `monkeypatch.setattr(db.requests, "get", fake_get)` e retorno `FakeResp` (classe local em `test_db.py`).
- Testes de páginas (.py) ficam em `tests/test_<modulo>.py`, nunca em `tests/pages/`.
- Sempre `timeout=DEFAULT_TIMEOUT` (15s) em chamadas HTTP de produção.

## Cobertura

- `src/estoque.py`: validar_produto, montar_patch, somente_ativos — obrigatório testar todos os caminhos.
- `src/db.py`: novas funções de CRUD precisam de pelo menos 3 testes (sucesso, token, erro HTTP).
- `src/pdf.py`: novos campos da tabela devem ter teste de bytes no PDF gerado.
- `src/scraper_tenda.py`: novos métodos de busca devem ter teste com `_ClienteFake` (stub que responde como Tenda).

## Regras de merge

- `pytest -q` e `ruff check .` verdes antes de qualquer merge.
- Branch feature própria, nunca main direto.
- Sem segredos no diff (SUPABASE_URL, keys, senhas).
