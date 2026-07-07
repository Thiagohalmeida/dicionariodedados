import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, dictionariesTable, fieldsTable } from "@workspace/db";
import { parseExcelToDataDictionary, type UserContext } from "../modules/excel-ingestion-engine/index";
import { DICTIONARY_STATUS } from "../lib/constants";
import { getFieldsWithSummaries } from "../lib/summary";
import { ImportDictionaryBody } from "@workspace/api-zod";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Preview endpoint: parse Excel and return the generated JSON without persisting
router.post(
  "/excel/preview",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        req.log.error({ err }, "Multer upload error");
        res.status(400).json({ error: "Erro ao processar upload: " + (err instanceof Error ? err.message : String(err)) });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    if (!req.file) {
      req.log.error({}, "No file uploaded");
      res.status(400).json({ error: "Arquivo Excel obrigatório." });
      return;
    }

    const originalName = req.file.originalname?.toLowerCase() ?? "";
    const validExtensions = [".xlsx", ".xlsm"];
    if (!validExtensions.some((ext) => originalName.endsWith(ext))) {
      req.log.error({ originalname: req.file.originalname }, "Unsupported file extension");
      res.status(400).json({
        error: "Formato não suportado. Use .xlsx ou .xlsm (Excel 2007+). Arquivos .xls antigos não são suportados.",
      });
      return;
    }

    const { processo, categoria, tabela, aba_preferencial } = req.body as Record<string, string>;

    if (!processo?.trim() || !categoria?.trim()) {
      req.log.error({ processo, categoria }, "Missing required fields");
      res.status(400).json({ error: "Os campos 'processo' e 'categoria' são obrigatórios." });
      return;
    }

    const ctx: UserContext = {
      processo: processo.trim(),
      categoria: categoria.trim(),
      tabela: tabela?.trim() || null,
      aba_preferencial: aba_preferencial?.trim() || null,
    };

    let parsed;
    try {
      parsed = await parseExcelToDataDictionary(req.file.buffer, req.file.originalname, ctx);
    } catch (err) {
      req.log.error({ err, originalname: req.file.originalname }, "Excel parse failed");
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivo Excel";
      res.status(400).json({ error: `Falha ao ler o arquivo Excel: ${msg}` });
      return;
    }

    const jsonGerado = {
      processo: parsed.processo,
      categoria: parsed.categoria,
      tabela: parsed.tabela,
      campos: parsed.campos,
    };

    req.log.info(
      {
        arquivo: parsed.meta.arquivo,
        aba_utilizada: parsed.meta.aba_utilizada,
        abas_ignoradas: parsed.meta.abas_ignoradas,
        colunas_removidas: parsed.meta.colunas_removidas,
        total_campos: parsed.campos.length,
      },
      "Excel preview generated"
    );

    res.status(200).json({
      meta: parsed.meta,
      json_gerado: jsonGerado,
    });
  }
);

// Ingest endpoint kept for compatibility: it now previews by default and only persists when persist=true is sent.
router.post(
  "/dictionaries/from-excel",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        req.log.error({ err }, "Multer upload error");
        res.status(400).json({ error: "Erro ao processar upload: " + (err instanceof Error ? err.message : String(err)) });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    if (!req.file) {
      req.log.error({}, "No file uploaded");
      res.status(400).json({ error: "Arquivo Excel obrigatório." });
      return;
    }

    const originalName = req.file.originalname?.toLowerCase() ?? "";
    const validExtensions = [".xlsx", ".xlsm"];
    if (!validExtensions.some((ext) => originalName.endsWith(ext))) {
      req.log.error({ originalname: req.file.originalname }, "Unsupported file extension");
      res.status(400).json({
        error: "Formato não suportado. Use .xlsx ou .xlsm (Excel 2007+). Arquivos .xls antigos não são suportados.",
      });
      return;
    }

    const { processo, categoria, tabela, aba_preferencial } = req.body as Record<string, string>;

    if (!processo?.trim() || !categoria?.trim()) {
      req.log.error({ processo, categoria }, "Missing required fields");
      res.status(400).json({ error: "Os campos 'processo' e 'categoria' são obrigatórios." });
      return;
    }

    const ctx: UserContext = {
      processo: processo.trim(),
      categoria: categoria.trim(),
      tabela: tabela?.trim() || null,
      aba_preferencial: aba_preferencial?.trim() || null,
    };

    let parsed;
    try {
      parsed = await parseExcelToDataDictionary(req.file.buffer, req.file.originalname, ctx);
    } catch (err) {
      req.log.error({ err, originalname: req.file.originalname }, "Excel parse failed");
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivo Excel";
      res.status(400).json({ error: `Falha ao ler o arquivo Excel: ${msg}` });
      return;
    }

    const jsonGerado = {
      processo: parsed.processo,
      categoria: parsed.categoria,
      tabela: parsed.tabela,
      campos: parsed.campos,
    };

    const persist = String(req.body.persist ?? "").toLowerCase() === "true";

    if (!persist) {
      req.log.info(
        {
          arquivo: parsed.meta.arquivo,
          aba_utilizada: parsed.meta.aba_utilizada,
          abas_ignoradas: parsed.meta.abas_ignoradas,
          colunas_removidas: parsed.meta.colunas_removidas,
          total_campos: parsed.campos.length,
        },
        "Excel preview generated without persistence"
      );

      res.status(200).json({
        meta: parsed.meta,
        json_gerado: jsonGerado,
        message: "Preview only: send persist=true to insert the dictionary into the database.",
      });
      return;
    }

    req.log.info(
      {
        arquivo: parsed.meta.arquivo,
        aba_utilizada: parsed.meta.aba_utilizada,
        abas_ignoradas: parsed.meta.abas_ignoradas,
        colunas_removidas: parsed.meta.colunas_removidas,
        total_campos: parsed.campos.length,
      },
      "Excel ingested"
    );

    const [dict] = await db
      .insert(dictionariesTable)
      .values({ processo: parsed.processo, categoria: parsed.categoria, tabela: parsed.tabela, version: 1, status: DICTIONARY_STATUS.PENDING })
      .returning();

    await db.insert(fieldsTable).values(
      parsed.campos.map((c) => ({
        dictionaryId: dict.id,
        campoOrigem: c.campo_origem,
        descricao: c.descricao,
        origem: c.origem,
        periodicidade: c.periodicidade,
        campoTecnico: c.campo_tecnico,
        tipoDado: c.tipo_dado,
        chave: c.chave,
      }))
    );

    res.status(201).json({
      id: dict.id,
      processo: dict.processo,
      categoria: dict.categoria,
      tabela: dict.tabela,
      version: dict.version,
      status: dict.status,
      createdAt: dict.createdAt.toISOString(),
      meta: parsed.meta,
    });
  }
);

router.get("/dictionaries/:id/export/ddl", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID for DDL export");
    res.status(400).json({ error: "ID inválido" }); return;
  }

  const [dict] = await db.select().from(dictionariesTable).where(eq(dictionariesTable.id, id));
  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found for DDL export");
    res.status(404).json({ error: "Dicionário não encontrado" }); return;
  }

  // Fetch fields with summaries so DDL can annotate status if available
  const fields = await getFieldsWithSummaries(id);

  const typeMap: Record<string, string> = {
    string: "VARCHAR(255)",
    int: "INTEGER",
    decimal: "DECIMAL(18,4)",
    date: "DATE",
  };

  const cols = fields.map((f) => {
    const sqlType = typeMap[f.tipoDado] ?? "VARCHAR(255)";
    const pk = f.chave ? " PRIMARY KEY" : "";
    const statusComment = f.summary?.classification ? ` -- status: ${f.summary.classification}` : "";
    return `  ${f.campoTecnico} ${sqlType}${pk}${statusComment}`;
  });

  const ddl = `-- DDL gerado pelo Validador DD\n-- Tabela: ${dict.tabela} | Processo: ${dict.processo} | Categoria: ${dict.categoria}\n\nCREATE TABLE ${dict.tabela} (\n${cols.join(",\n")}\n);`;

  const filename = `${dict.tabela}_v${dict.version}.sql`;
  res.json({ format: "ddl", filename, content: ddl });
});

router.get("/dictionaries/:id/export/data-contract", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    req.log.error({ id: req.params.id }, "Invalid dictionary ID for data contract export");
    res.status(400).json({ error: "ID inválido" }); return;
  }

  const [dict] = await db.select().from(dictionariesTable).where(eq(dictionariesTable.id, id));
  if (!dict) {
    req.log.error({ dictionaryId: id }, "Dictionary not found for data contract export");
    res.status(404).json({ error: "Dicionário não encontrado" }); return;
  }

  const fields = await getFieldsWithSummaries(id);

  const contract = {
    versao: "1.0",
    processo: dict.processo,
    categoria: dict.categoria,
    tabela: dict.tabela,
    geradoEm: new Date().toISOString(),
    campos: fields.map((f) => ({
      campo: f.campoTecnico,
      campo_origem: f.campoOrigem,
      tipo: f.tipoDado,
      descricao: f.descricao,
      obrigatorio: f.summary?.avgRequired == null ? null : f.summary.avgRequired >= 0.5,
      chave: f.chave,
      origem: f.origem,
      periodicidade: f.periodicidade,
      regras_negocio: f.summary ? {
        usado: f.summary.avgUsed == null ? null : f.summary.avgUsed >= 0.5,
        obrigatorio: f.summary.avgRequired == null ? null : f.summary.avgRequired >= 0.5,
        nome_correto: f.summary.avgCorrectName == null ? null : f.summary.avgCorrectName >= 0.5,
        origem_correta: f.summary.avgCorrectOrigin == null ? null : f.summary.avgCorrectOrigin >= 0.5,
        regra_negocio: f.summary.avgHasBusinessRule == null ? null : f.summary.avgHasBusinessRule >= 0.5,
      } : null,
    })),
  };

  const filename = `${dict.tabela}_data_contract_v${dict.version}.json`;
  res.json({ format: "data-contract", filename, content: JSON.stringify(contract, null, 2) });
});

export default router;
