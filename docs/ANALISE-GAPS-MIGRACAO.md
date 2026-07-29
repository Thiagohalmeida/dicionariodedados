# Análise de Gaps - Migração Excel → Databricks

## Resumo Executivo

O sistema atual possui uma base sólida para importação, validação e exportação de dicionários de dados. Foram resolvidos gaps críticos de fundação. Restam gaps para migração completa (regras de negócio, fórmulas, dupla validação, geração DDL para Databricks).

---

## 1. Onboarding Atual vs. Objetivo

| Etapa Atual | Status | Gap para Objetivo |
|-------------|--------|-------------------|
| **Importação Excel** | ✅ Funciona (`/excel/preview`, `/dictionaries/from-excel`) | Não extrai **fórmulas** das células |
| **Validação única** | ✅ Funciona (múltiplas validações suportadas no backend) | UI não deixa claro que pode ter **2ª validação** |
| **Badge de validação** | ❌ Não existe | Necessário badge visual (1ª/2ª validação) |
| **Gating "dupla validação → DDL"** | ❌ Não existe | Lógica de bloqueio/liberação ausente |
| **Export DDL** | ✅ Parcial (`/export/ddl`) | Gera PostgreSQL genérico, **não Databricks** (Unity Catalog, Delta Lake, partições, Z-Order) |
| **Regras de negócio/fórmulas** | ⚠️ Schema pronto, ingestão pendente | Excel não lê fórmulas; UI não edita; export não inclui |

---

## 2. ✅ CONCLUÍDO - Fundação (P0)

### 2.1 Migrações de Banco Aplicadas ✅

| Migration | Status | Descrição |
|-----------|--------|-----------|
| `0004_change_origin_detail_to_text.sql` | ✅ Aplicada | Fix erro 500 - `origin_detail` enum → text |
| `0005_add_excluded_custom_platform_business_rules.sql` | ✅ Aplicada | Colunas `excluded`, `custom_internal_platform`, `business_rule_expression`, `business_rule_sql` |
| `0006_create_business_rules.sql` | ✅ Aplicada | Tabela `business_rules` + enum `business_rule_type` |

### 2.2 Schema & OpenAPI Atualizados ✅

| Arquivo | Status |
|---------|--------|
| `lib/db/src/schema/fields.ts` | ✅ 4 novas colunas |
| `lib/db/src/schema/business-rules.ts` | ✅ Nova tabela |
| `lib/db/src/schema/index.ts` | ✅ Export |
| `lib/api-spec/openapi.yaml` | ✅ Schemas atualizados + `BusinessRule` |
| `lib/api-zod` (regenerado via orval) | ✅ Types sincronizados |
| `UpdateFieldResponse` Zod | ✅ Inclui novos campos |

### 2.3 Bug Fixes Críticos ✅

| Commit | Fix |
|--------|-----|
| `c834f06` | Botão delete no dashboard "Dicionários Recentes" |
| `ca7cd76` | Fix "Excluir/Desconsiderar" - permite validador + observação |
| `709de5c` | Campo observação habilitado quando excluído |
| `7c4d7a3` | Inclui `formula` no submit de validação |
| `526aa59` | `useCallback` para `React.memo` funcionar |
| `03929ac` | `formula` no PATCH + response validation completo |
| `044fede` | Schema business rules + migrations |
| `a220f3d` | Migrations idempotentes |

---

## 3. Gaps Técnicos Restantes

### 3.1 Extração de Fórmulas do Excel (PRÓXIMO - P1.1)

**Arquivo:** `artifacts/api-server/src/modules/excel-ingestion-engine/index.ts`

- **Problema:** `parseExcelToDataDictionary()` lê apenas `cell.value`. Não acessa `cell.formula`.
- **Impacto:** Toda inteligência de negócio (fórmulas, validações condicionais, lookups) se perde na importação.
- **Solução:** Usar `cell.formula` do ExcelJS → popular `business_rule_expression` + classificar `formula` enum (`nao`/`sim`/`suporte`).

### 3.2 Migrações - Status Atualizado ✅

| Coluna (schema) | Migration | Status |
|-----------------|-----------|--------|
| `fields.formula` | `0002` ✅ | OK |
| `fields.excluded` | `0005` ✅ | **APLICADA** |
| `fields.custom_internal_platform` | `0005` ✅ | **APLICADA** |
| `fields.business_rule_expression` | `0005` ✅ | **APLICADA** |
| `fields.business_rule_sql` | `0005` ✅ | **APLICADA** |
| `validations.origin_detail` enum→text | `0004` ✅ | **APLICADA** |
| `business_rules` table | `0006` ✅ | **APLICADA** |

### 3.3 PATCH `/fields/:id` - ✅ Resolvido

| Commit | Fix |
|--------|-----|
| `03929ac` | `formula` no response |
| `044fede` | `excluded`, `customInternalPlatform`, `businessRuleExpression`, `businessRuleSql` no response |

### 3.4 Validação Response - ✅ Resolvido

| Commit | Fix |
|--------|-----|
| `03929ac` | `originType`, `originDetail`, `businessRuleRationale` no response |

---

## 4. Fluxo de Dupla Validação (P1.2 - PRÓXIMO)

### Requisitos
1. **Badge visual** por tabela: `✓ 1 validação` / `✓✓ 2 validações` / `✅ Pronto p/ DDL`
2. **Gating opcional**: DDL sempre liberado, mas UI sugere aguardar 2ª validação
3. **Rastreabilidade**: `validatorName` já salvo por validação

### Implementação Necessária

#### Backend
- Endpoint `GET /dictionaries/:id/validation-status` → contadores por campo + `canGenerateDDL`

#### Frontend
- `dictionaries.tsx`: Coluna "Validações" com badge (1️⃣/2️⃣/✅)
- `dictionary-detail.tsx`: Contador validações por campo
- Botão "Gerar DDL" sempre habilitado, tooltip sugere aguardar 2ª validação

---

## 5. Geração DDL para Databricks (P2)

### Atual (`/export/ddl`) - PostgreSQL Genérico
```sql
CREATE TABLE tabela (coluna VARCHAR(255), ...);
```

### Necessário para Databricks (Unity Catalog + Delta Lake)
```sql
CREATE TABLE IF NOT EXISTS catalog.schema.tabela (
  coluna STRING COMMENT 'descrição do negócio',
  ...
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
)
PARTITIONED BY (data_particao)
CLUSTER BY (chave_primaria);
```

### Mapeamento de Tipos
| Atual | Databricks Delta |
|-------|------------------|
| `string` | `STRING` |
| `int` | `BIGINT` |
| `decimal` | `DECIMAL(38,18)` |
| `date` | `DATE` |

### Metadados no Export
- `catalog` / `schema` (configurável por env var + override por dicionário)
- `partition_column` (detectar coluna de data automaticamente)
- `zorder_columns` (PK + FKs frequentes)
- `table_properties` (Delta Lake otimizações)
- `column_comments` (descrição + regra de negócio)

---

## 6. Regras de Negócio / Fórmulas (P1.1 + P2)

### Estratégia de Migração

| Tipo de Regra | Abordagem |
|---------------|-----------|
| **Fórmulas Excel** (`=SE(A1>0, "OK", "ERRO")`) | Extrair fórmula original → `business_rule_expression` → converter para SQL/Generated Columns |
| **Validações condicionais** | Mapear para `CHECK constraints` ou Quality Checks (DLT expectations) |
| **Lookups/VLOOKUP** | Documentar como `JOIN` com tabela de referência (catálogo) |
| **Macros/VBA** | Fora de escopo - documentar manualmente |

### Pipeline
1. **Import** → Extrai fórmula → `business_rule_expression` + classifica `formula` enum
2. **Validação** → Especialista revisa/converte → `business_rule_sql`
3. **Export DDL Databricks** → `GENERATED ALWAYS AS (business_rule_sql) STORED` ou View materializada

---

## 7. Plano de Ação Atualizado

| Prioridade | Item | Esforço | Status |
|------------|------|---------|--------|
| **P0** | Migrations aplicadas | 30 min | ✅ **CONCLUÍDO** |
| **P0** | Fix `UpdateFieldResponse` Zod | 30 min | ✅ **CONCLUÍDO** |
| **P1.1** | **Extrair fórmulas no Excel ingestion** | 2-4h | 🔄 **PRÓXIMO** |
| **P1.2** | Endpoint status dupla validação + badge UI | 3-4h | ⏳ PENDENTE |
| **P2.1** | DDL Generator Databricks (Unity Catalog, Delta, Partition, Z-Order) | 4-6h | ⏳ PENDENTE |
| **P2.2** | Export DDL Databricks endpoint | 2h | ⏳ PENDENTE |
| **P3** | Automação deploy Render (migration auto) | 1h | ⏳ PENDENTE |

---

## 8. Próximo Passo Imediato

### 🎯 **P1.1 - Extração de Fórmulas no Excel Ingestion**

**Arquivo:** `artifacts/api-server/src/modules/excel-ingestion-engine/index.ts`

**Tarefas:**
1. Ler `cell.formula` do ExcelJS (além de `cell.value`)
2. Se célula tem fórmula → `business_rule_expression = cell.formula`
3. Classificar `formula` enum:
   - Se tem fórmula → `"sim"` (campo calculado, não vai no JSON final)
   - Se não tem → `"nao"`
4. Para fórmulas multi-célula complexas → criar entrada em `business_rules` table

**Impacto:** Resgata a inteligência de negócio que hoje se perde na importação.

---

## 9. Decisões de Arquitetura Confirmadas

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Dupla validação obrigatória? | **Não** - Badge informativo apenas |
| 2 | Onde salvar fórmula | **Híbrida**: `fields.business_rule_expression/sql` + `business_rules` table |
| 3 | Estratégia Databricks | **Schema First** para todas |
| 4 | Particionamento | **Detecção automática** de coluna de data |
| 5 | Unity Catalog/Schema | **Híbrida**: Default env var + override opcional |

---

**Iniciar P1.1 - Extração de Fórmulas?**