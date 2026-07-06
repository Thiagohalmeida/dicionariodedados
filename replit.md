# Validador de Dicionário de Dados

Micro SaaS para validação colaborativa de dicionários de dados com score de qualidade, detecção de conflitos e dashboard de governança.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/data-dict run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind + shadcn/ui + wouter + TanStack Query

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema: `dictionaries.ts`, `fields.ts`, `validations.ts`
- `artifacts/api-server/src/routes/` — Route handlers: `dictionaries.ts`, `fields.ts`, `dashboard.ts`, `excel.ts`
- `artifacts/api-server/src/modules/excel-ingestion-engine/` — Sheet auto-detection, noise-column filtering, snake_case conversion, type inference
- `artifacts/api-server/src/lib/summary.ts` — Score and classification computation logic
- `artifacts/data-dict/src/pages/new-dictionary.tsx` — Excel/JSON import tabs
- `artifacts/data-dict/src/` — Frontend React app

## Architecture decisions

- Validation is enriched (5 boolean criteria: used, required, correctName, correctOrigin, hasBusinessRule), each worth 20 points (total 100)
- Score classification: ≥90 = Confiável, 60-89 = Atenção, <60 = Crítico, no validations = Pendente
- Conflict detection: if both approved (score ≥60) and rejected (score <60) validations exist for the same field, status = "conflict"
- Score is computed dynamically from the validations table — no separate summary table needed for this scale
- Export supports JSON and CSV via `?format=csv` query param on `GET /api/dictionaries/:id/export`, plus DDL and Data Contract via dedicated endpoints (`/export/ddl`, `/export/data-contract`)
- Dictionary versioning schema is prepared (`version`, `parentId` columns) but version UI is deferred to next iteration
- No authentication in v1 — validator name is submitted with each validation form
- Excel ingestion (`POST /api/dictionaries/from-excel`, multipart/form-data) is NOT part of the OpenAPI spec — multer + memoryStorage handle the upload directly, and the frontend calls it via a direct `fetch` (not a generated hook)

## Product

- **Import (JSON)**: Paste/upload JSON following the standard schema (processo, categoria, tabela, campos[])
- **Import (Excel)**: Upload `.xlsx/.xls/.xlsm`; auto-detects the best sheet, filters noise columns (%, variação, projeção, meta, budget), converts headers to snake_case, and infers field types (date/decimal/int/string)
- **Validate**: Review each field with 5 boolean quality criteria; score is calculated automatically
- **Dashboard**: Global quality metrics — total dictionaries, fields, approval rate, avg score, fields by classification
- **Critical fields**: Cross-dictionary view of all fields scoring below 60
- **Export**: Download validated dictionary as JSON, CSV, DDL (`CREATE TABLE`), or Data Contract (structured JSON)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT add `format` as query param in the OpenAPI spec for operations that also have path params — causes TS2308 collision in `lib/api-zod`. Use `req.query` directly in the route handler instead.
- `pnpm --filter @workspace/api-spec run codegen` must be re-run after every spec change before building the frontend or backend.
- ExcelJS's bundled types expect a non-generic `Buffer` for `workbook.xlsx.load()`, which is incompatible with Node 24's generic `Buffer<ArrayBufferLike>` — the ingestion engine casts through `any` at that call site as a documented workaround.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
