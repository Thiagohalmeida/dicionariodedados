import { Router, type IRouter } from "express";
import { eq, or, ilike, and, inArray } from "drizzle-orm";
import {
  db,
  catalogDomains,
  catalogTables,
  catalogColumns,
  catalogIndicators,
  catalogRequirements,
  catalogEtlPackages,
  catalogTableEtl,
  fieldsTable,
} from "@workspace/db";

// Inline types for catalog API
interface CatalogSearchResult {
  tables: CatalogTable[];
  columns: CatalogColumn[];
  indicators: CatalogIndicator[];
  requirements: CatalogRequirement[];
}

interface CatalogTable {
  id: number;
  domainId: number;
  schema: string;
  nome: string;
  descricao: string | null;
  camada: "RFN" | "RAW";
  dataOwner: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CatalogColumn {
  id: number;
  tableId: number;
  nome: string;
  tipo: string;
  descricao: string | null;
  pk: boolean;
  obrigatorio: boolean;
  confidencialidade: string | null;
  classificacaoLgpd: string | null;
  identificavel: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CatalogIndicator {
  id: number;
  domainId: number;
  nome: string;
  formula: string | null;
  meta: string | null;
  frequencia: string | null;
  homologadores: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface CatalogRequirement {
  id: number;
  domainId: number;
  assunto: string;
  descricao: string | null;
  regrasNegocio: string | null;
  status: string | null;
  dataLevantamento: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CatalogEtlPackage {
  id: number;
  nome: string;
  createdAt: string;
  updatedAt: string;
}

const router: IRouter = Router();

// GET /api/catalog/search?q=termo&limit=20&offset=0
router.get("/catalog/search", async (req, res) => {
  const q = req.query.q as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string || "20", 10), 100);
  const offset = parseInt(req.query.offset as string || "0", 10);

  if (!q || q.length < 2) {
    res.json({
      tables: [],
      columns: [],
      indicators: [],
      requirements: [],
    });
    return;
  }

  const searchTerm = `%${q.toLowerCase()}%`;

  try {
    // Search tables
    const tables = await db
      .select()
      .from(catalogTables)
      .where(
        or(
          ilike(catalogTables.nome, searchTerm),
          ilike(catalogTables.schema, searchTerm),
          ilike(catalogTables.descricao, searchTerm),
        )
      )
      .limit(limit)
      .offset(offset);

    // Search columns
    const columns = await db
      .select({
        id: catalogColumns.id,
        tableId: catalogColumns.tableId,
        nome: catalogColumns.nome,
        tipo: catalogColumns.tipo,
        descricao: catalogColumns.descricao,
        pk: catalogColumns.pk,
        obrigatorio: catalogColumns.obrigatorio,
        confidencialidade: catalogColumns.confidencialidade,
        classificacaoLgpd: catalogColumns.classificacaoLgpd,
        identificavel: catalogColumns.identificavel,
        createdAt: catalogColumns.createdAt,
        updatedAt: catalogColumns.updatedAt,
        tableNome: catalogTables.nome,
        tableSchema: catalogTables.schema,
        tableCamada: catalogTables.camada,
      })
      .from(catalogColumns)
      .innerJoin(catalogTables, eq(catalogColumns.tableId, catalogTables.id))
      .where(
        or(
          ilike(catalogColumns.nome, searchTerm),
          ilike(catalogColumns.descricao, searchTerm),
          ilike(catalogTables.nome, searchTerm),
        )
      )
      .limit(limit)
      .offset(offset);

    // Search indicators
    const indicators = await db
      .select()
      .from(catalogIndicators)
      .where(
        or(
          ilike(catalogIndicators.nome, searchTerm),
          ilike(catalogIndicators.formula, searchTerm),
        )
      )
      .limit(limit)
      .offset(offset);

    // Search requirements
    const requirements = await db
      .select()
      .from(catalogRequirements)
      .where(
        or(
          ilike(catalogRequirements.assunto, searchTerm),
          ilike(catalogRequirements.descricao, searchTerm),
          ilike(catalogRequirements.regrasNegocio, searchTerm),
        )
      )
      .limit(limit)
      .offset(offset);

    res.json({
      tables,
      columns,
      indicators,
      requirements,
    });
  } catch (error) {
    req.log.error({ err: error }, "Catalog search failed");
    res.status(500).json({ error: "Erro ao buscar no catálogo" });
  }
});

// GET /api/catalog/tables/:id
router.get("/catalog/tables/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  try {
    const [table] = await db
      .select()
      .from(catalogTables)
      .where(eq(catalogTables.id, id));

    if (!table) {
      res.status(404).json({ error: "Tabela não encontrada" });
      return;
    }

    const columns = await db
      .select()
      .from(catalogColumns)
      .where(eq(catalogColumns.tableId, id));

    const indicators = await db
      .select()
      .from(catalogIndicators)
      .where(eq(catalogIndicators.domainId, table.domainId));

    const etlRelations = await db
      .select({
        etlPackageId: catalogTableEtl.etlPackageId,
      })
      .from(catalogTableEtl)
      .where(eq(catalogTableEtl.tableId, id));

    const etlPackageIds = etlRelations.map((r) => r.etlPackageId);
    const etlPackages = etlPackageIds.length > 0
      ? await db
          .select()
          .from(catalogEtlPackages)
          .where(inArray(catalogEtlPackages.id, etlPackageIds))
      : [];

    res.json({
      table,
      columns,
      indicators,
      etlPackages,
    });
  } catch (error) {
    req.log.error({ err: error }, "Get catalog table failed");
    res.status(500).json({ error: "Erro ao buscar tabela do catálogo" });
  }
});

// GET /api/catalog/columns/:id
router.get("/catalog/columns/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  try {
    const [column] = await db
      .select({
        id: catalogColumns.id,
        tableId: catalogColumns.tableId,
        nome: catalogColumns.nome,
        tipo: catalogColumns.tipo,
        descricao: catalogColumns.descricao,
        pk: catalogColumns.pk,
        obrigatorio: catalogColumns.obrigatorio,
        confidencialidade: catalogColumns.confidencialidade,
        classificacaoLgpd: catalogColumns.classificacaoLgpd,
        identificavel: catalogColumns.identificavel,
        createdAt: catalogColumns.createdAt,
        updatedAt: catalogColumns.updatedAt,
        tableNome: catalogTables.nome,
        tableSchema: catalogTables.schema,
        tableCamada: catalogTables.camada,
      })
      .from(catalogColumns)
      .innerJoin(catalogTables, eq(catalogColumns.tableId, catalogTables.id))
      .where(eq(catalogColumns.id, id));

    if (!column) {
      res.status(404).json({ error: "Coluna não encontrada" });
      return;
    }

    // Get linked fields (dictionaries using this catalog column)
    const linkedFields = await db
      .select({
        id: fieldsTable.id,
        campoTecnico: fieldsTable.campoTecnico,
        dictionaryId: fieldsTable.dictionaryId,
      })
      .from(fieldsTable)
      .where(eq(fieldsTable.catalogColumnId, id));

    res.json({
      column,
      table: {
        schema: column.tableSchema,
        nome: column.tableNome,
        camada: column.tableCamada,
      },
      linkedFields,
    });
  } catch (error) {
    req.log.error({ err: error }, "Get catalog column failed");
    res.status(500).json({ error: "Erro ao buscar coluna do catálogo" });
  }
});

// POST /api/catalog/fields/:fieldId/link
router.post("/catalog/fields/:fieldId/link", async (req, res) => {
  const fieldId = parseInt(req.params.fieldId, 10);
  const { catalogColumnId } = req.body;

  if (isNaN(fieldId) || !catalogColumnId || isNaN(catalogColumnId)) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }

  try {
    const [field] = await db
      .select()
      .from(fieldsTable)
      .where(eq(fieldsTable.id, fieldId));

    if (!field) {
      res.status(404).json({ error: "Campo não encontrado" });
      return;
    }

    const [catalogColumn] = await db
      .select()
      .from(catalogColumns)
      .where(eq(catalogColumns.id, catalogColumnId));

    if (!catalogColumn) {
      res.status(404).json({ error: "Coluna do catálogo não encontrada" });
      return;
    }

    await db
      .update(fieldsTable)
      .set({ catalogColumnId })
      .where(eq(fieldsTable.id, fieldId));

    res.json({ success: true, message: "Campo vinculado ao catálogo com sucesso" });
  } catch (error) {
    req.log.error({ err: error }, "Link field to catalog failed");
    res.status(500).json({ error: "Erro ao vincular campo ao catálogo" });
  }
});

// DELETE /api/catalog/fields/:fieldId/link
router.delete("/catalog/fields/:fieldId/link", async (req, res) => {
  const fieldId = parseInt(req.params.fieldId, 10);

  if (isNaN(fieldId)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  try {
    const [field] = await db
      .select()
      .from(fieldsTable)
      .where(eq(fieldsTable.id, fieldId));

    if (!field) {
      res.status(404).json({ error: "Campo não encontrado" });
      return;
    }

    await db
      .update(fieldsTable)
      .set({ catalogColumnId: null })
      .where(eq(fieldsTable.id, fieldId));

    res.json({ success: true, message: "Vinculação removida com sucesso" });
  } catch (error) {
    req.log.error({ err: error }, "Unlink field from catalog failed");
    res.status(500).json({ error: "Erro ao desvincular campo do catálogo" });
  }
});

export default router;