import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ParsedColumn {
  nome: string;
  tipo: string;
  descricao: string;
  pk: boolean;
  obrigatorio: boolean;
  confidencialidade: string;
  classificacaoLgpd: string;
  identificavel: boolean;
}

interface ParsedTable {
  schema: string;
  nome: string;
  descricao: string;
  camada: "RFN" | "RAW";
  dataOwner: string;
  colunas: ParsedColumn[];
}

interface ParsedIndicator {
  nome: string;
  formula: string;
  meta: string;
  frequencia: string;
  homologadores: string[];
}

interface ParsedRequirement {
  assunto: string;
  descricao: string;
  regrasNegocio: string;
  status: string;
  dataLevantamento: string;
}

interface ParsedEtlPackage {
  nome: string;
}

interface ParsedTableEtl {
  tableNome: string;
  etlPackageNome: string;
}

interface CatalogJSON {
  domain: {
    assunto: string;
    owner: string;
    areaNegocio: string;
    palavrasChave: string[];
  };
  tables: ParsedTable[];
  columns: Array<ParsedColumn & { tableNome: string }>;
  indicators: ParsedIndicator[];
  requirements: ParsedRequirement[];
  etlPackages: ParsedEtlPackage[];
  tableEtl: ParsedTableEtl[];
}

// Parse columns from a table section - works with multi-line text
function parseColumnsFromSection(section: string, tableNome: string): Array<ParsedColumn & { tableNome: string }> {
  const columns: Array<ParsedColumn & { tableNome: string }> = [];
  
  // The regex that works: uppercase name followed immediately by type
  const colRegex = /^([A-Z_][A-Z0-9_]*)(Number\(\d+\)|Varchar2\(\d+\)|Date|Timestamp)/;
  
  const lines = section.split("\n").map(l => l.replace(/°\s*/g, "° ").replace(/[ \t]+/g, " ").trim());
  
  let currentColumn: Partial<ParsedColumn> = {};
  let inColumn = false;
  let pendingDesc = "";
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Check for new column start
    const typeMatch = line.match(colRegex);
    
    if (typeMatch) {
      // Save previous column
      if (inColumn && currentColumn.nome) {
        if (pendingDesc) currentColumn.descricao = pendingDesc.trim();
        columns.push({ ...currentColumn, tableNome } as ParsedColumn & { tableNome: string });
      }
      
      // Start new column
      const nome = typeMatch[1];
      const tipo = typeMatch[2];
      const descStart = line.indexOf(tipo) + tipo.length;
      pendingDesc = line.substring(descStart).trim();
      
      currentColumn = {
        nome,
        tipo,
        descricao: "",
        pk: false,
        obrigatorio: false,
        confidencialidade: "Interna",
        classificacaoLgpd: "Não Pessoal",
        identificavel: false,
      };
      inColumn = true;
      continue;
    }
    
    if (!inColumn) continue;
    
    // Parse metadata lines starting with °
    if (line.startsWith("°")) {
      if (line.includes("Chave Primária ou única: Sim")) currentColumn.pk = true;
      else if (line.includes("Obrigatório: Sim")) currentColumn.obrigatorio = true;
      else if (line.includes("Informação confidencial:")) {
        const val = line.split(":")[1]?.trim();
        if (val) currentColumn.confidencialidade = val;
      }
      else if (line.includes("Classificação dado pessoal:")) {
        const val = line.split(":")[1]?.trim();
        if (val) currentColumn.classificacaoLgpd = val;
      }
      else if (line.includes("Informação identificável:")) {
        const val = line.split(":")[1]?.trim();
        if (val === "Sim") currentColumn.identificavel = true;
      }
      continue;
    }
    
    // Stop conditions: next table, section, or page break
    if (line.startsWith("Tabela:") || 
        line.startsWith("Indicador:") || 
        line.startsWith("Requisito:") ||
        line.startsWith("Ficha técnica")) {
      if (inColumn && currentColumn.nome) {
        if (pendingDesc) currentColumn.descricao = pendingDesc.trim();
        columns.push({ ...currentColumn, tableNome } as ParsedColumn & { tableNome: string });
      }
      break;
    }
    
    // Continuation of description (lines without ° or type pattern)
    if (line && !line.startsWith("°") && !line.match(colRegex)) {
      if (pendingDesc) {
        pendingDesc += " " + line;
      }
      continue;
    }
  }
  
  // Save last column
  if (inColumn && currentColumn.nome) {
    if (pendingDesc) currentColumn.descricao = pendingDesc.trim();
    columns.push({ ...currentColumn, tableNome } as ParsedColumn & { tableNome: string });
  }
  
  return columns;
}

// Parse tables using "Tabela:" markers - get FULL section for each table
function parseTables(text: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  
  // Find all "Tabela:" occurrences
  const tableRegex = /Tabela:\s*([A-Z_][A-Z0-9_]*)/g;
  let match;
  const tablePositions: Array<{nome: string, index: number}> = [];
  
  while ((match = tableRegex.exec(text)) !== null) {
    tablePositions.push({ nome: match[1], index: match.index });
  }
  
  for (let i = 0; i < tablePositions.length; i++) {
    const current = tablePositions[i];
    const next = tablePositions[i + 1];
    // Get FULL section from this table to next table (including all page breaks)
    const section = next 
      ? text.substring(current.index, next.index)
      : text.substring(current.index);
    
    // Normalize the section (remove page headers but keep structure)
    const normalizedSection = normalizeText(section);
    
    // Skip false positives: tables that are just "BIRFNUSR" (references in requirements, not definitions)
    // Real tables have proper names like "RFN_MSH_SAP_SUP_..." or "RAW_SAP_..."
    if (!current.nome.startsWith("RFN_") && !current.nome.startsWith("RAW_")) {
      continue;
    }
    
    // Also verify this is a real table definition by checking for "Dicionário de dados"
    if (!normalizedSection.includes("Dicionário de dados")) {
      continue;
    }
    
    // Determine schema and layer from table name
    let schema = "BIRFNUSR";
    let camada: "RFN" | "RAW" = "RFN";
    if (current.nome.startsWith("RAW_")) {
      schema = "RAWZN";
      camada = "RAW";
    } else if (current.nome.startsWith("RFN_")) {
      schema = "BIRFNUSR";
      camada = "RFN";
    }
    
    // Extract description
    const descMatch = normalizedSection.match(/° Descrição:([^°]+)/);
    const descricao = descMatch ? descMatch[1].trim() : "";
    
    // Extract data owner
    const ownerMatch = normalizedSection.match(/° Dataowner:([^°]+)/);
    const dataOwner = ownerMatch ? ownerMatch[1].trim() : "Wesley Nascimento De Oliveira";
    
    // Parse columns for this table
    const colunas = parseColumnsFromSection(normalizedSection, current.nome);
    
    tables.push({
      schema,
      nome: current.nome,
      descricao,
      camada,
      dataOwner,
      colunas,
    });
  }
  
  return tables;
}

// Normalize text - remove page headers but KEEP newlines for parsing
function normalizeText(text: string): string {
  return text
    // Remove page headers: "Catálogo de dados SIGD - Gestão e Governança de Dados19/05/2026 18:21Pág:XX"
    // The PDF text concatenates without spaces, so match more flexibly
    .replace(/Catálogo de dados\s+SIGD\s*-\s*Gestão e Governança de Dados[\s\S]*?\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2}Pág:\d+/g, "\n")
    // Remove "Pág:XX" standalone
    .replace(/Pág:\d+/g, "\n")
    // Remove "Catálogo de dados" fragments from broken page headers
    .replace(/Catálogo de dados\s+SIGD\s*-\s*Gestão e Governança de Da[\s\S]*?\d{2}\/\d{2}\/\d{4}/g, "\n")
    // Remove "ColunaTipo DadoDescrição da Coluna" repeated headers (appears on each page)
    .replace(/ColunaTipo DadoDescrição da Coluna/g, "")
    // Ensure ° has space after
    .replace(/°\s*/g, "° ")
    // Normalize multiple spaces but keep newlines
    .replace(/[ \t]+/g, " ")
    .trim();
}

function parseIndicators(text: string): ParsedIndicator[] {
  const indicators: ParsedIndicator[] = [];
  const normalized = normalizeText(text);
  const sections = normalized.split("Indicador:").slice(1);
  
  for (const section of sections) {
    const nomeMatch = section.match(/^([^\n]+)/);
    const nome = nomeMatch ? nomeMatch[1].trim() : "";
    
    const formulaMatch = section.match(/Memória de cálculo:([^º]+)/);
    const formula = formulaMatch ? formulaMatch[1].trim() : "";
    
    const metaMatch = section.match(/Meta:([^º]+)/);
    const meta = metaMatch ? metaMatch[1].trim() : "Não definida";
    
    const freqMatch = section.match(/Frequência de carga:([^º]+)/);
    const frequencia = freqMatch ? freqMatch[1].trim() : "";
    
    const homologadoresMatch = section.match(/Homologadores:([^º]+)/);
    const homologadores = homologadoresMatch 
      ? homologadoresMatch[1].split(/[,(e)]/).map(h => h.trim()).filter(Boolean)
      : [];
    
    if (nome) {
      indicators.push({ nome, formula, meta, frequencia, homologadores });
    }
  }
  
  return indicators;
}

function parseRequirements(text: string): ParsedRequirement[] {
  const requirements: ParsedRequirement[] = [];
  const normalized = normalizeText(text);
  const sections = normalized.split("Requisito:").slice(1);
  
  for (const section of sections) {
    const assuntoMatch = section.match(/^([^\n]+)/);
    const assunto = assuntoMatch ? assuntoMatch[1].trim() : "";
    
    const descMatch = section.match(/Descrição:([^º]+)/);
    const descricao = descMatch ? descMatch[1].trim() : "";
    
    const regrasMatch = section.match(/Regras de Negócio([^º]+)/);
    const regrasNegocio = regrasMatch ? regrasMatch[1].trim() : "";
    
    const statusMatch = section.match(/Status:([^º]+)/);
    const status = statusMatch ? statusMatch[1].trim() : "Ativo";
    
    const dataMatch = section.match(/Data levantamento([^º]+)/);
    const dataLevantamento = dataMatch ? dataMatch[1].trim() : "";
    
    if (assunto) {
      requirements.push({ assunto, descricao, regrasNegocio, status, dataLevantamento });
    }
  }
  
  return requirements;
}

function parseEtlPackages(text: string): ParsedEtlPackage[] {
  const packages = new Set<string>();
  
  // Extract from pkg_ patterns (case insensitive)
  const pkgRegex = /pkg_[a-z0-9_]+/gi;
  let pkgMatch;
  while ((pkgMatch = pkgRegex.exec(text)) !== null) {
    packages.add(pkgMatch[0].toLowerCase());
  }
  
  // Also extract from PKG_ patterns (uppercase)
  const PKGRegex = /PKG_[A-Z0-9_]+/g;
  let pkgMatch2;
  while ((pkgMatch2 = PKGRegex.exec(text)) !== null) {
    packages.add(pkgMatch2[0].toLowerCase());
  }
  
  // Extract from job names
  const jobRegex = /job\s+\w+:\s*([^\n]+)/g;
  let jobMatch;
  while ((jobMatch = jobRegex.exec(text)) !== null) {
    packages.add(jobMatch[1].trim());
  }
  
  return Array.from(packages).map(nome => ({ nome }));
}

function parseTableEtl(text: string, tables: ParsedTable[]): ParsedTableEtl[] {
  const result: ParsedTableEtl[] = [];
  
  // For each table, find associated pkg_ patterns in its section
  const tableNames = tables.map(t => t.nome);
  
  // Find all pkg_ occurrences with context
  const pkgContextRegex = /(pkg_[a-z0-9_]+|PKG_[A-Z0-9_]+)/gi;
  let ctxMatch;
  const pkgOccurrences: Array<{pkg: string, index: number}> = [];
  while ((ctxMatch = pkgContextRegex.exec(text)) !== null) {
    pkgOccurrences.push({ pkg: ctxMatch[0].toLowerCase(), index: ctxMatch.index });
  }
  
  // For each table, find the nearest pkg_ before or after its definition
  const tablePositions: Array<{nome: string, index: number}> = [];
  const tableRegex = /Tabela:\s*([A-Z_][A-Z0-9_]*)/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(text)) !== null) {
    if (tableNames.includes(tableMatch[1])) {
      tablePositions.push({ nome: tableMatch[1], index: tableMatch.index });
    }
  }
  
  for (const table of tablePositions) {
    // Find pkg_ occurrences near this table (within 5000 chars before or after)
    const nearbyPkgs = pkgOccurrences.filter(p => 
      Math.abs(p.index - table.index) < 5000
    );
    
    if (nearbyPkgs.length > 0) {
      // Take the closest one
      const closest = nearbyPkgs.reduce((prev, curr) => 
        Math.abs(curr.index - table.index) < Math.abs(prev.index - table.index) ? curr : prev
      );
      result.push({ tableNome: table.nome, etlPackageNome: closest.pkg });
    }
  }
  
  return result;
}

async function main() {
  const inputPath = path.resolve(__dirname, "../data/catalog-pdf-text.txt");
  const text = fs.readFileSync(inputPath, "utf-8");
  
  console.log("Parsing PDF text...");
  
  const tables = parseTables(text);
  console.log(`Found ${tables.length} tables`);
  
  const columns = tables.flatMap(t => t.colunas.map(c => ({ ...c, tableNome: t.nome })));
  console.log(`Found ${columns.length} columns`);
  
  const indicators = parseIndicators(text);
  console.log(`Found ${indicators.length} indicators`);
  
  const requirements = parseRequirements(text);
  console.log(`Found ${requirements.length} requirements`);
  
  const etlPackages = parseEtlPackages(text);
  console.log(`Found ${etlPackages.length} ETL packages`);
  
  const tableEtl = parseTableEtl(text, tables);
  console.log(`Found ${tableEtl.length} table-ETL relations`);
  
  const domain = {
    assunto: "Indicadores de Suprimento",
    owner: "Wesley Nascimento De Oliveira",
    areaNegocio: "Diretoria de Supply",
    palavrasChave: [
      "ME2N", "ME3M", "ME0M", "MB51", "MB5B",
      "SupplyChain", "Procurement", "Suprimento",
      "Contratualização", "Padronização de compras",
      "Compras emergenciais", "Giro de estoque"
    ],
  };
  
  const catalog: CatalogJSON = {
    domain,
    tables,
    columns,
    indicators,
    requirements,
    etlPackages,
    tableEtl,
  };
  
  const outputPath = path.resolve(__dirname, "../data/catalog-intermediate.json");
  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), "utf-8");
  console.log(`\nJSON salvo em: ${outputPath}`);
  
  console.log("\n=== RESUMO ===");
  console.log(`Domínio: ${domain.assunto}`);
  console.log(`Tabelas: ${tables.length} (RFN: ${tables.filter(t => t.camada === "RFN").length}, RAW: ${tables.filter(t => t.camada === "RAW").length})`);
  console.log(`Colunas: ${columns.length}`);
  console.log(`Indicadores: ${indicators.length}`);
  console.log(`Requisitos: ${requirements.length}`);
  console.log(`ETL Packages: ${etlPackages.length}`);
  console.log(`Table-ETL: ${tableEtl.length}`);
  
  console.log("\nTabelas por camada:");
  for (const t of tables) {
    console.log(`  [${t.camada}] ${t.schema}.${t.nome} (${t.colunas.length} colunas)`);
  }
}

main().catch(console.error);