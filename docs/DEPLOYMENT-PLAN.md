# Plano de Migração: Replit → Local + Vercel

## 1. ANÁLISE DO ESTADO ATUAL

### 1.1 Stack Detected

| Componente  | Tecnologia                            | Obs                 |
| ----------- | ------------------------------------- | ------------------- |
| Frontend    | React + Vite + Tailwind + shadcn/ui   | Dependências Replit |
| API Server  | Express 5 + Drizzle ORM + pino logger | Node.js server      |
| Database    | PostgreSQL                            | -                   |
| Build       | esbuild (CJS bundle)                  | -                   |
| File Upload | multer (memoryStorage)                | Excel ingestion     |

### 1.2 Dependências Replit-identified (frontend)

```json
"@replit/vite-plugin-cartographer": "^0.5.21"
"@replit/vite-plugin-dev-banner": "^0.1.1"
"@replit/vite-plugin-runtime-error-modal": "^0.0.6"
```

### 1.3 Variáveis de Ambiente Atuais

| Nome             | Uso                          | Status      |
| ---------------- | ---------------------------- | ----------- |
| `PORT`           | Porta do servidor (5000)     | Obrigatório |
| `BASE_PATH`      | Base path do frontend        | Obrigatório |
| `DATABASE_URL`   | PostgreSQL connection string | Obrigatório |
| `SESSION_SECRET` | Para sessões                 | Opcional    |
| `NODE_ENV`       | development/production       | -           |
| `LOG_LEVEL`      | Nível do logger pino         | Opcional    |
| `REPL_ID`        | 判定 se está no Replit       | Remover     |

---

## 2. OPÇÕES DE DEPLOYMENT

### 2.1 Opção A: API + Frontend no Vercel (Simples)

**Funciona para:** Projetos pequenos/médios sem uploads pesados

| Componente            | Onde                        | Observações                           |
| --------------------- | --------------------------- | ------------------------------------- |
| Frontend (Vite build) | Vercel                      | Static hosting                        |
| API Server            | Vercel Serverless Functions | Limite 10s timeout (free) / 60s (pro) |

**Problemas conhecidos:**

- Excel ingestion (multer memoryStorage) pode timeout em serverless
- Uploads > 4.5MB podem falhar (Vercel limit)
- Cold starts em serverless

### 2.2 Opção B: API em outro lugar + Frontend no Vercel (Recomendado)

**Funciona para:** Qualquer tamanho, mais flexível

| Componente            | Onde                    | Alternativas                |
| --------------------- | ----------------------- | --------------------------- |
| Frontend (Vite build) | Vercel                  | Netlify, Cloudflare Pages   |
| API Server            | Railway, Render, Fly.io | Heroku, AWS Lambda + API GW |

**Vantagens:**

- Sem limites de timeout para API
- Upload de arquivos sem restrições
- Mais controle sobre server

### 2.3 Opção C: Monorepo com Turso (Edge Database)

**Funciona para:** Edge-first, mas precisa de libSQL client (não é PostgreSQL puro)

**Nota:** Não recomendado pois já usa PostgreSQL/Drizzle.

---

## 3. DECISÃO RECOMENDADA

**Escolha: Opção B com Supabase (PostgreSQL externo)**

| Componente | Solução  | Custo                              |
| ---------- | -------- | ---------------------------------- |
| Frontend   | Vercel   | Free                               |
| API Server | Railway  | Free tier disponível               |
| Database   | Supabase | Free tier (500MB DB, 2GB transfer) |

### Alternativa Mais Simples (Opção A simplificada):

Se preferir não ter infraestrutura separada:

- Manter API como processo Node.js em qualquer VPS
- Apenas o frontend no Vercel

---

## 4. PASSOS DE MIGRAÇÃO

### Fase 1: Limpeza do Replit (Frontend)

**Arquivos a modificar:**

- [ ] `artifacts/data-dict/package.json` - remover `@replit/*` deps
- [ ] `artifacts/data-dict/vite.config.ts` - remover plugins Replit
- [ ] `pnpm-workspace.yaml` - remover `@replit/*` do catalog e minimumReleaseAgeExclude
- [ ] `artifacts/data-dict/.env.example` - criar com vars locais

### Fase 2: Configuração Local

- [ ] Criar `.env` com `DATABASE_URL`
- [ ] Criar script `db:push` para aplicar schema localmente
- [ ] Criar script `dev:api` e `dev:web` no root `package.json`
- [ ] Atualizar README com instruções locais

### Fase 3: Preparar API para Deployment

- [ ] Criar `vercel.json` (se usar Vercel for API)
- [ ] Criar `railway.json` ou Dockerfile (se usar Railway)
- [ ] Garantir que build.mjs funciona standalone
- [ ] Configurar health check `/healthz`

### Fase 4: Configurar Vercel (Frontend)

- [ ] Criar `vercel.json` ou usar Vercel Dashboard
- [ ] Configurar env vars: `VITE_API_URL`
- [ ] Configurar rewrites para API (se usando Option A)

### Fase 5: Database Setup (Escolher uma)

**Opção A: Supabase (Recomendado)**

- [ ] Criar projeto em supabase.com
- [ ] Pegar `DATABASE_URL` da Settings
- [ ] Configurar `db:push` com migration

**Opção B: Neon (Serverless Postgres)**

- [ ] Criar projeto em neon.tech
- [ ] Pegar connection string
- [ ] Semelhante ao Supabase

**Opção C: PostgreSQL local com Docker**

- [ ] Criar `docker-compose.yml`
- [ ] Script de seed inicial

### Fase 6: Testes e Validação

- [ ] Testar `pnpm run dev` localmente
- [ ] Testar import JSON
- [ ] Testar import Excel
- [ ] Testar validação de campo
- [ ] Testar export (JSON, CSV, DDL, Data Contract)
- [ ] Deploy preview no Vercel
- [ ] Testar em produção

---

## 5. ARQUITETURA RESULTANTE

### 5.1 Opção A: Tudo no mesmo repo, Vercel (sem API separada)

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel                             │
│  ┌─────────────┐    ┌─────────────────────────────────┐ │
│  │   Vite SPA  │───▶│   Serverless Functions (API)    │ │
│  │  (Frontend) │    │   - Express adaptado            │ │
│  └─────────────┘    │   - Limite 10s/60s timeout      │ │
│       │             │   - Max 4.5MB request (free)     │ │
│       │             └──────────────┬──────────────────┘ │
│       │                            │                    │
└───────┼────────────────────────────┼────────────────────┘
        │                            │
        │                     ┌──────▼──────┐
        │                     │  PostgreSQL │
        │                     │ (Vercel or  │
        │                     │  Supabase)  │
        │                     └─────────────┘
        ▼
┌───────────────────────────────────────┐
│           Desenvolvedor Local         │
│  pnpm install                         │
│  pnpm run dev:api  (port 5000)        │
│  pnpm run dev:web  (port 5173)        │
└───────────────────────────────────────┘
```

### 5.2 Opção B: API Separada (Recomendado)

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel                             │
│  ┌─────────────┐                                        │
│  │   Vite SPA  │                                        │
│  │  (Frontend) │                                        │
│  └──────┬──────┘                                        │
│         │ https://seu-app.vercel.app                     │
└─────────┼───────────────────────────────────────────────┘
          │  /api/*  ──────────────────────────────────────
          │  (Vercel rewrite ou redirect)
          │
┌─────────▼───────────────────────────────────────────────┐
│                     Railway / Render                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Node.js Server (Express)                ││
│  │              - API REST completa                     ││
│  │              - Multer para Excel                    ││
│  │              - Sem limites de tamanho               ││
│  └──────────────────────┬──────────────────────────────┘│
│                         │                                │
│                  ┌──────▼──────┐                         │
│                  │  PostgreSQL │ (Supabase/Neon/Railway) │
│                  └─────────────┘                         │
└──────────────────────────────────────────────────────────┘
```

---

## 6. SCRIPTS A ADICIONAR

### 6.1 Scripts no Root `package.json`

```json
{
  "scripts": {
    "dev": "pnpm run dev:api & pnpm run dev:web",
    "dev:api": "pnpm --filter @workspace/api-server run dev",
    "dev:web": "pnpm --filter @workspace/data-dict run dev",
    "db:push": "pnpm --filter @workspace/db run push",
    "db:studio": "pnpm --filter @workspace/db run studio",
    "build": "pnpm run typecheck && pnpm -r --if-present run build",
    "deploy": "npm run build && vercel --prod"
  }
}
```

### 6.2 Scripts no `api-server/package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.mjs"
  }
}
```

### 6.3 Database Push Script (db/package.json)

```json
{
  "scripts": {
    "push": "drizzle-kit push",
    "studio": "drizzle-kit studio",
    "migrate": "drizzle-kit migrate",
    "generate": "drizzle-kit generate"
  }
}
```

---

## 7. VARIÁVEIS DE AMBIENTE

### 7.1 `.env.example` (API Server)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
PORT=5000
NODE_ENV=development

# Logging
LOG_LEVEL=debug

# CORS (para desenvolvimento)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 7.2 `.env.example` (Frontend)

```bash
# API URL (para produção, aponta para Railway/Render)
VITE_API_URL=http://localhost:5000

# Para desenvolvimento, usa proxy no vite.config.ts
```

### 7.3 Vercel Environment Variables (Dashboard)

```
# Para frontend
VITE_API_URL=https://api-seu-app.railway.app

# Para API (se usar Vercel Functions)
DATABASE_URL=postgresql://...
```

---

## 8. CONFIGURAÇÕES DE DEPLOYMENT

### 8.1 `vercel.json` (Frontend - se usar Vercel para API)

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://api-seu-app.railway.app/api/$1"
    }
  ]
}
```

### 8.2 `Dockerfile` (para Railway ou Docker-compose)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm run build
EXPOSE 5000
CMD ["pnpm", "run", "start"]
```

### 8.3 `railway.json` (se usar Railway)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 9. DRIZZLE ORM CONFIG

### 9.1 Verificar schema do banco

```bash
# Gerar migrations
pnpm --filter @workspace/db run generate

# Apply para local
pnpm --filter @workspace/db run push

# Abrir studio (visualizar)
pnpm --filter @workspace/db run studio
```

### 9.2 Connection string format

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

Exemplo Supabase:

```
postgresql://postgres.xxxxxx:xxxxx@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Exemplo Neon:

```
postgresql://user:password@ep-xxx-xxx-xxx.us-east-1.aws.neon.tech/neondb
```

Exemplo local Docker:

```
postgresql://validador:validador@localhost:5432/validador
```

---

## 10. VALIDAÇÃO DE FUNCIONALIDADES

### 10.1 Checklist de Testes

| #   | Funcionalidade       | Como Testar                                         |
| --- | -------------------- | --------------------------------------------------- |
| 1   | Import JSON          | POST /api/dictionaries com payload JSON             |
| 2   | Import Excel         | POST /api/dictionaries/from-excel com arquivo .xlsx |
| 3   | Listar dicionários   | GET /api/dictionaries                               |
| 4   | Ver dicionário       | GET /api/dictionaries/:id                           |
| 5   | Validar campo        | POST /api/fields/:id/validate                       |
| 6   | Dashboard            | GET /api/dashboard                                  |
| 7   | Campos críticos      | GET /api/fields/critical                            |
| 8   | Export JSON          | GET /api/dictionaries/:id/export                    |
| 9   | Export CSV           | GET /api/dictionaries/:id/export?format=csv         |
| 10  | Export DDL           | GET /api/dictionaries/:id/export/ddl                |
| 11  | Export Data Contract | GET /api/dictionaries/:id/export/data-contract      |
| 12  | Health check         | GET /api/healthz                                    |

### 10.2 Testar Localmente

```bash
# Terminal 1
cd Data-Dictionary-Validator
pnpm install
export DATABASE_URL="postgresql://user:pass@localhost:5432/validador"
pnpm --filter @workspace/api-server run dev

# Terminal 2
export VITE_API_URL=http://localhost:5000
pnpm --filter @workspace/data-dict run dev
```

---

## 11. WARNINGS E LIMITAÇÕES

### 11.1 Excel Upload em Serverless (Opção A)

- Limite de 4.5MB no Vercel (free tier)
- Timeout de 10s (free) / 60s (pro)
- **Workaround**: Processar Excel no cliente ou usar API separada

### 11.2 Multer memoryStorage

- Para serverless, arquivos maiores que 50MB podem causar OOM
- Para uploads grandes, usar presigned URLs ou API separada

### 11.3 Conexões PostgreSQL em Serverless

- Conexões persistentes podem ser problemáticas
- Para Vercel serverless, usar pool de conexão com limite (ex: 10 conexões)
- Alternativa: Supabase/Neon já lidam com isso

---

## 12. PRÓXIMOS PASSOS (ORDEM DE EXECUÇÃO)

1. **HOJE**: Executar migração local (Fase 1 + 2)
2. **HOJE**: Criar Supabase project e testar conexão
3. **HOJE**: Testar todas funcionalidades localmente
4. **AMANHÃ**: Configurar Railway para API
5. **AMANHÃ**: Configurar Vercel para Frontend
6. **AMANHÃ**: Deploy produção e testes finais

---

## 13. REFERÊNCIAS

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Vercel Docs - Environment Variables](https://vercel.com/docs/environment-variables)
- [Supabase - Connection Pooling](https://supabase.com/docs/guides/database/connection-pooling)
- [Railway - Node.js Deployment](https://docs.railway.app/deploy/deployments/nodejs)
- [Vite Proxy Config](https://vitejs.dev/config/server-options.html#server-proxy)

---

## 14. QUICK START COMMANDOS

```bash
# Instalar tudo
cd Data-Dictionary-Validator
pnpm install

# Criar .env
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Editar .env com DATABASE_URL

# Aplicar schema
pnpm --filter @workspace/db run push

# Rodar localmente
pnpm run dev
```

**Atenção**: O frontend precisa de `VITE_API_URL` pointing para onde a API está rodando.
