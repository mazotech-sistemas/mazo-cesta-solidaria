# Ambiente simulado para demonstração

Roda a Cesta Solidária 100% local, sem Supabase cloud nem Vercel: o Supabase CLI
sobe Postgres + Auth + Studio em containers, as migrations criam o schema e o
seed popula dados de exemplo.

## Pré-requisito

Supabase CLI + Docker. O `supabase start` sobe os containers locais
(API `54321`, DB `54322`, Studio `54323`, Auth `54329` — ver `supabase/config.toml`).

## Subir

```bash
npm install
supabase start          # ANOTE o API URL, anon key e service_role key impressos
supabase db reset       # aplica supabase/migrations/001_initial_schema.sql

# .env.local com os valores que o supabase start imprimiu:
#   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key local>
#   SUPABASE_SERVICE_ROLE_KEY=<service_role local>

SUPABASE_SERVICE_ROLE_KEY=<service_role local> npm run seed   # regioes, config, produtos (seed/produtos_initial.csv)
npm run dev             # http://localhost:3000
```

O usuário admin de login (`admin@cestasolidaria.org` / `senha123`, fallback do
`.env.example`) pode ser criado pelo Studio local em `http://localhost:54323`
(Authentication → Add user) ou pelo fluxo de signup do próprio app.

Tudo local, custo zero, sem credencial de produção. O app não roda sem um
Supabase válido (o `middleware.ts` chama `auth.getUser()` em quase toda rota);
o Supabase local cobre isso.

## Testes (todas as camadas)

```bash
npm run test:unit     # Vitest (jsdom): componentes + lógica de src/lib (planner, preço, scraper)
npm run test:bdd      # Cucumber-js (tests/bdd): invariantes de dado
npm run test:e2e      # Playwright (chromium): fluxo de usuário; sobe dev server na 3000
npm run test:system   # tsx tests/system/run.ts
```

Unit e BDD mockam o Supabase (`vitest.setup.ts`), não precisam de servidor. E2E e
system precisam do app rodando (dev server + Supabase local acima). Detalhe das
camadas em `TESTS.md`.
