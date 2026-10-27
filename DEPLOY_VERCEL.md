# Deploy Cesta Solidária no Vercel - Passo a Passo

## 1. Pré-requisitos

```bash
# Instalar Vercel CLI
npm i -g vercel@latest

# Verificar login
vercel whoami
# Se não logado:
vercel login
```

## 2. Projeto no Vercel

```bash
cd /home/matozo/Projetos/Pessoais/mazotech-cesta-solidaria

# Primeira vez: cria o projeto
vercel

# Perguntas:
# ? Set up and deploy "~/Projetos/Pessoais/mazotech-cesta-solidaria"? [Y/n] Y
# ? Which scope? (seu-username)
# ? Link to existing project? [y/N] N
# ? What's your project's name? cesta-solidaria
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] N
```

## 3. Variáveis de Ambiente (OBRIGATÓRIO)

No **Dashboard Vercel > Settings > Environment Variables**, adicione **todas** para **Production, Preview, Development**:

| Variável | Valor | Onde conseguir |
|----------|-------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Dashboard > Settings > API (service_role, **não** anon) |
| `TENDA_BEARER_TOKEN` | `seu-token-tenda` | Tenda Atacado (API) |
| `BACKUP_KEY` | `chave-32-chars-aleatoria` | `openssl rand -hex 32` |
| `CRON_SECRET` | `segredo-para-cron` | `openssl rand -hex 32` |

> ⚠️ **NUNCA** commite `.env` - use só o dashboard do Vercel.

## 4. Supabase - Preparar Banco de Produção

### 4.1 Criar projeto Supabase
1. Acesse https://supabase.com/dashboard
2. New Project > escolha org/region
3. Anote: **Project URL**, **anon key**, **service_role key**

### 4.2 Rodar migrações
```bash
# Instalar Supabase CLI
npm i -g supabase@latest

# Login
supabase login

# Link ao projeto remoto
supabase link --project-ref SEU_PROJECT_REF

# Push schema (roda a migration 001_initial_schema.sql)
supabase db push

# Verificar
supabase db remote commit
```

### 4.3 Seed inicial (produtos, regiões, configs)
```bash
# No Vercel, as env vars já estão setadas
# Rode local apontando pra produção:
SUPABASE_URL=https://SEU_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=service_role_key \
npx tsx scripts/seed.ts
```

### 4.4 Criar admin inicial
No SQL Editor do Supabase Dashboard:
```sql
SELECT admin_criar_usuario(
  'admin@cestasolidaria.org',
  'senha-forte-aqui',
  'Administrador',
  true
);
```

### 4.5 Configurar Auth
- **Authentication > Settings > Site URL**: `https://cesta-solidaria.vercel.app`
- **Authentication > Settings > Redirect URLs**: `https://cesta-solidaria.vercel.app/**`

## 5. Deploy

```bash
# Deploy preview (branch)
vercel

# Deploy production
vercel --prod
```

## 6. Verificar Cron (Scraper Tenda)

Após deploy, no **Vercel Dashboard > Functions > Cron Jobs**:
- Deve aparecer: `GET /api/scraper/tenda` - `0 6 * * *` (diário 06:00 UTC = 03:00 BRT)

Teste manual:
```bash
curl -X GET "https://cesta-solidaria.vercel.app/api/scraper/tenda" \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```
Retorno esperado: JSON com `produtos_verificados`, `preços_atualizados`, `timestamp`.

## 7. Domínio Personalizado (opcional)

```bash
# No Vercel Dashboard > Settings > Domains
# Adicione: cestasolidaria.mazotech.com.br
# Configure DNS no provedor (CNAME para cname.vercel-dns.com)
```

## 8. Checklist Pós-Deploy

| Item | Como testar |
|------|-------------|
| Login funciona | `https://seu-dominio.vercel.app/login` com admin@... |
| Dashboard carrega stats | Veja 4 cards com números |
| Estoque lista produtos | Tabela com 27 itens |
| Simulador calcula total | Marque itens, mude qtd, veja total |
| Histórico mostra compras | (vá em Simulador, salve uma compra) |
| Usuários (admin) | Crie/edite/exclua usuários |
| Configurações (admin) | Regiões + config scraper |
| Suporte (pública) | FAQ expande/colapsa |
| Cron roda | Logs no Vercel > Functions > Logs |

## 9. Comandos Úteis

```bash
# Ver logs da edge function
vercel logs https://cesta-solidaria.vercel.app/api/scraper/tenda

# Rollback
vercel rollback https://cesta-solidaria.vercel.app

# Variáveis via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env ls

# Build local antes de deploy
npm run build && npm test
```

## 10. Troubleshooting

| Erro | Solução |
|------|---------|
| `Module not found: @supabase/ssr` | `npm install` rodou? `package-lock.json` commitado? |
| `JWT_SECRET placeholder` | `SUPABASE_SERVICE_ROLE_KEY` está correto? (service_role, não anon) |
| Cron não roda | `CRON_SECRET` definido? Header `Authorization: Bearer ...` no vercel.json? |
| Preços não atualizam | `TENDA_BEARER_TOKEN` válido? Região `tenda_region_id` existe em `config`? |
| Redirect loop login | `NEXT_PUBLIC_SUPABASE_URL` aponta pro projeto certo? Site URL no Supabase bate com Vercel? |

---

**Arquivos chave do projeto:**
- `vercel.json` - cron + headers
- `supabase/migrations/001_initial_schema.sql` - schema completo
- `scripts/seed.ts` - seed idempotente
- `.env.example` - template de variáveis