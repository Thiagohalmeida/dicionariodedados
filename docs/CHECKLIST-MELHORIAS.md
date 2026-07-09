# Checklist de Melhorias - Validador de Dicionário de Dados

## Como usar
- [x] = Concluído
- [ ] = Pendente

---

## 🔴 CRÍTICAS (Bugs que afetam funcionalidade)

### ✅ Performance - N+1 Queries (RESOLVIDO)

- [x] **N+1 Query em `fields.ts:147-172`** - Endpoint de campos críticos
  - Arquivo: `artifacts/api-server/src/routes/fields.ts`
  - Correção: Adicionado `computeFieldSummariesBatch` e refatorado endpoint

- [x] **N+1 Query em `dashboard.ts:35-61`** - Dashboard metrics
  - Arquivo: `artifacts/api-server/src/routes/dashboard.ts`
  - Correção: Busca todos campos + todos summaries em 2 queries apenas

- [x] **N+1 Query em `dictionaries.ts:22-63`** - Listagem de dicionários
  - Arquivo: `artifacts/api-server/src/routes/dictionaries.ts`
  - Correção: Batch fetch de fields e summaries

- [x] **summary.ts: código duplicado em computeFieldSummary**
  - Correção: Extraído `computeSummaryFromValidations` e `computeFieldSummariesBatch`

- [x] **getFieldsWithSummaries também tinha N+1**
  - Correção: Agora usa `computeFieldSummariesBatch` diretamente

### ✅ Error Handling - Backend (RESOLVIDO)

- [x] **Adicionar `req.log.error` nas rotas** - Logging de erros
  - `artifacts/api-server/src/routes/fields.ts` - validações e 404
  - `artifacts/api-server/src/routes/dictionaries.ts` - validações e 404
  - `artifacts/api-server/src/routes/excel.ts` - multer, file check, exports
  - Nota: `dashboard.ts` e `fields.ts critical` usam `_req` (sem contexto de logging)

### ✅ UI Bugs (RESOLVIDO)

- [x] **Conflict status - Badge sem diferenciação visual**
  - Arquivo: `artifacts/data-dict/src/pages/dictionary-detail.tsx:155-156`
  - Correção: Badge usa `variant="destructive"` quando `statusFinal === "conflict"`

---

## 🟡 MÉDIAS (Melhoria de experiência/qualidade)

### ✅ Error Handling - Frontend (RESOLVIDO)

- [x] **handleExport sem try/catch** - Usuário não sabe se falhou
  - Arquivo: `artifacts/data-dict/src/pages/dictionary-detail.tsx:57-63`
  - Correção: Adicionado try/catch com toast de erro

- [x] **handleExportExtra sem toast de erro**
  - Arquivo: `artifacts/data-dict/src/pages/dictionary-detail.tsx:65-76`
  - Correção: Adicionado try/catch com toast de erro

### ✅ Validation (RESOLVIDO)

- [x] **validatorName sem sanitização**
  - Arquivo: `artifacts/data-dict/src/pages/dictionary-detail.tsx:309-313`
  - Correção: Adicionado `.trim()` e validação melhorada

- [x] **submitValidation sem onError**
  - Correção: Adicionado `onError` com toast

### ✅ TypeScript - Any types (RESOLVIDO)

- [x] **`selectedField` e `editingField` com tipo `any`**
  - Arquivo: `artifacts/data-dict/src/pages/dictionary-detail.tsx:51-52`
  - Correção: Criadas interfaces `Field`, `FieldSummary` e `FieldWithSummary`

- [x] **Parâmetro `field: any` em ValidationPanel e EditFieldDialog**
  - Correção: Usando `FieldWithSummary`

### ✅ Code Duplication (RESOLVIDO)

- [x] **Função `traduzirStatus` duplicada em 3 arquivos**
  - Arquivos: `dictionaries.tsx`, `dictionary-detail.tsx`, `dashboard.tsx`
  - Solução: Extraída para `lib/utils.ts` com `traduzirStatus` e `traduzirClassificacao`

### ✅ Feature RF11 (RESOLVIDO)

- [x] **Tutorial onboarding não pode ser reaberto pelo menu**
  - Arquivo: `artifacts/data-dict/src/components/onboarding-modal.tsx`
  - Problema: `useResetOnboarding` fazia `window.location.reload()`
  - Correção: Agora usa `CustomEvent` para mostrar modal sem reload

---

## 🟢 MENORES (Tech debt / Code smell)

### ✅ Strings mágicas (RESOLVIDO - 06/07/2026)

- [x] **Status hardcoded em summary.ts:63-70** - "pending", "approved", "rejected", "conflict"
  - Arquivo: `artifacts/api-server/src/lib/summary.ts`
  - Correção: Criado `artifacts/api-server/src/lib/constants.ts` com `FIELD_STATUS`, `FIELD_CLASSIFICATION`, `DICTIONARY_STATUS` e `SCORE_THRESHOLDS`; substituído `>= 60` por `SCORE_THRESHOLDS.APPROVE`
  - Nota: O arquivo `constants.ts` era referenciado por 5 arquivos (`summary.ts`, `dashboard.ts`, `dictionaries.ts`, `excel.ts`, `fields.ts`) mas nunca havia sido criado — typecheck quebrado

- [x] **Classificação hardcoded em summary.ts:20-24** - "reliable", "attention", "critical"
  - Arquivo: `artifacts/api-server/src/lib/summary.ts`
  - Correção: Constantes em `constants.ts`

### ✅ Refactoring (RESOLVIDO - 06/07/2026)

- [x] **Função grande (~100 linhas) em dashboard.ts:9-106**
  - Arquivo: `artifacts/api-server/src/routes/dashboard.ts`
  - Correção: Já estava dividida em helpers `getEmptyDashboardResponse`, `initClassificationCounts`, `initStatusCounts`, `processFieldSummaries`, `processDictionaryMetrics`

### ✅ Documentação (RESOLVIDO)

- [x] **README: JSON example usa `nomeTecnico`** mas API espera `campo_tecnico`
  - Arquivo: `README.md:160-176`

### ✅ Performance (RESOLVIDO - 06/07/2026)

- [x] **Script de desenvolvimento completo** — `dev` inicia API e frontend em paralelo
  - Arquivo: `package.json`
  - Correção: `dev` agora executa `dev:api` e `dev:web` juntos

- [x] **Paginação nos endpoints de listagem** `/dictionaries` e `/fields/critical`
  - Arquivos: `artifacts/api-server/src/routes/dictionaries.ts`, `artifacts/api-server/src/routes/fields.ts`
  - Correção: Validados `ListDictionariesQueryParams` e `GetCriticalFieldsQueryParams` (page/limit, default 1/20, max 100); respostas no shape `{ data, total, page, limit, totalPages }` já exigido pelos schemas Zod gerados do OpenAPI; tipos regenerados via `pnpm --filter @workspace/api-spec run codegen`
  - Frontend: `pages/dictionaries.tsx` e `pages/critical-fields.tsx` adaptados para `data?.data`
  - Nota: O contrato OpenAPI já previa paginação, mas o backend retornava array puro → `.parse()` falhava em runtime

### ✅ Correções identificadas em inspeção de código (07/07/2026)

- [x] **`totalFields` no dashboard corrigido** — agora conta corretamente os campos processados
  - Arquivo: `artifacts/api-server/src/routes/dashboard.ts`

- [x] **Score thresholds: `RELIABLE` corrigido para 90** (RF05 exige ≥ 90 para "Confiável"; estava 80)
  - Arquivo: `artifacts/api-server/src/lib/constants.ts`
  - Correção: `SCORE_THRESHOLDS.RELIABLE` alterado de `80` para `90`

- [x] **Data Contract: `obrigatorio` derivado de consenso dos validadores** (não de `chave`)
  - Arquivo: `artifacts/api-server/src/routes/excel.ts` (endpoint `/export/data-contract`)
  - Correção: Usa `getFieldsWithSummaries` e define `obrigatorio: avgRequired >= 0.5` (ou `null` sem validações)

- [x] **Drizzle config: carrega `.env` de `artifacts/api-server/.env`** (era `lib/db/.env`)
  - Arquivo: `lib/db/drizzle.config.ts`
  - Correção: Caminho relativo `../../artifacts/api-server/.env`

- [x] **UI de paginação nas telas `/dictionaries` e `/fields/critical`**
  - Arquivos: `artifacts/data-dict/src/pages/dictionaries.tsx`, `artifacts/data-dict/src/pages/critical-fields.tsx`
  - Correção: Estados de página + botões "Anterior/Próxima" usando `page`, `totalPages`, `total` da API

### ✅ CORS configurável (RESOLVIDO - 07/07/2026)

- [x] **`ALLOWED_ORIGINS` lido do ambiente**
  - Arquivo: `artifacts/api-server/src/app.ts`
  - Correção: Lê `process.env.ALLOWED_ORIGINS` (comma-separated), configura `cors({ origin: allowedOrigins, credentials: true })` quando definido; mantém permissivo como fallback para dev

### ✅ Error handler global + validação Excel (RESOLVIDO - 07/07/2026)

- [x] **Error handler global no Express**
  - Arquivo: `artifacts/api-server/src/app.ts`
  - Correção: Middleware final converte exceções em JSON 500 com logging pino

- [x] **Validação de extensão `.xlsx`/`.xlsm` + try/catch no parse**
  - Arquivo: `artifacts/api-server/src/routes/excel.ts`
  - Correção: Rejeita `.xls` binário antes do parse; captura erro do ExcelJS e retorna 400 descritivo

### ✅ ExcelJS type assertion (RESOLVIDO - Won't fix)

- [x] **ExcelJS `as any` em excel-ingestion-engine/index.ts:142**
  - Status: **Won't fix** - Workaround documentado em replit.md
  - Motivo: ExcelJS types esperam `Buffer` não-genérico, incompatível com Node 24

---

## 🔴 Pendente — Prioridade Alta (Lacunas do FLOW.md)

### L1. Endpoint `POST /api/excel/preview` — Preview sem persistir (CRÍTICO) — **CONCLUÍDO**
- [x] **Arquivos:** `artifacts/api-server/src/routes/excel.ts` (novo endpoint), `artifacts/data-dict/src/pages/new-dictionary.tsx` (UI editor JSON)
- **Situação:** `POST /api/dictionaries/from-excel` agora permite preview por padrão e só persiste quando `persist=true` é enviado
- **Por que importa:** Especialista pode revisar as inferências do motor (`descricao`, `periodicidade`, `origem`, `chave`) antes de criar o dicionário
- **Fluxo correto:** Upload Excel → Preview JSON → [edição opcional] → `POST /api/dictionaries` → Validar → Exportar
- **Execução:**
  1. Implementado `POST /api/excel/preview` retornando `{ meta, json_gerado }`
  2. Frontend da aba Excel agora exibe o JSON em editor e permite importar após edição
  3. OpenAPI atualizado em `lib/api-spec/openapi.yaml` e os tipos serão regenerados via `pnpm --filter @workspace/api-spec run codegen`

### L2. Motor de inferência: `descricao`, `periodicidade`, `origem` incompletos — **CONCLUÍDO (melhorias heurísticas aplicadas)**
- [x] **Arquivo:** `artifacts/api-server/src/modules/excel-ingestion-engine/index.ts`
- **Situação:** Motor agora adota heurísticas conservadoras:
  - `descricao`: deixada vazia para forçar revisão manual por especialista (anteriormente preenchida com texto genérico)
  - `periodicidade`: inferida a partir do nome da aba (palavras-chave: dia/diario, semana/semanal, mes/mensal) ou, se não detectado, a proporção de valores de data na planilha (se >40% → `diario`), caso contrário `eventual`
  - `origem`: tenta extrair valor de uma coluna cujo cabeçalho contenha `origem` ou `sistema`; se não encontrada, usa `${filename} | ${sheet.name}` como fallback
- **Por que importa:** Essas mudanças reduzem falsos positivos e forçam revisão manual onde o motor tem baixa confiança.
- **Ação executada:** Heurísticas implementadas no arquivo indicado; L1 (preview) garante usuário pode editar antes de persistir.

### L3. DDL sinalizar campos Crítico/Pendente (Baixa) — **CONCLUÍDO**
- [x] **Arquivo:** `artifacts/api-server/src/routes/excel.ts` (endpoint `/export/ddl`)
- **Situação:** DDL agora inclui comentário `-- status: <classification>` ao lado das colunas quando summaries estão disponíveis (ex.: `-- status: critical`).
- **Ação executada:** O endpoint `/dictionaries/:id/export/ddl` busca `getFieldsWithSummaries(id)` e anota cada coluna com `status` quando aplicável. Se summaries não existirem, comportamento padrão permanece.

### L4. Data Contract incluir regras de negócio das validações (Baixa) — **CONCLUÍDO**
- [x] **Arquivo:** `artifacts/api-server/src/routes/excel.ts` (endpoint `/export/data-contract`)
- **Situação:** Data Contract agora inclui, para cada campo, um objeto `regras_negocio` com a média das validações (booleans ou null quando ausente): `usado`, `obrigatorio`, `nome_correto`, `origem_correta`, `regra_negocio`.
- **Ação executada:** O endpoint usa `getFieldsWithSummaries` e calcula cada flag como `avg >= 0.5` quando disponível; caso contrário `null`.

---

## 🔴 Pendente — Prioridade Alta (Itens anteriores)

### 1. CORS totalmente aberto (`ALLOWED_ORIGINS` documentado, mas nunca lido)
- [x] **Arquivo:** `artifacts/api-server/src/app.ts`
- **Status:** RESOLVIDO — Lê `ALLOWED_ORIGINS`, configura `cors({ origin, credentials: true })` quando definido; fallback permissivo

### 2. Paginação em memória (SELECT * + slice JS), não no banco
- [x] `/dictionaries` — usa `LIMIT/OFFSET` + `inArray` nos fields da página + `desc(createdAt)`
- [x] `/fields/critical` — agora usa query DB com `LIMIT/OFFSET` + join/subquery nas validations para filtrar `CRITICAL` (avg score < ATTENTION ou sem validações)
- [x] **GET `/dictionaries/:id`** — corrigido parsing de parâmetro ID (Express passa string, Zod esperava number); agora faz `parseInt(req.params.id, 10)` manual
- **Ação realizada:** Substituído `SELECT *` + filtro JS por query SQL com `inArray(validationsTable.fieldId, ...)` + `LIMIT/OFFSET` no Drizzle; corrigido parsing de ID na rota GET/:id

---

## 🟡 Pendente — Prioridade Média

### 3. Health check não verifica o banco
- [x] **Arquivo:** `artifacts/api-server/src/routes/health.ts`
- **Situação:** `/api/healthz` agora faz `SELECT 1` contra o pool do Drizzle antes de responder
- **Ação:** Retorna 200 com `{ status: "ok", database: "ok" }` ou 503 com `{ status: "degraded", database: "down" }` se falhar
- **OpenAPI:** Schema atualizado com `HealthStatus` incluindo campo `database` (ok/down) + enum `status` (ok/degraded); tipos regenerados via `pnpm --filter @workspace/api-spec run codegen`

### 4. `mockup-sandbox` incluído no workspace pnpm
- [x] **Arquivo:** `pnpm-workspace.yaml` (`packages: - artifacts/*`)
- **Ação:** Adicionado `!artifacts/mockup-sandbox` para excluir do workspace

### 5. Sem script de seed para dados de teste
- [x] **Arquivo:** `scripts/src/seed.ts` (novo)
- **Ação:** Criado `scripts/src/seed.ts` que insere 3 dicionários (RFQ Medicamentos, Contrato Laboratório, Compra Direta TI) com 21 campos e 10 validações, usando schema `@workspace/db`
- **Execução:** `pnpm --filter @workspace/scripts run seed` (usa `--env-file=../artifacts/api-server/.env`)

---

## 🟢 Pendente — Prioridade Baixa / Tech Debt

### 6. Duplicação residual em `dashboard.ts`
- [ ] `processFieldSummaries` e `processDictionaryMetrics` calculam contagens parecidas — extrair `tallyByStatus(fields, summaries)` reaproveitada

### 7. Cláusula SQL morta em `/fields/critical`
- [x] **Arquivo:** `artifacts/api-server/src/routes/fields.ts`
- **Situação:** A query usava `INNER JOIN` com `validations` e tinha `OR NOT EXISTS (...)` no `WHERE` para pegar campos sem validações. Como `INNER JOIN` já exige que exista validação, o `OR NOT EXISTS` **nunca** é satisfeito (código morto). Se alguém trocar para `LEFT JOIN` achando que está "consertando", reintroduz bug (campos pendentes apareceriam como críticos).
- **Correção:** Alterado para `LEFT JOIN` + manutenção do `OR NOT EXISTS` (agora funcional, pois `LEFT JOIN` permite campos sem validações) + simplificação removendo código morto. Agora campos sem validações aparecem corretamente como "pending/critical".
- **Prioridade:** Baixa (cosmético, mas previne bug futuro) — **CONCLUÍDO**

### 7. Deployment configs mencionados no `DEPLOYMENT-PLAN.md` não existem
- [ ] Nenhum `vercel.json`, `railway.json` ou `Dockerfile` no repo
- **Ação:** Criar só quando time decidir qual opção de deploy (A/B/C) vai seguir

### 8. Ordenação ascendente por `createdAt` mostra mais antigos primeiro
- [x] `/dictionaries` — já usa `desc(dictionariesTable.createdAt)`
- [ ] `/dashboard` — confirmar se usa `asc` e trocar para `desc`

### 9. Separar visualmente "Ingestão de Excel" de "Importação por JSON"
- [ ] **Arquivo:** `artifacts/data-dict/src/pages/new-dictionary.tsx`
- **Situação:** Duas formas de importar convivem como abas (`Tabs`) no mesmo card; Excel exige 2 passos (preview → importar), JSON é ação única
- **Sugestão:** Destacar a distinção — ex.: badges "Passo 1/2" na aba Excel, ou reorganizar em duas seções empilhadas (Excel primeiro com destaque "Novo", JSON depois)
- **Prioridade:** Baixa (decisão de produto, não correção técnica)

### 10. Fluxo completo de validação campo a campo para Excel (Feature)
- [x] **Arquivos:** `artifacts/data-dict/src/components/preview-validation-sheet.tsx` (novo), `artifacts/data-dict/src/pages/new-dictionary.tsx`
- **Objetivo:** Após `POST /api/excel/preview` gerar JSON, permitir editar/validar cada campo em UI dedicada (similar a `dictionary-detail.tsx`) **antes** de persistir o dicionário
- **Fluxo implementado:**
  1. Upload Excel → `/api/excel/preview` → retorna `{ meta, json_gerado }`
  2. Nova Sheet "Validação do Preview" mostra grid de campos com status/classificação, permite editar `descricao`, `origem`, `periodicidade`, `chave`, `tipo_dado`
  3. Usuário valida cada campo (checkboxes iguais ao `ValidationPanel`: usado, obrigatório, nome correto, origem correta, regra de negócio)
  4. Botão "Gerar JSON Validado" → compila validações + edições no `json_gerado` (atualiza o textarea editável)
  5. Botão "Importar Dicionário" → `POST /api/dictionaries` com JSON validado → redireciona para `/dictionaries/:id`
- **Benefício:** Garante qualidade antes de criar o dicionário; reaproveita lógica de validação existente; evita criar dicionários "sujos"
- **Prioridade:** Média (melhora significativa de UX/qualidade) — **CONCLUÍDO**

---

## 🟡 Pendente — Prioridade Média (Infraestrutura)

### 11. Integração Supabase como backend real (PostgreSQL + Storage + Auth)
- [x] **Arquivos:** `lib/db/src/index.ts`, `lib/db/drizzle.config.ts`, `.env`, novos módulos em `artifacts/api-server/src/modules/supabase/`
- **Objetivo:** Substituir banco local/ephemeral por Supabase (PostgreSQL gerenciado) para:
  - Persistir dicionários, campos, validações (já modelados no `@workspace/db`)
  - **Storage:** Arquivos Excel enviados (bucket `excel-uploads`) + DDL/Data Contract exportados (bucket `exports`)
  - **Logs/Auditoria:** Tabela `audit_logs` (ação, usuário, entidade, antes/depois, timestamp)
  - **Auth:** Supabase Auth (email/password, magic link, OAuth) → substitui autenticação futura
  - **Realtime:** Opcional — notificar validações em tempo real no dashboard
- **Validação pré-produção via DDL gerado:**
  - Endpoint `POST /api/dictionaries/:id/validate-ddl` executa `CREATE TABLE` temporária no Supabase (schema `staging_<id>`) → rola back automaticamente
  - Confirma se tipos, constraints (PK, FK, NOT NULL) e índices são válidos no PostgreSQL real
  - Retorna relatório de erros/warnings antes de o usuário promover para produção
- **Passos de implementação:**
  1. Criar projeto Supabase → obter `DATABASE_URL` (pooler), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  2. Atualizar `.env` do `api-server` com variáveis Supabase
  3. Ajustar `lib/db/src/index.ts` para usar `DATABASE_URL` do Supabase (já compatível com `pg` + Drizzle)
  4. Criar migrações Drizzle para tabelas atuais + `audit_logs` + `storage_objects` (metadados)
  5. Implementar `supabaseStorage.ts` (upload/download/delete com signed URLs)
  6. Middleware de auditoria automático em rotas `POST/PUT/DELETE` (grava em `audit_logs`)
  7. Endpoint `POST /api/dictionaries/:id/validate-ddl` (executa DDL em transaction + rollback)
  8. Frontend: página de configuração Supabase (status de conexão, buckets, auth)
- **Prioridade:** Alta (infraestrutura base para produção e validação real) — **CONCLUÍDO**

### 12. Prevenção de SQL Injection no endpoint `POST /dictionaries/:id/validate-ddl`
- [x] **Arquivo:** `artifacts/api-server/src/routes/excel.ts`
- **Problema:** O endpoint montava `CREATE TABLE ${dict.tabela} (${...campoTecnico...})` e executava no Postgres. `tabela` e `campo_tecnico` vêm de import JSON, validados apenas como `zod.string()` — permitia injeção SQL arbitrária (incluindo fuga de rollback via `COMMIT`).
- **Correção:** Adicionada validação por allowlist (`/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/`) em `dict.tabela` e em cada `campoTecnico` **antes** de montar a DDL. Se inválido, retorna `400` sem executar no banco.
- **Prioridade:** Crítica (rota nova exposta diretamente ao Postgres real) — **CONCLUÍDO**

## Resumo de Status

| Categoria | Concluídos | Em Progresso | Pendentes |
|---|---|---|---|
| Críticas (antigas) | 8 | 0 | 0 |
| Médias (antigas) | 6 | 0 | 0 |
| Menores (antigas) | 12 | 0 | 0 |
| **Novas do FLOW.md (L1-L4)** | **4** | 0 | **0** |
| Pendentes Altas (restantes) | 3 (CORS + Supabase + fields/critical) | 0 | **0** |
| Pendentes Médias | 2 (Supabase config page + seed) | 0 | **0** |
| Pendentes Baixas | 2 (`/dictionaries` desc + mockup-sandbox) | 0 | **1** (`/dashboard` desc) |
| **Total** | **38** | **0** | **1** |

---

## 🏆 PRÓXIMOS ITENS PENDENTES

Os itens principais do fluxo Excel/preview, Supabase, paginação DB e seed já estão concluídos. Os pontos ainda pendentes são:

- [ ] Ordenação `/dashboard` por `createdAt` (trocar para `desc`)
- [ ] Duplicação residual em `dashboard.ts` (extrair `tallyByStatus`)
- [ ] Deployment configs (vercel.json, railway.json, Dockerfile)
- [ ] Separar visualmente Excel vs JSON (badges Passo 1/2)

---

---

## ✅ CONCLUÍDOS - 02/07/2026

- N+1 queries em 3 endpoints (fields, dashboard, dictionaries)
- Logging de erros em todas as rotas do backend
- Error handling com toasts nos exports do frontend
- Conflict status com badge diferenciado
- validatorName com trim e sanitização
- submitValidation com onError handler
- Tipos TypeScript adequados (Field, FieldSummary, FieldWithSummary)
- Função traduzirStatus/traduzirClassificacao compartilhada
- Tutorial onboarding reaberto via CustomEvent (sem reload)
- ExcelJS type assertion: won't fix (workaround documentado)

## ✅ CONCLUÍDOS - 06/07/2026

- Criado `artifacts/api-server/src/lib/constants.ts` (BLOCKER: typecheck quebrado — arquivo era importado por 5 módulos mas não existia)
- Strings mágicas em `summary.ts` substituídas por `FIELD_STATUS`, `FIELD_CLASSIFICATION`, `SCORE_THRESHOLDS`
- Dashboard já estava refatorado em helpers (`processFieldSummaries`, `processDictionaryMetrics`, etc.)
- Paginação em `/dictionaries` e `/fields/critical` alinhada aos schemas Zod (`{ data, total, page, limit, totalPages }`) — antes retornavam array puro, quebrando `.parse()` em runtime
- Tipos orval regenerados via `pnpm --filter @workspace/api-spec run codegen`
- Frontend `pages/dictionaries.tsx` e `pages/critical-fields.tsx` adaptados para `data?.data`
- Helper `getApiBase()` em `lib/utils.ts` usando `VITE_API_URL` com fallback a `import.meta.env.BASE_URL`
- `setBaseUrl()` chamado em `main.tsx` para cliente orval (quando `VITE_API_URL` definida)
- 3 usos manuais de `import.meta.env.BASE_URL` em `new-dictionary.tsx` e `dictionary-detail.tsx` substituídos por `getApiBase()`

## ✅ CONCLUÍDOS - 07/07/2026 (Esta sessão)

- **SCORE_THRESHOLDS.RELIABLE = 90** (alinhado ao RF05 ≥ 90)
- **Data Contract: `obrigatorio` derivado de `avgRequired >= 0.5`** (não de `chave`)
- **Drizzle config carrega `.env` de `artifacts/api-server/.env`** (caminho correto)
- **UI paginação** em `/dictionaries` e `/fields/critical` (botões Anterior/Próxima)
- **Paginação DB `/dictionaries`** — `LIMIT/OFFSET` + `inArray` + `desc(createdAt)`
- **CORS configurável** — lê `ALLOWED_ORIGINS` com fallback permissivo
- **Error handler global** + **validação extensão `.xlsx`/`.xlsm`** + try/catch parse Excel
- **Typecheck + Build** passaram 100%
- **Health check do banco** — `/api/healthz` faz `SELECT 1` no pool Drizzle; retorna 200/503 com status do DB
- **Erro de importação: mensagens reais** — `onError` das mutations extrai `err.message` do `ApiError` (zod/400/500) em vez de texto fixo
- **DDL: comentário de status só em Crítico/Pendente** — `classification === "critical" || "pending"` (antes aparecia em todas)

## ✅ CONCLUÍDOS - 08/07/2026 (Supabase Integration + DB Pagination + CSS/Import Fixes)

- **Supabase client + storage** — módulos `client.ts` e `storage.ts` com upload/download/signed URLs
- **audit_logs + storage_objects tables** — migração Drizzle gerada e aplicada no Supabase
- **Audit middleware** — intercepta POST/PUT/DELETE e grava em `audit_logs` com before/after/metadata
- **DDL validation endpoint** — `POST /api/dictionaries/:id/validate-ddl` executa em schema temporário + rollback
- **Backend routes** — GET/POST `/api/supabase/config`, GET `/api/supabase/status`, POST `/api/supabase/buckets`
- **Frontend SupabaseConfig page** — `/supabase-config` com abas Conexão/Storage/Validação DDL
- **Node.js 20 WebSocket fix** — polyfill `globalThis.WebSocket` com pacote `ws` para realtime
- **Typecheck + Build 100%** — todas as dependências @supabase/supabase-js, ws, @types/ws instaladas
- **DB pagination `/fields/critical`** — substituído `SELECT *` + filtro JS por query SQL com join/subquery + `LIMIT/OFFSET`
- **Seed script** — `scripts/src/seed.ts` cria 3 dicionários, 21 campos, 10 validações; executa via `pnpm --filter @workspace/scripts run seed`
- **GET `/dictionaries/:id` fix** — correção parsing ID (parseInt manual vs Zod safeParse)
- **Preview sheet CSS fix** — removido `sm:max-w-sm` do `Sheet` variant `left`/`right` em `components/ui/sheet.tsx`; corrigiu "apertada à direita" (era 384px fixo); bônus: `dictionary-detail.tsx` agora mostra 540px corretos
- **Import button fix na tela de preview** — `formContext` agora usa `resolvedMeta` do preview (backend) em vez de campos brutos do formulário; fixa caso "tabela vazia" quando usuário não preenche campo opcional