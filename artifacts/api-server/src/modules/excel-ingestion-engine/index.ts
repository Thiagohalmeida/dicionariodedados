import ExcelJS from "exceljs";

export interface UserContext {
  processo: string;
  categoria: string;
  tabela: string | null;
  aba_preferencial: string | null;
}

export interface DictionaryField {
  campo_origem: string;
  descricao: string;
  origem: string;
  periodicidade: string;
  campo_tecnico: string;
  tipo_dado: string;
  chave: boolean;
}

export interface ParsedDictionary {
  processo: string;
  categoria: string;
  tabela: string;
  campos: DictionaryField[];
  meta: {
    arquivo: string;
    aba_utilizada: string;
    abas_ignoradas: { aba: string; motivo: string }[];
    total_colunas_raw: number;
    colunas_removidas: string[];
  };
}

const NOISE_PATTERNS = [/%/, /∆/, /variação/i, /var\./i, /projeç/i, /projection/i, /delta/i];

const SKIP_SHEET_KEYWORDS = [/resumo/i, /dashboard/i, /pivot/i, /projeç/i, /sumário/i, /capa/i, /índice/i, /indice/i];

const ENTITY_KEYWORDS: Record<string, RegExp[]> = {
  rfq: [/rfq/i, /solicitaç/i, /cotaç/i],
  rfq_item: [/item/i, /material/i, /produto/i, /medicamento/i],
  fornecedor: [/fornecedor/i, /vendor/i, /supplier/i],
  cotacao: [/preço/i, /preco/i, /cotaç/i, /valor/i, /proposta/i],
};

const USEFUL_COLUMN_SIGNALS = [
  /material/i, /produto/i, /fornecedor/i, /preço/i, /preco/i, /valor/i,
  /unidade/i, /estado/i, /código/i, /codigo/i, /id/i, /nome/i, /descri/i,
];

function toSnakeCase(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function isNoiseColumn(header: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(header));
}

function inferType(values: unknown[]): string {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "string";

  let intCount = 0;
  let decimalCount = 0;
  let dateCount = 0;
  let stringCount = 0;

  for (const v of nonNull) {
    if (v instanceof Date) { dateCount++; continue; }
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) { dateCount++; continue; }
    if (/^\d+$/.test(s)) { intCount++; continue; }
    if (/^\d+[.,]\d+$/.test(s)) { decimalCount++; continue; }
    stringCount++;
  }

  const total = nonNull.length;
  if (dateCount / total > 0.6) return "date";
  if (decimalCount / total > 0.4) return "decimal";
  if (intCount / total > 0.6) return "int";
  return "string";
}

function detectEntityFromSheetName(name: string): string {
  for (const [entity, patterns] of Object.entries(ENTITY_KEYWORDS)) {
    if (patterns.some((p) => p.test(name))) return entity;
  }
  return "dados";
}

function scoreSheet(worksheet: ExcelJS.Worksheet): number {
  const name = worksheet.name;
  if (SKIP_SHEET_KEYWORDS.some((p) => p.test(name))) return -1;

  let score = 0;

  const firstRow = worksheet.getRow(1);
  const headers: string[] = [];
  firstRow.eachCell((cell) => {
    const val = String(cell.value ?? "").trim();
    if (val) headers.push(val);
  });

  if (headers.length < 3) return -1;
  score += headers.length;

  const usefulSignals = headers.filter((h) => USEFUL_COLUMN_SIGNALS.some((p) => p.test(h)));
  score += usefulSignals.length * 5;

  const noiseCount = headers.filter(isNoiseColumn).length;
  score -= noiseCount * 3;

  let rowCount = 0;
  worksheet.eachRow((_, rowNum) => { if (rowNum > 1) rowCount++; });
  score += Math.min(rowCount, 50);

  return score;
}

function generateTableName(ctx: UserContext, sheetName: string): string {
  if (ctx.tabela) return toSnakeCase(ctx.tabela);
  const entity = detectEntityFromSheetName(sheetName);
  const parts = [ctx.processo, ctx.categoria, entity].map(toSnakeCase).filter(Boolean);
  return parts.join("_");
}

export async function parseExcelToDataDictionary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buffer: any,
  filename: string,
  ctx: UserContext
): Promise<ParsedDictionary> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (workbook.xlsx as any).load(buffer);

  const abas_ignoradas: { aba: string; motivo: string }[] = [];
  let bestSheet: ExcelJS.Worksheet | null = null;
  let bestScore = -Infinity;

  if (ctx.aba_preferencial) {
    const found = workbook.getWorksheet(ctx.aba_preferencial);
    if (found) {
      bestSheet = found;
    } else {
      abas_ignoradas.push({ aba: ctx.aba_preferencial, motivo: "Aba preferencial não encontrada, detectando automaticamente" });
    }
  }

  if (!bestSheet) {
    workbook.eachSheet((ws) => {
      const score = scoreSheet(ws);
      if (score < 0) {
        abas_ignoradas.push({ aba: ws.name, motivo: "Ignorada (resumo, dashboard, pivot ou poucas colunas)" });
        return;
      }
      if (score > bestScore) {
        bestScore = score;
        bestSheet = ws;
      }
    });
  }

  if (!bestSheet) {
    throw new Error("Nenhuma aba de dados válida encontrada no arquivo.");
  }

  const sheet = bestSheet as ExcelJS.Worksheet;

  workbook.eachSheet((ws) => {
    if (ws.name !== sheet.name && !abas_ignoradas.find((a) => a.aba === ws.name)) {
      abas_ignoradas.push({ aba: ws.name, motivo: "Pontuação inferior à aba selecionada" });
    }
  });

  const headerRow = sheet.getRow(1);
  const rawHeaders: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    rawHeaders.push(String(cell.value ?? "").trim());
  });

  const colunas_removidas: string[] = [];
  const validIndices: number[] = [];
  rawHeaders.forEach((h, i) => {
    if (isNoiseColumn(h)) {
      colunas_removidas.push(h);
    } else {
      validIndices.push(i + 1);
    }
  });

  const columnValues: Record<number, unknown[]> = {};
  validIndices.forEach((i) => { columnValues[i] = []; });

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    validIndices.forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      columnValues[colIdx].push(cell.value);
    });
  });

  const tabela = generateTableName(ctx, sheet.name);

  // Heurísticas adicionais para origem e periodicidade
  const originHeaderIndex = rawHeaders.findIndex((h) => /(origem|sistema)/i.test(h));
  let inferredOrigem: string | null = null;
  if (originHeaderIndex >= 0) {
    const colIdx = originHeaderIndex + 1;
    const samples = columnValues[colIdx] ?? [];
    const firstNonEmpty = samples.find((v) => v !== null && v !== undefined && String(v).trim() !== "");
    if (firstNonEmpty) inferredOrigem = String(firstNonEmpty).trim();
  }

  // Detect periodicidade from sheet name or headers (best-effort)
  function detectPeriodicidade(): string {
    const name = sheet.name.toLowerCase();
    if (/diar|dia/.test(name)) return "diario";
    if (/semanal|semana/.test(name)) return "semanal";
    if (/mensal|mês|mes/.test(name)) return "mensal";
    // If many columns are dates, prefer diario
    const allValues = Object.values(columnValues).flat();
    const nonNull = allValues.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
    const dateLike = nonNull.filter((v) => v instanceof Date || /\d{4}-\d{2}-\d{2}/.test(String(v)) || /\d{2}\/\d{2}\/\d{4}/.test(String(v)) );
    if (nonNull.length > 0 && dateLike.length / nonNull.length > 0.4) return "diario";
    return "eventual";
  }

  const defaultPeriodicidade = detectPeriodicidade();

  const campos: DictionaryField[] = validIndices.map((colIdx, i) => {
    const headerRaw = rawHeaders[colIdx - 1];
    const campoTecnico = toSnakeCase(headerRaw) || `campo_${i + 1}`;
    const tipo = inferType(columnValues[colIdx]);
    const isFirstNumericKey =
      i === 0 && (tipo === "int" || campoTecnico.includes("id") || campoTecnico.includes("cod"));

    return {
      campo_origem: headerRaw,
      // leave descricao empty to force specialist to provide meaningful business description
      descricao: "",
      origem: inferredOrigem ?? `${filename} | ${sheet.name}`,
      periodicidade: defaultPeriodicidade,
      campo_tecnico: campoTecnico,
      tipo_dado: tipo,
      chave: isFirstNumericKey,
    };
  });

  return {
    processo: ctx.processo,
    categoria: ctx.categoria,
    tabela,
    campos,
    meta: {
      arquivo: filename,
      aba_utilizada: sheet.name,
      abas_ignoradas,
      total_colunas_raw: rawHeaders.length,
      colunas_removidas,
    },
  };
}
