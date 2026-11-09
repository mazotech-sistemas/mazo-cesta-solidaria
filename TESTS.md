# Testes do Cesta Solidária

Cinco camadas, cada uma cobrindo um ângulo diferente. Nenhuma repete a
outra, e nenhuma faz "fake" — o que a camada valida de verdade fica na
coluna **valida**.

## Camadas

| Camada | Runner | Arquivos | Cobre |
|--------|--------|----------|-------|
| Unit | `npm run test:unit` (Vitest) | `src/**/*.test.ts(x)`, 14 arquivos, 219 testes | Parser da Tenda (`tenda.ts`), termo + faixa + filtro de palavras (`buscar-termo.ts`), laço do scraper e regra de 10% + relatório de cesta (`atualizar-precos.ts`), planner (`planner.ts`), detecção de preço desatualizado (`preco-stale.ts`), PDF de compras (`lista-compras.ts`), backup no Storage (`armazenamento.ts`), UI de estoque/simulador/dashboard/login |
| BDD (Gherkin) | `npm run test:bdd` / `test:bdd:prod` (Cucumber) | `tests/bdd/features/*.feature` + `step-definitions/*.steps.ts` | Cenários em linguagem de negócio: login + navegação, validação de produto no estoque, métricas do simulador (custo de cesta, cestas possíveis por estoque/orçamento, faltantes), detecção de preço desatualizado. Os steps de negócio importam as funções **reais** de `src/lib/planner.ts` e `src/lib/preco-stale.ts` (não há reimplementação). |
| System | `npm run test:system` (tsx) | `tests/system/*.system.ts` | Fluxo real ponta a ponta contra a Supabase: login de admin, criar produto via RLS, ler, atualizar estoque, upsert de preço no `precos_historico`, soft delete, hard delete de limpeza, verificação de resíduo zero. |
| E2E | `npm run test:e2e` / `test:e2e:prod` (Playwright) | `tests/e2e/*.spec.ts` (4 suítes, 76 specs) | App real navegando: login, dashboard, estoque CRUD completo + CSV import/export + ordenação, simulador com compra salva, histórico com filtros e gráficos, usuários (criar/excluir admin), configurações (scraper manual, regiões), página pública de suporte, axe WCAG 2.0/2.1 A/AA nas 8 telas, responsividade 375/768/1024, zero erro de hidratação React #418. O E2E apaga de verdade o que cria (`tests/e2e/support/limpeza.ts` + `historico.ts`). |
| Hub gate | `bash tools/gates.sh` (no hub) | `tools/gates.sh` | Consistência do concentrador `mazotech-hub`: submódulos batem com `registry.yaml`, higiene (nada versionado fora de submodule), emissor de apps, invariante de porta/Dockerfile/SQLAlchemy. |

## Como rodar

```bash
# Unit (rápido, ~10s)
npm run test:unit

# E2E contra produção (~5-8 min, não precisa de dev server)
npm run test:e2e:prod

# BDD contra produção (~1 min)
npm run test:bdd:prod

# BDD contra dev server local (subir `npm run dev` antes, porta 3000)
npm run test:bdd

# System contra produção (não precisa de dev server; usa a anon key + admin)
npm run test:system

# Tudo junto
npm run test:unit && npm run test:e2e:prod && npm run test:bdd:prod && npm run test:system
```

## Regras

- **E2E e System rodam contra a URL em produção por padrão.** O `playwright.config.ts` aceita `PLAYWRIGHT_BASE_URL` e `tests/system/*.system.ts` lê as chaves de `.env`. Nenhum dos dois cria `dev server`.
- **Limpeza é garantida.** E2E usa `tests/e2e/support/limpeza.ts` (produto de teste com sufixo de execução único) e `tests/e2e/support/historico.ts` (compra criada é removida pelo nome do produto). System usa sufixo `SYS-<execucao>` e remove no `finally`. Não fica dado de teste na base.
- **BDD não duplica lógica.** Os steps de estoque/simulador/preços importam as funções reais de `src/lib/*`. O BDD valida o contrato de comportamento, não reimplementa.
- **Cada camada tem dono.** Unit = funções puras. BDD = regra de negócio em linguagem. System = integração real com Supabase. E2E = fluxo de usuário de ponta a ponta. Hub gate = consistência do concentrador. Se uma camada quebra, a causa está no escopo dela, não em outra.
