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

O endpoint `POST /api/dictionaries/from-excel` recebe o arquivo Excel e **imediatamente cria o dicionário no banco de dados**, sem passar por uma etapa de revisão do JSON intermediário.

```
Hoje:    Excel ──► Motor ──► INSERT no banco (pula a revisão do JSON)
Correto: Excel ──► Motor ──► JSON para download ──► Revisão ──► Importação manual
```

**Implementação atual do motor** (`artifacts/api-server/src/modules/excel-ingestion-engine/index.ts`):

| Função | Implementação |
|---|---|
| Seleção de aba | Pontuação por número de linhas + colunas válidas + posição (aba preferencial tem prioridade) |
| Filtro de ruído | Remove colunas cujo cabeçalho contenha: `%`, `∆`, `delta`, `variação`, `projeção`, `meta`, `budget`, `var`, `perc`, `pct` |
| snake_case | Remove acentos, converte espaços em `_`, minúsculas |
| Inferência de tipo | Amostra os primeiros 20 valores da coluna: data → `date`; número decimal → `decimal`; inteiro → `int`; texto → `string` |
| Campos gerados | `campo_origem`, `campo_tecnico`, `descricao` (vazio), `origem` (da aba), `periodicidade` (`eventual`), `tipo_dado`, `chave` (`false`) |

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

O endpoint deveria retornar apenas o JSON no formato padrão (sem persistir no banco), permitindo que o especialista de dados:
1. Faça download do JSON gerado
2. Revise e complete campos que o motor não conseguiu inferir (ex.: `descricao`, `periodicidade` real, `origem` correta)
3. Importe o JSON revisado na **Etapa 2**

**Endpoint que deve existir (ainda não implementado):**

```
POST /api/excel/preview
Content-Type: multipart/form-data

Campos: file, processo, categoria, tabela?, aba_preferencial?

Resposta:
{
  "meta": { ... },
  "json_gerado": {
    "processo": "rfq",
    "categoria": "medicamentos",
    "tabela": "rfq_medicamentos",
    "campos": [
      {
        "campo_origem": "Código do Item",
        "campo_tecnico": "codigo_do_item",
        "descricao": "",          ← especialista deve preencher
        "origem": "SAP",          ← inferido da aba (pode ser errado)
        "periodicidade": "eventual",  ← padrão, deve ser revisado
        "tipo_dado": "int",
        "chave": false
      }
    ]
  }
}
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

| Critério | Chave | Peso |
|---|---|---|
| Campo utilizado no processo | `used` | 20 pts |
| Campo obrigatório | `required` | 20 pts |
| Nome técnico correto | `correctName` | 20 pts |
| Origem do dado correta | `correctOrigin` | 20 pts |
| Possui regra de negócio definida | `hasBusinessRule` | 20 pts |

**Score e Classificação:**

| Score | Status |
|---|---|
| ≥ 90 | Confiável |
| 60 – 89 | Atenção |
| < 60 | Crítico |
| Sem validações | Pendente |
| Aprovados + Reprovados | Conflito |

**Detecção de conflito** (`artifacts/api-server/src/lib/summary.ts`):
Se o mesmo campo tiver validações com score ≥ 60 (aprovado) e score < 60 (reprovado) de validadores diferentes → status = `conflict`.

### Lacuna Atual

Nenhuma lacuna crítica nesta etapa. Funcional conforme o esperado.

---

## ETAPA 3 — Exportação

### Propósito

Após a validação, o dicionário deve poder ser exportado em formatos consumíveis por diferentes perfis:

| Formato | Consumidor | Uso |
|---|---|---|
| JSON validado | Especialista de dados | Arquivo de controle / reimportação |
| CSV | Gestor / Auditoria | Planilhas e relatórios |
| DDL | DBA / Engenheiro de dados | Criação física das tabelas no banco |
| Data Contract | Time de engenharia de dados | Contrato entre produtor e consumidor de dados |

### Como Funciona Hoje

| Endpoint | Status |
|---|---|
| `GET /api/dictionaries/:id/export` | ✅ Implementado (JSON e CSV via `?format=csv`) |
| `GET /api/dictionaries/:id/export/ddl` | ✅ Implementado |
| `GET /api/dictionaries/:id/export/data-contract` | ✅ Implementado |

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

- **Mapeamento de tipos no DDL** é básico: `string → VARCHAR(255)`, `int → INTEGER`, `decimal → DECIMAL(18,4)`, `date → DATE`. Tipos como `boolean`, `timestamp`, `text` (para campos longos) ainda não estão mapeados.
- O DDL não reflete o status de validação dos campos (campos com score crítico poderiam ser sinalizados com comentários no SQL).

---

## Resumo das Lacunas e Próximos Passos

| # | Lacuna | Impacto | Esforço |
|---|---|---|---|
| L1 | Excel vai direto para o banco — falta etapa de preview/revisão do JSON | **Alto** — usuário não pode corrigir inferências antes de criar o dicionário | Médio |
| L2 | `descricao`, `periodicidade` e `origem` inferidos pelo motor estão sempre incompletos/genéricos | **Alto** — campos entram no sistema sem metadados de negócio | Depende de L1 |
| L3 | DDL não sinaliza campos com status Crítico ou Pendente | Baixo | Pequeno |
| L4 | Data Contract não inclui regras de negócio das validações | Baixo | Pequeno |

### Fluxo Recomendado para Implementar L1

```
1. Criar endpoint POST /api/excel/preview
   → Mesma lógica do motor atual, mas SEM inserção no banco
   → Retorna { meta, json_gerado }

2. Frontend: na aba Excel de /dictionaries/new
   → Após upload, exibir o JSON gerado em um editor (textarea com highlight)
   → Botão "Revisar JSON" abre o editor para edição livre
   → Botão "Importar Dicionário" usa o JSON (editado ou não) para chamar POST /api/dictionaries

3. O fluxo se torna:
   Upload Excel → Preview JSON → [edição opcional] → Importar → Validar → Exportar
```

---

## Endpoints da API — Estado Atual

| Método | Endpoint | Descrição | Status |
|---|---|---|---|
| `POST` | `/api/dictionaries` | Importa dicionário via JSON | ✅ |
| `GET` | `/api/dictionaries` | Lista todos os dicionários | ✅ |
| `GET` | `/api/dictionaries/:id` | Detalhe com campos e scores | ✅ |
| `PATCH` | `/api/dictionaries/:id` | Atualiza metadados do dicionário | ✅ |
| `DELETE` | `/api/dictionaries/:id` | Remove dicionário | ✅ |
| `GET` | `/api/dictionaries/:id/export` | Exporta JSON ou CSV | ✅ |
| `GET` | `/api/dictionaries/:id/export/ddl` | Exporta DDL SQL | ✅ |
| `GET` | `/api/dictionaries/:id/export/data-contract` | Exporta Data Contract JSON | ✅ |
| `POST` | `/api/dictionaries/from-excel` | Ingestão direta de Excel (sem revisão) | ✅ (L1) |
| `POST` | `/api/excel/preview` | Preview do JSON a partir do Excel | ❌ Não implementado |
| `POST` | `/api/fields/:id/validate` | Submete validação de um campo | ✅ |
| `GET` | `/api/fields/critical` | Lista campos com score < 60 | ✅ |
| `GET` | `/api/dashboard` | Métricas globais de governança | ✅ |

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
  status      TEXT       ← pending | approved | rejected | conflict
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
```

---

*Gerado em: 02/07/2026 — Versão 1.0 do produto*
