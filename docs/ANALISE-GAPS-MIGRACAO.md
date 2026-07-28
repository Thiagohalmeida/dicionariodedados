# Análise de Gaps - Migração Excel → Databricks

## Resumo Executivo

O sistema atual possui uma base sólida para importação, validação e exportação de dicionários de dados. Porém, existem **gaps críticos** para atender ao objetivo de migração completa (regras de negócio, fórmulas, dupla validação, geração DDL para Databricks).

---

## 1. Onboarding Atual vs. Objetivo

| Etapa Atual | Status | Gap para Objetivo |
|-------------|--------|-------------------|
| **Importação Excel** | ✅ Funciona (`/excel/preview`, `/dictionaries/from-excel`) | Não extrai **fórmulas** das células |
| **Validação única** | ✅ Funciona (múltiplas validações suportadas no backend) | UI não deixa claro que pode ter **2ª validação** |
| **Badge de validação** | ❌ Não existe | Necessário badge visual (1ª/2ª validação) |
| **Gating "dupla validação → DDL"** | ❌ Não existe | Lógica de bloqueio/liberação ausente |
| **Export DDL** | ✅ Parcial (`/export/ddl`) | Gera PostgreSQL genérico, **não Databricks** (Unity Catalog, Delta Lake, partições, Z-Order) |
| **Regras de negócio/fórmulas** | ❌ Schema existe, mas não povoado | Excel não lê fórmulas; UI não edita; export não inclui |

---

## 2. Gaps Técnicos Identificados

### 2.1 Extração de Fórmulas do Excel (CRÍTICO)

**Arquivo:** `artifacts/api-server/src/modules/excel-ingestion-engine/index.ts`

- **Problema:** `parseExcelToDataDictionary()` lê apenas `cell.value` (resultado calculado). Não acessa `cell.formula`.
- **Impacto:** Toda inteligência de negócio (fórmulas, validações condicionais, lookups) se perde na importação.
- **Solução:** Usar `cell.formula` do ExcelJS e mapear para coluna `formula` (enum: `nao` | `sim` | `suporte`) + armazenar fórmula original em novo campo `business_rule_expression` (text).

### 2.2 Migrações Faltantes no Banco

| Coluna (schema) | Migration | Status |
|-----------------|-----------|--------|
| `fields.formula` | `0002` ✅ | OK |
| `fields.excluded` | ❌ | **FALTANDO** |
| `fields.custom_internal_platform` | ❌ | **FALTANDO** |
| `validations.origin_detail` enum→text | `0004` ✅ | OK (precisa deploy) |

**Ação:** Gerar migration `0005_add_excluded_custom_platform.sql`:
```sql
ALTER TABLE "fields" ADD COLUMN "excluded" boolean DEFAULT false NOT NULL;
ALTER TABLE "fields" ADD COLUMN "custom_internal_platform" text;
```

### 2.3 PATCH `/fields/:id` - Campos não retornados

**Arquivo:** `artifacts/api-server/src/routes/fields.ts` (linha 85-97)

- **Corrigido no commit `03929ac`**: Adicionado `formula` ao response
- **Ainda faltando:** `excluded` e `customInternalPlatform` no response do `UpdateFieldResponse` (Zod schema precisa ser atualizado em `lib/api-zod`)

### 2.4 Validação Response - Campos Obrigatórios

**Corrigido no commit `03929ac`**: Adicionados `originType`, `originDetail`, `businessRuleRationale` ao response da validação para satisfazer `SubmitValidationResponse` (Zod).

---

## 3. Fluxo de Dupla Validação (NOVO)

### Requisitos
1. **Badge visual** por tabela: `Validado por 1` / `Validado por 2` / `Pronto para DDL`
2. **Gating**: Só libera geração DDL quando `totalValidations >= 2` E `statusFinal === APPROVED` para todos os campos
3. **Rastreabilidade**: Guardar `validatorName` de cada validação (já existe no backend)

### Implementação Necessária

#### Backend
```typescript
// Novo endpoint ou extend GET /dictionaries/:id
{
  validationStatus: {
    fieldsValidatedBy1: number,
    fieldsValidatedBy2: number,
    allFieldsDoubleValidated: boolean,
    canGenerateDDL: boolean
  }
}
```

#### Frontend
- `dictionaries.tsx`: Adicionar coluna "Validações" com badge
- `dictionary-detail.tsx`: Mostrar contador de validações por campo
- Botão "Gerar DDL" só habilitado quando `canGenerateDDL === true`

---

## 4. Geração DDL para Databricks (Unity Catalog)

### Atual (`/export/ddl`) - PostgreSQL Genérico
```sql
CREATE TABLE tabela (coluna VARCHAR(255), ...);
```

### Necessário para Databricks
```sql
-- Unity Catalog 3-level namespace
CREATE TABLE IF NOT EXISTS catalog.schema.tabela (
  coluna STRING COMMENT 'descrição do negócio',
  ...
) USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
)
PARTITIONED BY (data_particao)  -- se houver coluna de data
CLUSTER BY (chave_primaria);     -- Z-Order para performance
```

### Mapeamento de Tipos
| Atual | Databricks Delta |
|-------|------------------|
| `string` | `STRING` |
| `int` | `BIGINT` |
| `decimal` | `DECIMAL(38,18)` |
| `date` | `DATE` |

### Metadados Necessários no Export
- `catalog` / `schema` (configurável por ambiente)
- `partition_column` (detectar coluna de data)
- `zorder_columns` (PK + FKs frequentes)
- `table_properties` (Delta Lake otimizações)
- `column_comments` (descrição + regra de negócio)

---

## 5. Regras de Negócio / Fórmulas

### Estratégia de Migração

| Tipo de Regra | Abordagem |
|---------------|-----------|
| **Fórmulas Excel** (`=SE(A1>0, "OK", "ERRO")`) | Extrair fórmula original → armazenar em `fields.business_rule_expression` (text) → converter para SQL/Delta Lake Generated Columns ou View |
| **Validações condicionais** | Mapear para `CHECK constraints` ou Quality Checks (Great Expectations / Delta Live Tables expectations) |
| **Lookups/VLOOKUP** | Documentar como `JOIN` com tabela de referência (catálogo) |
| **Macros/VBA** | Fora de escopo - documentar manualmente |

### Novo Campo no Schema
```typescript
// fields.ts
businessRuleExpression: text("business_rule_expression"),  // Fórmula original
businessRuleSql: text("business_rule_sql"),                // Conversão para SQL
```

### Pipeline Sugerido
1. **Import** → Extrai fórmula → salva em `business_rule_expression`
2. **Validação** → Especialista revisa/converte para SQL → salva em `business_rule_sql`
3. **Export DDL** → Inclui `GENERATED ALWAYS AS (business_rule_sql) STORED` ou cria View materializada

---

## 6. Plano de Ação Priorizado

| Prioridade | Item | Esforço | Arquivos Afetados |
|------------|------|---------|-------------------|
| **P0** | Migration `excluded` + `custom_internal_platform` | 30 min | `lib/db/migrations/`, `lib/db/schema/fields.ts` |
| **P0** | Fix `UpdateFieldResponse` Zod (excluded, customInternalPlatform) | 30 min | `lib/api-zod/`, `artifacts/api-server/src/routes/fields.ts` |
| **P1** | Extração de fórmulas no Excel ingestion | 2-4h | `excel-ingestion-engine/index.ts`, schema fields |
| **P1** | Endpoint status dupla validação + badge UI | 3-4h | `dictionaries.ts`, `dictionary-detail.tsx`, `dictionaries.tsx` |
| **P2** | DDL Generator Databricks (Unity Catalog, Delta, Partition, Z-Order) | 4-6h | Novo módulo `ddl-generator/`, `dictionaries.ts` export |
| **P2** | Campo `business_rule_expression` + `business_rule_sql` | 2h | Schema, ingestion, validation UI, export |
| **P3** | Automação deploy Render (migration auto) | 1h | `render.yaml` |

---

## 7. Decisões de Arquitetura Pendentes

1. **Databricks Catalog/Schema**: Hardcoded, variável de ambiente, ou configurável por dicionário?
2. **Particionamento**: Detectar automaticamente coluna de data ou exigir configuração?
3. **Quality Checks**: Usar Delta Live Tables `expectations` ou Great Expectations standalone?
4. **Versionamento DDL**: Gerar `CREATE OR REPLACE` vs `ALTER TABLE` para evolução de schema?
5. **Fórmulas complexas**: Converter para SQL nativo ou manter como expressão documentada + View?

---

## 8. Conclusão

O sistema **já suporta múltiplas validações por campo** no backend (summary calcula média, conflitos, etc). O gap principal é **expor isso na UI** (badges, gating DDL) e **extrair a inteligência do Excel** (fórmulas).

**Próximo passo recomendado:** Implementar P0/P1 (migrations + extração fórmulas + status dupla validação) antes de atacar o gerador DDL Databricks.