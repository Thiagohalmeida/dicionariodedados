# Validador de Dicionário de Dados

Micro SaaS para **validação colaborativa de dicionários de dados** com score de qualidade, detecção de conflitos e dashboard de governança — voltado para processos de compras em saúde.

---

## Visão Geral

Em aquisições de sistemas de informação hospitalar, fornecedores entregam **dicionários de dados** que descrevem os campos, tipos e origens dos dados de seus sistemas. Esses documentos são críticos para garantir interoperabilidade, conformidade regulatória e qualidade da informação em saúde.

O **Validador DD** permite que equipes multidisciplinares — gestores de TI, especialistas em dados e equipes de compras — revisem colaborativamente esses dicionários, aplicando 5 critérios objetivos de qualidade e gerando evidências de governança.

---

## Funcionalidades

Funcionalidades
*Importação via JSON* — Importa dicionários de dados no formato JSON padronizado (processo, categoria, tabela, campos)
*Importação via Excel* — Upload de planilha .xlsx/.xls/.xlsm com detecção automática da aba mais relevante, filtro de colunas de ruído (%, variação, projeções) e inferência automática de tipo de dado
*Validação colaborativa* — Revisão campo a campo com 5 critérios de qualidade binários (sim/não)
*Score automático* — Cada critério atendido vale 20 pontos (máx. 100); classificação em Confiável / Atenção / Crítico
*Detecção de conflitos* — Identifica campos com validações aprovadas e reprovadas simultâneas
*Dashboard de governança* — Métricas globais: total de dicionários, campos, taxa de aprovação, pontuação média
*Campos Críticos* — Visão cruzada de todos os campos com score abaixo de 60 pontos
*Exportação* — Download do dicionário validado em JSON, CSV, DDL (CREATE TABLE) ou Data Contract (JSON estruturado)


---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 24, TypeScript 5.9 |
| Gerenciamento de pacotes | pnpm workspaces (monorepo) |
| Backend | Express 5 |
| Banco de dados | PostgreSQL + Drizzle ORM |
| Validação | Zod (v4), drizzle-zod |
| Contrato de API | OpenAPI 3 + Orval (codegen) |
| Build do servidor | esbuild (bundle CJS) |
| Frontend | React + Vite + Tailwind CSS + shadcn/ui |
| Roteamento (client) | wouter |
| Estado assíncrono | TanStack Query |
| Ingestão de Excel | ExcelJS + Multer (upload em memória) |

---

## Estrutura do Projeto

```
.
├── artifacts/
│   ├── api-server/          # Servidor Express (API REST)
│   │   └── src/
│   │       ├── routes/      # Handlers: dictionaries, fields, dashboard
│   │       └── lib/         # summary.ts (score e classificação)
│   └── data-dict/           # Frontend React + Vite
│       └── src/
│           ├── pages/       # Dashboard, Dicionários, Campos Críticos, Sobre
│           └── components/  # Layout, OnboardingModal, UI (shadcn)
├── lib/
│   ├── api-spec/            # openapi.yaml — contrato da API (fonte de verdade)
│   ├── api-zod/             # Schemas Zod gerados pelo Orval
│   └── db/                  # Schema Drizzle: dictionaries, fields, validations
└── scripts/                 # Scripts utilitários (seed, etc.)
```

---

## Critérios de Validação

Cada campo é avaliado com 5 critérios binários (sim/não), cada um valendo 20 pontos:

1. **Campo utilizado no processo** — O campo é de fato usado no fluxo de compras/gestão?
2. **Campo obrigatório** — O preenchimento é mandatório?
3. **Nome técnico correto** — O nome reflete adequadamente o conteúdo do campo?
4. **Origem do dado correta** — O dado vem do sistema correto?
5. **Possui regra de negócio definida** — Existe uma regra clara que rege este campo?

### Classificação

| Score | Classificação |
|---|---|
| ≥ 90 | ✅ Confiável |
| 60 – 89 | ⚠️ Atenção |
| < 60 | 🔴 Crítico |
| Sem validações | ⏳ Pendente |

---

## Pré-requisitos

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL

---

## Configuração

1. **Clone o repositório**

```bash
git clone https://github.com/<seu-usuario>/validador-dd.git
cd validador-dd
```

2. **Instale as dependências**

No Windows, execute:

```powershell
.\setup.ps1
```

Se não usar PowerShell, ou em outro sistema, execute:

```bash
corepack enable
pnpm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz (ou exporte as variáveis):

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/validador_dd
SESSION_SECRET=sua-chave-secreta
```

4. **Execute as migrações do banco**

```bash
pnpm --filter @workspace/db run push
```

5. **Inicie o projeto em desenvolvimento**

```bash
# Terminal 1 — API
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
pnpm --filter @workspace/data-dict run dev
```

---

## Scripts Úteis

```bash
# Typecheck completo
pnpm run typecheck

# Build completo
pnpm run build

# Regenerar hooks e schemas a partir do OpenAPI
pnpm --filter @workspace/api-spec run codegen

# Push do schema para o banco (dev)
pnpm --filter @workspace/db run push
```

---

## Formato de Importação (JSON)

```json
{
  "processo": "Compras Hospitalares",
  "categoria": "RFQ",
  "tabela": "rfp_item",
  "campos": [
    {
      "campo_origem": "ID_ITEM",
      "campo_tecnico": "id_item",
      "tipo_dado": "INTEGER",
      "periodicidade": "Transacional",
      "origem": "Sistema ERP",
      "chave": true,
      "descricao": "Identificador único do item de compra"
    }
  ]
}
```

---

## Licença

MIT
