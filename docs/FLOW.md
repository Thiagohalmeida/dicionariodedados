# Fluxo de Trabalho — Validador de Dicionário de Dados

Documento técnico que descreve o **fluxo completo esperado** do produto, o estado atual da implementação e as lacunas a serem resolvidas.

---

## Visão do Fluxo Completo (Estado Desejado)

O fluxo é dividido em **três etapas principais**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ETAPA 1 — INGESTÃO                                                         │
│                                                                             │
│  Excel (.xlsx) ──► Motor de Ingestão ──► JSON padronizado ──► Download/    │
│                     (auto-detecção,        (revisável pelo    Edição pelo   │
│                      filtro de ruído,       usuário)          especialista  │
│                      snake_case,                                            │
│                      inferência de tipo)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                                 │
                                          Arquivo JSON
                                         (revisado/editado)
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ETAPA 2 — IMPORTAÇÃO E VALIDAÇÃO                                           │
│                                                                             │
│  JSON ──► Importação ──► Dicionário de Dados ──► Validação por campo       │
│           (POST /api/   criado no banco,          (5 critérios binários,    │
│            dictionaries) status "Pendente"         score 0-100 por campo)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                                 │
                                      Dicionário validado
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ETAPA 3 — EXPORTAÇÃO                                                       │
│                                                                             │
│  Dicionário validado ──► JSON validado  (estrutura completa)                │
│                      ──► CSV           (tabela plana para planilhas)        │
│                      ──► DDL           (CREATE TABLE pronto para banco)     │
│                      ──► Data Contract (contrato JSON para engenharia)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ETAPA 1 — Ingestão de Excel

### Propósito

Fornecedores entregam dicionários de dados em planilhas Excel. A etapa de ingestão extrai automaticamente os metadados dos campos dessas planilhas e os converte para o formato JSON padrão do sistema — antes de qualquer importação ou validação.

> O JSON gerado é um **artefato intermediário**, destinado à revisão do especialista de dados antes de entrar no sistema de validação.

### Como Funciona Hoje

O fluxo agora suporta **duas modalidades** de ingestão de Excel:

**Modalidade 1 — Preview (Recomendada)**: `POST /api/excel/preview`
- Processa o Excel com o motor de ingestão
- **Não persiste no banco** — retorna JSON padronizado + metadados
- Permite revisão/edição pelo especialista antes de importar

**Modalidade 2 — Direta (Legado)**: `POST /api/dictionaries/from-excel?persist=true`
- Mesmo motor, mas persiste direto no banco (compatibilidade)

```
Atual:   Excel ──► Motor ──► POST /api/excel/preview ──► JSON para revisão ──► POST /api/dictionaries
Legado:  Excel ──► Motor ──► INSERT no banco (sem revisão)
```

**Implementação atual do motor** (`artifacts/api-server/src/modules/excel-ingestion-engine/index.ts`):

| Função             | Implementação                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Seleção de aba     | Pontuação por número de linhas + colunas válidas + posição (aba preferencial tem prioridade)                                          |
| Filtro de ruído    | Remove colunas cujo cabeçalho contenha: `%`, `∆`, `delta`, `variação`, `projeção`, `meta`, `budget`, `var`, `perc`, `pct`             |
| snake_case         | Remove acentos, converte espaços em `_`, minúsculas                                                                                   |
| Inferência de tipo | Amostra os primeiros 20 valores da coluna: data → `date`; número decimal → `decimal`; inteiro → `int`; texto → `string`               |
| Campos gerados     | `campo_origem`, `campo_tecnico`, `descricao` (vazio), `origem` (da aba), `periodicidade` (`eventual`), `tipo_dado`, `chave` (`false`) |

**Resposta atual do endpoint:**

```json
{
  "id": 7,
  "processo": "rfq",
  "categoria": "medicamentos",
  "tabela": "rfq_medicamentos",
  "version": 1,
  "status": "pending",
  "createdAt": "2026-07-02T...",
  "meta": {
    "arquivo": "cotacao_2026.xlsx",
    "aba_utilizada": "Itens",
    "abas_ignoradas": [{ "aba": "Resumo", "motivo": "poucas colunas" }],
    "total_colunas_raw": 24,
    "colunas_removidas": ["Variação %", "Δ Custo", "Projeção 2027"]
  }
}
```

### Lacuna Atual

**✅ L1 RESOLVIDA** — Endpoint `POST /api/excel/preview` implementado:
- Retorna `{ meta, json_gerado }` sem persistir no banco
- Frontend exibe JSON em editor com highlight (aba "Excel" → "Validação do Preview")
- Especialista edita `descricao`, `periodicidade`, `origem`, `chave`, `tipo_dado`
- Botão "Importar Dicionário" envia JSON validado para `POST /api/dictionaries`

**✅ L2 RESOLVIDA** — Motor de inferência aprimorado com heurísticas conservadoras:
- `descricao`: deixada **vazia** (força revisão manual)
- `periodicidade`: inferida do nome da aba (dia/diário, semana/semanal, mês/mensal) ou proporção de datas (>40% → `diario`), senão `eventual`
- `origem`: tenta extrair de coluna com cabeçalho contendo "origem" ou "sistema"; fallback: `${arquivo} | ${aba}`

Fluxo consolidado:
```
Upload Excel → Preview JSON → [Edição opcional + Validação campo a campo] → Importar → Validar → Exportar
```

---

## ETAPA 2 — Importação e Validação

### Propósito

Com o JSON revisado em mãos, o especialista importa o dicionário para o sistema. A partir daí, qualquer membro da equipe (sem conhecimento técnico) pode validar cada campo usando os 5 critérios de qualidade.

### Como Funciona Hoje

**Importação JSON** — `POST /api/dictionaries`

O endpoint recebe o JSON no formato padrão e cria o dicionário com todos os campos no banco. Funciona conforme esperado.

```json
{
  "processo": "rfq",
  "categoria": "medicamentos",
  "tabela": "rfq_medicamentos",
  "campos": [
    {
      "campo_origem": "Código do Item",
      "descricao": "Identificador único do item no SAP",
      "origem": "SAP",
      "periodicidade": "diario",
      "campo_tecnico": "codigo_do_item",
      "tipo_dado": "int",
      "chave": true
    }
  ]
}
```

**Validação por campo** — `POST /api/fields/:id/validate`

Cada campo pode receber uma ou mais validações de diferentes validadores. Cada validação responde 5 critérios binários:

| Critério                         | Chave             | Peso   |
| -------------------------------- | ----------------- | ------ |
| Campo utilizado no processo      | `used`            | 20 pts |
| Campo obrigatório                | `required`        | 20 pts |
| Nome técnico correto             | `correctName`     | 20 pts |
| Origem do dado correta           | `correctOrigin`   | 20 pts |
| Possui regra de negócio definida | `hasBusinessRule` | 20 pts |

**Score e Classificação:**

| Score                  | Status    |
| ---------------------- | --------- |
| ≥ 90                   | Confiável |
| 60 – 89                | Atenção   |
| < 60                   | Crítico   |
| Sem validações         | Pendente  |
| Aprovados + Reprovados | Conflito  |

**Detecção de conflito** (`artifacts/api-server/src/lib/summary.ts`):
Se o mesmo campo tiver validações com score ≥ 60 (aprovado) e score < 60 (reprovado) de validadores diferentes → status = `conflict`.

### Lacuna Atual

Nenhuma lacuna crítica nesta etapa. Funcional conforme o esperado.

---

## ETAPA 3 — Exportação

### Propósito

Após a validação, o dicionário deve poder ser exportado em formatos consumíveis por diferentes perfis:

| Formato       | Consumidor                  | Uso                                           |
| ------------- | --------------------------- | --------------------------------------------- |
| JSON validado | Especialista de dados       | Arquivo de controle / reimportação            |
| CSV           | Gestor / Auditoria          | Planilhas e relatórios                        |
| DDL           | DBA / Engenheiro de dados   | Criação física das tabelas no banco           |
| Data Contract | Time de engenharia de dados | Contrato entre produtor e consumidor de dados |

### Como Funciona Hoje

| Endpoint                                         | Status                                         |
| ------------------------------------------------ | ---------------------------------------------- |
| `GET /api/dictionaries/:id/export`               | ✅ Implementado (JSON e CSV via `?format=csv`) |
| `GET /api/dictionaries/:id/export/ddl`           | ✅ Implementado                                |
| `GET /api/dictionaries/:id/export/data-contract` | ✅ Implementado                                |

**DDL gerado (exemplo):**

```sql
-- DDL gerado pelo Validador DD
-- Tabela: rfq_medicamentos | Processo: rfq | Categoria: medicamentos

CREATE TABLE rfq_medicamentos (
  codigo_do_item INTEGER PRIMARY KEY,
  descricao_material VARCHAR(255),
  quantidade DECIMAL(18,4),
  data_entrega DATE
);
```

**Data Contract gerado (exemplo):**

```json
{
  "versao": "1.0",
  "processo": "rfq",
  "categoria": "medicamentos",
  "tabela": "rfq_medicamentos",
  "geradoEm": "2026-07-02T...",
  "campos": [
    {
      "campo": "codigo_do_item",
      "campo_origem": "Código do Item",
      "tipo": "int",
      "descricao": "Identificador único do item no SAP",
      "obrigatorio": true,
      "chave": true,
      "origem": "SAP",
      "periodicidade": "diario"
    }
  ]
}
```

### Lacuna Atual

**✅ L3 RESOLVIDA** — DDL inclui comentário de status em campos Crítico/Pendente:
```sql
CREATE TABLE rfq_medicamentos (
  codigo_do_item INTEGER PRIMARY KEY,
  descricao_material VARCHAR(255), -- status: critical
  quantidade DECIMAL(18,4),        -- status: pending
  data_entrega DATE
);
```
Endpoint `/export/ddl` busca `getFieldsWithSummaries(id)` e anota `status` quando classification = `critical` ou `pending`.

**✅ L4 RESOLVIDA** — Data Contract inclui `regras_negocio` por campo:
```json
"regras_negocio": {
  "usado": true,
  "obrigatorio": true,
  "nome_correto": true,
  "origem_correta": false,
  "regra_negocio": true
}
```
Calculado como média das validações (`avg >= 0.5`), `null` se sem validações.

**Novos Endpoints Databricks (v2.0):**
- `GET /api/dictionaries/:id/export/ddl-databricks` — CREATE TABLE nativo Delta Lake
- `GET /api/dictionaries/:id/export/ddl-databricks-replace` — CREATE OR REPLACE
- `GET /api/dictionaries/:id/export/ddl-databricks-alter` — ALTER TABLE ADD COLUMNS
- `POST /api/dictionaries/:id/export/databricks-load-sql` — COPY INTO / MERGE
- `GET /api/dictionaries/:id/export/databricks-optimize-sql` — OPTIMIZE + Z-ORDER
- `GET /api/dictionaries/:id/export/databricks-vacuum-sql` — VACUUM

**DDL Databricks (exemplo):**
```sql
-- DDL Databricks gerado automaticamente
-- Tabela: rfq_medicamentos | Processo: rfq | Categoria: medicamentos
-- Gerado em: 2026-07-30T...

CREATE TABLE IF NOT EXISTS main.suprimentos.rfq_medicamentos (
  codigo_do_item BIGINT PRIMARY KEY,
  descricao_material STRING COMMENT 'Identificador único do item no SAP | Score: 100 (Confiável)',
  quantidade DECIMAL(38,18),
  data_entrega DATE
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
)
PARTITIONED BY (data_entrega)
CLUSTER BY (codigo_do_item);
```

---

## Resumo das Lacunas e Próximos Passos

| #   | Lacuna                                                                                          | Impacto                                                                      | Status         |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------- |
| L1  | Excel vai direto para o banco — falta etapa de preview/revisão do JSON                          | **Alto** — usuário não pode corrigir inferências antes de criar o dicionário | ✅ **Concluída** |
| L2  | `descricao`, `periodicidade` e `origem` inferidos pelo motor estão sempre incompletos/genéricos | **Alto** — campos entram no sistema sem metadados de negócio                 | ✅ **Concluída** |
| L3  | DDL não sinaliza campos com status Crítico ou Pendente                                          | Baixo                                                                        | ✅ **Concluída** |
| L4  | Data Contract não inclui regras de negócio das validações                                       | Baixo                                                                        | ✅ **Concluída** |

### Novas Implementações v2.0 (30/07/2026)

| Feature                                   | Status   | Detalhes |
|-------------------------------------------|----------|----------|
| Databricks DDL Generator (Unity Catalog) | ✅       | 6 novos endpoints |
| Unity Catalog 3-level namespace           | ✅       | `catalog.schema.table` |
| Delta Lake format + TBLPROPERTIES         | ✅       | CDF, auto-optimize, auto-compact |
| Auto partition detection (date columns)   | ✅       | Detecta colunas de data |
| Auto Z-Order (PK + FK-like columns)       | ✅       | Até 4 colunas |
| Generated columns (business_rule_sql)     | ✅       | `GENERATED ALWAYS AS (...) STORED` |
| Databricks LOAD SQL (COPY INTO / MERGE)   | ✅       | Para carga de dados |
| OPTIMIZE + Z-ORDER SQL                    | ✅       | Manutenção de performance |
| VACUUM SQL                                | ✅       | Retenção configurável |
| UI dropdown com 8 opções de export Databricks | ✅ | `dictionary-detail.tsx` |

### Próximos Passos (Pós-v2.0)

- [ ] Mapeamento DDL expandido: `boolean → BOOLEAN`, `timestamp → TIMESTAMP`, `text → TEXT`
- [ ] Versionamento de dicionários (diff entre versões)
- [ ] Notificações (e-mail/Slack) para validações pendentes
- [ ] Integração com catálogo corporativo (DataHub, Amundsen)

---

## Endpoints da API — Estado Atual

| Método   | Endpoint                                     | Descrição                              | Status              |
| -------- | -------------------------------------------- | -------------------------------------- | ------------------- |
| `POST`   | `/api/dictionaries`                          | Importa dicionário via JSON            | ✅                  |
| `GET`    | `/api/dictionaries`                          | Lista todos os dicionários             | ✅                  |
| `GET`    | `/api/dictionaries/:id`                      | Detalhe com campos e scores            | ✅                  |
| `PATCH`  | `/api/dictionaries/:id`                      | Atualiza metadados do dicionário       | ✅                  |
| `DELETE` | `/api/dictionaries/:id`                      | Remove dicionário                      | ✅                  |
| `GET`    | `/api/dictionaries/:id/export`               | Exporta JSON ou CSV                    | ✅                  |
| `GET`    | `/api/dictionaries/:id/export/ddl`           | Exporta DDL SQL (PostgreSQL)           | ✅                  |
| `GET`    | `/api/dictionaries/:id/export/ddl-databricks`| Exporta DDL Databricks (Delta Lake)    | ✅ **Novo v2.0**    |
| `GET`    | `/api/dictionaries/:id/export/ddl-databricks-replace`| CREATE OR REPLACE TABLE     | ✅ **Novo v2.0**    |
| `GET`    | `/api/dictionaries/:id/export/ddl-databricks-alter`| ALTER TABLE ADD COLUMNS         | ✅ **Novo v2.0**    |
| `POST`   | `/api/dictionaries/:id/export/databricks-load-sql`| COPY INTO / MERGE SQL           | ✅ **Novo v2.0**    |
| `GET`    | `/api/dictionaries/:id/export/databricks-optimize-sql`| OPTIMIZE + Z-ORDER            | ✅ **Novo v2.0**    |
| `GET`    | `/api/dictionaries/:id/export/databricks-vacuum-sql`| VACUUM SQL                   | ✅ **Novo v2.0**    |
| `GET`    | `/api/dictionaries/:id/export/data-contract` | Exporta Data Contract JSON             | ✅                  |
| `POST`   | `/api/dictionaries/from-excel`               | Ingestão direta de Excel (compat)      | ✅                  |
| `POST`   | `/api/excel/preview`                         | Preview do JSON a partir do Excel      | ✅                  |
| `POST`   | `/api/fields/:id/validate`                   | Submete validação de um campo          | ✅                  |
| `GET`    | `/api/fields/critical`                       | Lista campos com score < 60            | ✅                  |
| `GET`    | `/api/dashboard`                             | Métricas globais de governança         | ✅                  |
| `GET`    | `/api/dictionaries/:id/validation-status`    | Status de validação por campo          | ✅                  |
| `GET`    | `/api/healthz`                               | Health check com DB check              | ✅                  |

---

## Schema do Banco de Dados

```
dictionaries
  id          SERIAL PK
  processo    TEXT
  categoria   TEXT
  tabela      TEXT
  version     INTEGER    ← preparado para versionamento futuro
  parentId    INTEGER    ← FK para dicionário pai (versionamento)
  status      TEXT       ← pending | in_review | validated
  createdAt   TIMESTAMP

fields
  id             SERIAL PK
  dictionaryId   FK → dictionaries.id
  campoOrigem    TEXT    ← nome original no sistema fonte
  campoTecnico   TEXT    ← snake_case
  descricao      TEXT
  origem         TEXT    ← sistema de origem (SAP, TOTVS, etc.)
  periodicidade  TEXT
  tipoDado       TEXT    ← string | int | decimal | date
  chave          BOOLEAN
  formula        TEXT    ← enum: 'nao' | 'sim' | 'suporte'
  excluded       BOOLEAN
  customInternalPlatform TEXT
  businessRuleExpression TEXT
  businessRuleSql TEXT
  createdAt      TIMESTAMP

validations
  id               SERIAL PK
  fieldId          FK → fields.id
  validatorName    TEXT
  used             BOOLEAN
  required         BOOLEAN
  correctName      BOOLEAN
  correctOrigin    BOOLEAN
  hasBusinessRule  BOOLEAN
  score            INTEGER    ← calculado: soma dos critérios × 20
  createdAt        TIMESTAMP

business_rules
  id             SERIAL PK
  name           TEXT
  fieldIds       INTEGER[]  ← array de field IDs
  expression     TEXT       ← fórmula original Excel
  sql            TEXT       ← conversão para SQL
  ruleType       TEXT       ← constraint | generated_column | check | lookup
  createdAt      TIMESTAMP
```

---

## Deploy Checklist

### Render (API Server)
```env
DATABASE_URL=postgresql://... (Supabase pooler)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGINS=https://dicionariodedados-api-server.vercel.app,https://*.vercel.app
PORT=5000
LOG_LEVEL=info
```

### Vercel (Frontend)
- Build: `pnpm --filter @workspace/data-dict run build`
- Output: `artifacts/data-dict/dist/public`
- Rewrites: `/api/*` → `https://validador-api.onrender.com`
- Env: `VITE_API_URL=https://validador-api.onrender.com`

### Supabase
- Buckets: `excel-uploads` (private), `exports` (private)
- Tabelas: `dictionaries`, `fields`, `validations`, `audit_logs`, `storage_objects`, `business_rules`
- RLS policies para isolamento por usuário (futuro)

---

_Gerado em: 30/07/2026 — Versão 2.0 (Databricks nativo, dupla validação, auto-status)_