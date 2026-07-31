# Plano de Implementação: Catálogo de Dados SAP/Suprimentos

> **Baseado na análise em** `docs/AVALIACAO-CATALOGO-DADOS.md` **e na arquitetura atual do projeto** (React + Express + Drizzle + Supabase)

---

## 1. Visão Geral

### Objetivo
Criar uma **aba independente "Catálogo de Dados"** na plataforma que permita:
- Busca semântica por nome de tabela, coluna, descrição ou termo de negócio
- Visualização de metadados completos (tipo, PK, obrigatoriedade, LGPD, classificação)
- **Vinculação bidirecional**: compradores referenciam campos de planilhas ↔ itens do catálogo SAP
- Apoio à geração de DDLs usando tipos e regras do catálogo corporativo

### Escopo do PDF (já validado)
- **153 páginas**, texto nativo (sem OCR)
- **18 tabelas**: 9 RFN (refinadas) + 9 RAW (brutas)
- **674 colunas** com metadados padronizados
- **24 indicadores** com fórmulas
- **22 requisitos de negócio** com regras
- **ETLs**: pacotes ELT por tabela (ex.: `pkg_rfn_msh_sap_sup_contratualizacao`)

### Princípios Arquiteturais
| Princípio | Decisão |
|-----------|---------|
| **Separação de domínios** | Tabelas `catalog_*` separadas de `dictionaries`/`fields` (diferentes ciclos de vida) |
| **Referência somente leitura** | Catálogo = dado de produção; Dicionários = em validação |
| **Link opcional** | `fields.catalog_column_id` FK nullable → não obriga vinculação |
| **Carga pontual + upsert** | Script único reexecutável (chaves naturais) para atualizações futuras |
| **Busca no Postgres** | Não servir JSON estático; carregar no banco para busca indexada |

---

## 2. Arquitetura de Dados

### 2.1 Novas Tabelas (schema `catalog`)

```sql
-- lib/db/src/schema/catalog.ts

catalog_domains           -- Assunto, Owner, Área, Palavras-chave
catalog_tables            -- Schema, Nome, Descrição, Camada (RFN/RAW), Data Owner
catalog_columns           -- Tabela FK, Nome, Tipo, Descrição, PK, Obrigatório,
                          -- Confidencialidade, Classificação LGPD, Identificável
catalog_indicators        -- Nome, Fórmula, Meta, Frequência, Homologadores
catalog_requirements      -- Assunto, Descrição, Regras Negócio, Status, Data
catalog_etl_packages      -- Nome do pacote ELT
catalog_table_etl         -- N:N tabela ↔ pacote ELT
```

### 2.2 Link com Domínio Existente

```sql
-- Em fields (tabela existente)
ALTER TABLE fields ADD COLUMN catalog_column_id INTEGER
  REFERENCES catalog_columns(id) ON DELETE SET NULL;
```

> Permite: ao validar campo novo, comprador busca no catálogo e clica "Vincular" → preenche automaticamente tipo, descrição, regras.

---

## 3. Fases de Implementação

### FASE 1: Parser do PDF → JSON Intermediário
**Duração estimada:** 2-3 dias  
**Tecnologia:** Node.js/TypeScript (mesmo stack do `api-server`)  
**Entrada:** `catalogo_suprimentos1.pdf`  
**Saída:** `scripts/data/catalog-intermediate.json` (para validação manual)

#### 3.1 Extração de Texto
```typescript
// scripts/src/pdf-extractor.ts
import pdfParse from "pdf-parse";
import fs from "fs";

const buffer = fs.readFileSync("catalogo_suprimentos1.pdf");
const data = await pdfParse(buffer);
// data.text = 153 páginas de texto nativo com layout preservado
```

#### 3.2 Parser State Machine (tratando quebras de linha)
```typescript
// Desafio confirmado: nomes longos quebram em 2 linhas
// Ex.: "SK_SUP_DOCUMENTO_COMPRA_MATERI" + "AL_CENTRO" = "SK_SUP_DOCUMENTO_COMPRA_MATERIAL_CENTRO"

// Estratégia:
// 1. Split por páginas (form feed \f ou regex de cabeçalho)
// 2. Para cada tabela detectada (padrão "RFN_MSH_" ou "RAW_SAP_"):
//    - Iterar linhas
//    - Se linha NÃO tem marcadores (Coluna|Tipo|°) → continuação da linha anterior
//    - Montar objeto coluna completo antes de emitir
```

#### 3.3 Entidades a Extrair
| Entidade | Padrão no PDF | Campos-chave |
|----------|---------------|--------------|
| **Domínio** | Início do doc | assunto, owner, area, palavras_chave |
| **Tabelas RFN** | `RFN_MSH_SAP_SUP_*` | schema=BIRFNUSR, camada=RFN, descrição, owner |
| **Tabelas RAW** | `RAW_SAP_*` | schema=RAWZN, camada=RAW, descrição, owner |
| **Colunas** | Template fixo `Coluna | Tipo Dado | Descrição` + `° PK/Obrigatório/Confidencial/LGPD/Identificável` | nome, tipo, descricao, pk, obrigatorio, confidencialidade, classificacao_lgpd, identificavel |
| **Indicadores** | Seção "Indicadores" | nome, formula, meta, frequencia, homologadores |
| **Requisitos** | Seção "Requisitos" | assunto, descricao, regras_negocio, status, data |
| **ETL Packages** | `Engenharia de dados (ELT): pkg_*` | nome |
| **Table↔ETL** | Listados sob cada tabela | relação N:N |

#### 3.4 Validação Manual do JSON
- Gerar JSON → revisar 10-15 tabelas amostrais
- Ajustar parser até 100% das colunas corretas
- Só então avançar para Fase 2

---

### FASE 2: Schema Drizzle + Migração
**Duração estimada:** 1 dia

#### 3.1 `lib/db/src/schema/catalog.ts`
```typescript
import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, primaryKey } from "drizzle-orm/pg-core";

export const catalogLayerEnum = pgEnum("catalog_layer", ["RFN", "RAW"]);
export const catalogConfidentialityEnum = pgEnum("catalog_confidentiality", ["publica", "interna", "restrita", "confidencial"]);
export const catalogLgpdEnum = pgEnum("catalog_lgpd_classification", ["pessoal", "sensivel", "nao_pessoal", "anonimizado"]);

export const catalogDomains = pgTable("catalog_domains", {
  id: serial("id").primaryKey(),
  assunto: text("assunto").notNull(),
  owner: text("owner"),
  areaNegocio: text("area_negocio"),
  palavrasChave: text("palavras_chave").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const catalogTables = pgTable("catalog_tables", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => catalogDomains.id),
  schema: text("schema").notNull(), // BIRFNUSR, RAWZN
  nome: text("nome").notNull(), // RFN_MSH_SAP_SUP_CONTRATUALIZACAO
  descricao: text("descricao"),
  camada: catalogLayerEnum("camada").notNull(),
  dataOwner: text("data_owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const catalogColumns = pgTable("catalog_columns", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").references(() => catalogTables.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(), // Number(22), Varchar2(100), Date, etc.
  descricao: text("descricao"),
  pk: boolean("pk").default(false),
  obrigatorio: boolean("obrigatorio").default(false),
  confidencialidade: catalogConfidentialityEnum("confidencialidade"),
  classificacaoLgpd: catalogLgpdEnum("classificacao_lgpd"),
  identificavel: boolean("identificavel").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const catalogIndicators = pgTable("catalog_indicators", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => catalogDomains.id),
  nome: text("nome").notNull(),
  formula: text("formula"),
  meta: text("meta"),
  frequencia: text("frequencia"),
  homologadores: text("homologadores").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const catalogRequirements = pgTable("catalog_requirements", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => catalogDomains.id),
  assunto: text("assunto").notNull(),
  descricao: text("descricao"),
  regrasNegocio: text("regras_negocio"),
  status: text("status"), // ativo, revisao, descontinuado
  dataLevantamento: timestamp("data_levantamento", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const catalogEtlPackages = pgTable("catalog_etl_packages", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(), // pkg_rfn_msh_sap_sup_contratualizacao
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const catalogTableEtl = pgTable("catalog_table_etl", {
  tableId: integer("table_id").references(() => catalogTables.id, { onDelete: "cascade" }),
  etlPackageId: integer("etl_package_id").references(() => catalogEtlPackages.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.tableId, t.etlPackageId] }),
}));
```

#### 3.2 Adicionar FK em `fields` (schema existente)
```typescript
// lib/db/src/schema/fields.ts (adicionar)
export const fieldsTable = pgTable("fields", {
  // ... campos existentes
  catalogColumnId: integer("catalog_column_id").references(() => catalogColumns.id, { onDelete: "set null" }),
});
```

#### 3.3 Migração
```bash
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run push
```

---

### FASE 3: Script de Importação (Upsert)
**Duração estimada:** 1 dia  
**Padrão:** `scripts/src/import-catalog.ts` (similar a `seed.ts`)

```typescript
// scripts/src/import-catalog.ts
import { db } from "@workspace/db";
import { 
  catalogDomains, catalogTables, catalogColumns, 
  catalogIndicators, catalogRequirements, 
  catalogEtlPackages, catalogTableEtl 
} from "@workspace/db/schema/catalog";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";

const json = JSON.parse(fs.readFileSync("./data/catalog-intermediate.json", "utf-8"));

async function upsertDomain() {
  const [domain] = await db.insert(catalogDomains)
    .values({
      assunto: json.domain.assunto,
      owner: json.domain.owner,
      areaNegocio: json.domain.areaNegocio,
      palavrasChave: json.domain.palavrasChave,
    })
    .onConflictDoUpdate({ target: catalogDomains.assunto, set: { owner: json.domain.owner } })
    .returning();
  return domain.id;
}

async function upsertTables(domainId: number) {
  const tableMap = new Map<string, number>(); // nome -> id
  
  for (const t of json.tables) {
    const [table] = await db.insert(catalogTables)
      .values({
        domainId,
        schema: t.schema,
        nome: t.nome,
        descricao: t.descricao,
        camada: t.camada, // "RFN" | "RAW"
        dataOwner: t.dataOwner,
      })
      .onConflictDoUpdate({ 
        target: [catalogTables.schema, catalogTables.nome], 
        set: { descricao: t.descricao, camada: t.camada } 
      })
      .returning();
    tableMap.set(t.nome, table.id);
  }
  return tableMap;
}

async function upsertColumns(tableMap: Map<string, number>) {
  for (const c of json.columns) {
    const tableId = tableMap.get(c.tableNome);
    if (!tableId) continue;
    
    await db.insert(catalogColumns)
      .values({
        tableId,
        nome: c.nome,
        tipo: c.tipo,
        descricao: c.descricao,
        pk: c.pk,
        obrigatorio: c.obrigatorio,
        confidencialidade: c.confidencialidade,
        classificacaoLgpd: c.classificacaoLgpd,
        identificavel: c.identificavel,
      })
      .onConflictDoUpdate({ 
        target: [catalogColumns.tableId, catalogColumns.nome], 
        set: { tipo: c.tipo, descricao: c.descricao, pk: c.pk } 
      });
  }
}

// Similar para indicators, requirements, etl_packages, table_etl

await upsertDomain();
const tableMap = await upsertTables(domainId);
await upsertColumns(tableMap);
// ...
```

**Chaves Naturais para Upsert:**
| Tabela | Chave Natural |
|--------|---------------|
| `catalog_domains` | `assunto` |
| `catalog_tables` | `(schema, nome)` |
| `catalog_columns` | `(table_id, nome)` |
| `catalog_indicators` | `(domain_id, nome)` |
| `catalog_etl_packages` | `nome` |

> Reexecutável: quando sair nova versão do PDF, roda o script novamente → atualiza sem duplicar.

---

### FASE 4: Backend API
**Duração estimada:** 1-2 dias

#### 4.1 Rotas (`artifacts/api-server/src/routes/catalog.ts`)
```typescript
// GET /api/catalog/search?q=termo&limit=20&offset=0
// Busca full-text em: tables.nome, columns.nome, columns.descricao, indicators.nome, requirements.assunto

// GET /api/catalog/tables/:id
// Retorna tabela + colunas + indicadores relacionados + ETL packages

// GET /api/catalog/columns/:id
// Detalhe da coluna + dicionários vinculados (fields com catalog_column_id)

// POST /api/catalog/fields/:fieldId/link
// Body: { catalogColumnId: number }
// Vincula field existente a coluna do catálogo

// DELETE /api/catalog/fields/:fieldId/link
// Remove vinculação
```

#### 4.2 Busca (Postgres `tsvector` ou `ILIKE` simples)
```sql
-- Para MVP: ILIKE com índices trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_catalog_columns_nome_trgm ON catalog_columns USING gin (nome gin_trgm_ops);
CREATE INDEX idx_catalog_columns_desc_trgm ON catalog_columns USING gin (descricao gin_trgm_ops);
CREATE INDEX idx_catalog_tables_nome_trgm ON catalog_tables USING gin (nome gin_trgm_ops);
```

---

### FASE 5: Frontend
**Duração estimada:** 2-3 dias

#### 5.1 Nova Rota e Aba
```
apps/data-dict/
├── src/
│   ├── pages/
│   │   └── catalog.tsx           -- Nova página
│   ├── components/
│   │   ├── catalog/
│   │   │   ├── CatalogSearch.tsx      -- Busca central com autocomplete
│   │   │   ├── CatalogResults.tsx     -- Lista de resultados (tabelas/colunas/indicadores)
│   │   │   ├── CatalogTableDetail.tsx -- Detalhe da tabela com colunas
│   │   │   ├── CatalogColumnDetail.tsx -- Detalhe da coluna + dicionários vinculados
│   │   │   └── LinkToCatalog.tsx      -- Componente reutilizável para "Vincular ao catálogo"
```

#### 5.2 Fluxo de Uso
```
1. Usuário clica aba "Catálogo de Dados"
2. Digita termo: "contratualizacao", "SK_", "valor pedido", "ME2N"
3. Resultados agrupados:
   📋 Tabelas (RFN/RAW)
   📊 Colunas (com tipo, PK, LGPD)
   📈 Indicadores
   📋 Requisitos
4. Clica numa coluna → vê detalhes + "Dicionários que usam esta coluna"
5. Na validação de dicionário novo → botão "Vincular ao Catálogo" → busca → seleciona → preenche tipo/descrição/LGPD automaticamente
```

#### 5.3 Integração na Validação Existente
```typescript
// Em dictionary-detail.tsx, no ValidationPanel
<Button variant="outline" onClick={() => openLinkToCatalog(field.id)}>
  <Link className="h-3.5 w-3.5" /> Vincular ao Catálogo
</Button>

// Abre Modal/Sheet com busca do catálogo → ao selecionar:
await api.fields.linkCatalog(fieldId, { catalogColumnId: selected.id });
// Atualiza field local com dados do catálogo (tipo, descrição, etc.)
```

---

### FASE 6: Pós-MVP (Evolução)

| Melhoria | Esforço | Valor |
|----------|---------|-------|
| **Busca semântica (embeddings)** | Médio | Busca por significado, não só texto exato |
| **LLM-assisted mapping** | Médio | Comprador descreve "campo de valor do pedido" → LLM sugere `VL_LIQUIDO_MOEDA_PEDIDO` |
| **Versionamento do catálogo** | Baixo | `catalog_versions` + `catalog_changes` para auditoria |
| **Quality scores no catálogo** | Baixo | Completude de metadados por tabela/coluna |
| **DDL generation using catalog types** | Médio | Ao exportar DDL, usar tipos do catálogo como referência |
| **Export para DataHub/Purview/OpenMetadata** | Baixo | API REST já expõe dados estruturados |
| **Lineage enriquecido (humano + heurística)** | Alto | Grafo visual SAP → RAW → RFN com revisão |
| **Notificações de mudança** | Baixo | Webhook/email quando catálogo atualizado |

---

## 4. Estrutura de Arquivos a Criar/Modificar

```
C:\Users\contr\OneDrive\Documentos\Data-Dictionary-Validator\
├── lib/
│   └── db/
│       └── src/
│           ├── schema/
│           │   └── catalog.ts              # NOVO: schemas catalog_*
│           └── index.ts                    # Exportar catalog schemas
├── scripts/
│   └── src/
│       ├── pdf-extractor.ts                # NOVO: extrai texto do PDF
│       ├── pdf-parser.ts                   # NOVO: parser state machine
│       └── import-catalog.ts               # NOVO: upsert no banco
├── artifacts/
│   └── api-server/
│       └── src/
│           ├── routes/
│           │   └── catalog.ts              # NOVO: endpoints /api/catalog/*
│           └── routes/index.ts             # Importar catalogRouter
├── artifacts/
│   └── data-dict/
│       └── src/
│           ├── pages/
│           │   └── catalog.tsx             # NOVO: página Catálogo de Dados
│           ├── components/
│           │   └── catalog/
│           │       ├── CatalogSearch.tsx
│           │       ├── CatalogResults.tsx
│           │       ├── CatalogTableDetail.tsx
│           │       ├── CatalogColumnDetail.tsx
│           │       └── LinkToCatalog.tsx
│           ├── hooks/
│           │   └── use-catalog.ts          # NOVO: hooks de busca/vinculação
│           └── App.tsx                     # Adicionar rota /catalog
├── docs/
│   └── IMPLEMENTACAO-CATALOGO-DADOS.md     # ESTE DOCUMENTO
```

---

## 5. Estimativa de Esforço Total

| Fase | Atividade | Dias |
|------|-----------|------|
| 1 | PDF Extractor + Parser (teste + validação manual) | 2-3 |
| 2 | Schema Drizzle + Migração + FK em fields | 1 |
| 3 | Script Importação (upsert) + teste | 1 |
| 4 | Backend API (search, detail, link) | 1-2 |
| 5 | Frontend (página, componentes, integração validação) | 2-3 |
| **Total MVP** | | **7-10 dias** |
| Pós-MVP | Embeddings, LLM mapping, lineage, versionamento | Conforme prioridade |

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Parser falha em edge cases do PDF | Média | Alto | Validar 100% das 674 colunas manualmente antes de importar |
| Nomes de colunas quebrados em 3+ linhas | Baixa | Médio | State machine robusta + teste com todas as tabelas |
| Busca lenta no Postgres | Baixa | Médio | Índices `pg_trgm` + limitar resultados (20) |
| Compradores não adotam vinculação | Média | Alto | UX simples: 1 clique para vincular, preenche auto |
| PDF futuro com layout diferente | Média | Baixo | Parser modular; script reexecutável |

---

## 7. Decisões Confirmadas

| Item | Decisão |
|------|---------|
| Parser | TypeScript (Node.js) |
| Busca | `pg_trgm` + ILIKE fuzzy |
| Autenticação | Sem auth (interno) - rota pública |
| UI Vinculação | Sheet lateral |
| Dados Sensíveis | Exibir LGPD/Confidencialidade |

---

## 8. Próximos Passos Imediatos

1. **FASE 1:** Criar parser TypeScript (`pdf-extractor.ts` + `pdf-parser.ts`)
2. **Validação:** Rodar parser, validar JSON intermediário (100% das 674 colunas)
3. **FASE 2-5:** Implementar sequencialmente

---

## 9. Checklist de Validação do MVP

- [ ] Parser extrai 18 tabelas × ~37 colunas = 674 colunas (100% match)
- [ ] JSON intermediário validado manualmente (amostra 5 tabelas)
- [ ] Migrações rodam sem erro no Supabase
- [ ] Script `import-catalog` faz upsert idempotente (rodar 2x = mesmo resultado)
- [ ] `GET /api/catalog/search?q=contratualizacao` retorna tabela + colunas
- [ ] Aba "Catálogo de Dados" carrega e busca funciona
- [ ] Clicar coluna mostra detalhes + dicionários vinculados
- [ ] Na validação, "Vincular ao Catálogo" preenche tipo/descrição/LGPD
- [ ] Typecheck + Build passam
- [ ] Deploy Render + Vercel funcionam

---

**Documento versão 1.0 — 31/07/2026**  
Aprovado para implementação.