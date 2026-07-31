import { db } from "@workspace/db";
import {
  catalogDomains,
  catalogTables,
  catalogColumns,
  catalogIndicators,
  catalogRequirements,
  catalogEtlPackages,
  catalogTableEtl,
  catalogConfidentialityEnum,
  catalogLgpdEnum,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CatalogJSON {
  domain: {
    assunto: string;
    owner: string;
    areaNegocio: string;
    palavrasChave: string[];
  };
  tables: Array<{
    schema: string;
    nome: string;
    descricao: string;
    camada: "RFN" | "RAW";
    dataOwner: string;
    colunas: Array<{
      nome: string;
      tipo: string;
      descricao: string;
      pk: boolean;
      obrigatorio: boolean;
      confidencialidade: string;
      classificacaoLgpd: string;
      identificavel: boolean;
    }>;
  }>;
  columns: Array<{
    tableNome: string;
    nome: string;
    tipo: string;
    descricao: string;
    pk: boolean;
    obrigatorio: boolean;
    confidencialidade: string;
    classificacaoLgpd: string;
    identificavel: boolean;
  }>;
  indicators: Array<{
    nome: string;
    formula: string;
    meta: string;
    frequencia: string;
    homologadores: string[];
  }>;
  requirements: Array<{
    assunto: string;
    descricao: string;
    regrasNegocio: string;
    status: string;
    dataLevantamento: string;
  }>;
  etlPackages: Array<{ nome: string }>;
  tableEtl: Array<{ tableNome: string; etlPackageNome: string }>;
}

async function importCatalog() {
  const jsonPath = path.resolve(__dirname, "../data/catalog-intermediate.json");
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON não encontrado: ${jsonPath}`);
    console.error("Execute primeiro: pnpm --filter @workspace/scripts run pdf-parser");
    process.exit(1);
  }

  console.log("Lendo JSON intermediário...");
  const json: CatalogJSON = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  
  console.log("=== Iniciando importação do catálogo ===");
  console.log(`Domínio: ${json.domain.assunto}`);
  console.log(`Tabelas: ${json.tables.length}`);
  console.log(`Colunas: ${json.columns.length}`);
  console.log(`Indicadores: ${json.indicators.length}`);
  console.log(`Requisitos: ${json.requirements.length}`);
  console.log(`ETL Packages: ${json.etlPackages.length}`);
  console.log(`Table-ETL: ${json.tableEtl.length}`);

  // 1. Upsert Domain
  console.log("\n1. Inserindo domínio...");
  const [domain] = await db.insert(catalogDomains)
    .values({
      assunto: json.domain.assunto,
      owner: json.domain.owner,
      areaNegocio: json.domain.areaNegocio,
      palavrasChave: json.domain.palavrasChave,
    })
    .onConflictDoUpdate({
      target: catalogDomains.assunto,
      set: {
        owner: json.domain.owner,
        areaNegocio: json.domain.areaNegocio,
        palavrasChave: json.domain.palavrasChave,
        updatedAt: new Date(),
      },
    })
    .returning();
  console.log(`   Domínio criado/atualizado: ${domain.id} - ${domain.assunto}`);

  // 2. Upsert Tables
  console.log("\n2. Inserindo tabelas...");
  const tableMap = new Map<string, number>(); // nome -> id
  
  for (const t of json.tables) {
    const [table] = await db.insert(catalogTables)
      .values({
        domainId: domain.id,
        schema: t.schema,
        nome: t.nome,
        descricao: t.descricao,
        camada: t.camada,
        dataOwner: t.dataOwner,
      })
      .onConflictDoUpdate({
        target: [catalogTables.schema, catalogTables.nome],
        set: {
          descricao: t.descricao,
          camada: t.camada,
          dataOwner: t.dataOwner,
          updatedAt: new Date(),
        },
      })
      .returning();
    tableMap.set(t.nome, table.id);
    console.log(`   ${t.schema}.${t.nome} (${t.camada}): ${table.id} - ${t.colunas.length} cols`);
  }
  console.log(`   Total: ${tableMap.size} tabelas`);

  // 3. Upsert Columns
  console.log("\n3. Inserindo colunas...");
  let colCount = 0;
  for (const c of json.columns) {
    const tableId = tableMap.get(c.tableNome);
    if (!tableId) {
      console.warn(`   Tabela não encontrada: ${c.tableNome}`);
      continue;
    }
    
    await db.insert(catalogColumns)
      .values({
        tableId,
        nome: c.nome,
        tipo: c.tipo,
        descricao: c.descricao,
        pk: c.pk,
        obrigatorio: c.obrigatorio,
        confidencialidade: c.confidencialidade as "publica" | "interna" | "restrita" | "confidencial",
        classificacaoLgpd: c.classificacaoLgpd as "pessoal" | "sensivel" | "nao_pessoal" | "anonimizado",
        identificavel: c.identificavel,
      })
      .onConflictDoUpdate({
        target: [catalogColumns.tableId, catalogColumns.nome],
        set: {
          tipo: c.tipo,
          descricao: c.descricao,
          pk: c.pk,
          obrigatorio: c.obrigatorio,
          confidencialidade: c.confidencialidade as "publica" | "interna" | "restrita" | "confidencial",
          classificacaoLgpd: c.classificacaoLgpd as "pessoal" | "sensivel" | "nao_pessoal" | "anonimizado",
          identificavel: c.identificavel,
          updatedAt: new Date(),
        },
      });
    colCount++;
  }
  console.log(`   Total: ${colCount} colunas`);

  // 4. Upsert Indicators
  console.log("\n4. Inserindo indicadores...");
  let indCount = 0;
  for (const i of json.indicators) {
    await db.insert(catalogIndicators)
      .values({
        domainId: domain.id,
        nome: i.nome,
        formula: i.formula,
        meta: i.meta,
        frequencia: i.frequencia,
        homologadores: i.homologadores,
      })
      .onConflictDoUpdate({
        target: [catalogIndicators.domainId, catalogIndicators.nome],
        set: {
          formula: i.formula,
          meta: i.meta,
          frequencia: i.frequencia,
          homologadores: i.homologadores,
          updatedAt: new Date(),
        },
      });
    indCount++;
  }
  console.log(`   Total: ${indCount} indicadores`);

  // 5. Upsert Requirements
  console.log("\n5. Inserindo requisitos...");
  let reqCount = 0;
  for (const r of json.requirements) {
    await db.insert(catalogRequirements)
      .values({
        domainId: domain.id,
        assunto: r.assunto,
        descricao: r.descricao,
        regrasNegocio: r.regrasNegocio,
        status: r.status,
        dataLevantamento: r.dataLevantamento ? new Date(r.dataLevantamento) : null,
      })
      .onConflictDoUpdate({
        target: [catalogRequirements.domainId, catalogRequirements.assunto],
        set: {
          descricao: r.descricao,
          regrasNegocio: r.regrasNegocio,
          status: r.status,
          dataLevantamento: r.dataLevantamento ? new Date(r.dataLevantamento) : null,
          updatedAt: new Date(),
        },
      });
    reqCount++;
  }
  console.log(`   Total: ${reqCount} requisitos`);

  // 6. Upsert ETL Packages
  console.log("\n6. Inserindo pacotes ETL...");
  const etlMap = new Map<string, number>();
  let etlCount = 0;
  for (const e of json.etlPackages) {
    const [etl] = await db.insert(catalogEtlPackages)
      .values({ nome: e.nome })
      .onConflictDoUpdate({
        target: catalogEtlPackages.nome,
        set: { updatedAt: new Date() },
      })
      .returning();
    etlMap.set(e.nome.toLowerCase(), etl.id);
    etlCount++;
  }
  console.log(`   Total: ${etlCount} pacotes ETL`);

  // 7. Upsert Table-ETL Relations
  console.log("\n7. Inserindo relações Tabela-ETL...");
  let relCount = 0;
  for (const r of json.tableEtl) {
    const tableId = tableMap.get(r.tableNome);
    const etlId = etlMap.get(r.etlPackageNome.toLowerCase());
    
    if (!tableId) {
      console.warn(`   Tabela não encontrada: ${r.tableNome}`);
      continue;
    }
    if (!etlId) {
      console.warn(`   ETL não encontrado: ${r.etlPackageNome}`);
      continue;
    }
    
    await db.insert(catalogTableEtl)
      .values({ tableId, etlPackageId: etlId })
      .onConflictDoNothing();
    relCount++;
  }
  console.log(`   Total: ${relCount} relações`);

  console.log("\n=== Importação concluída com sucesso! ===");
  console.log(`Domínio: 1`);
  console.log(`Tabelas: ${tableMap.size}`);
  console.log(`Colunas: ${colCount}`);
  console.log(`Indicadores: ${indCount}`);
  console.log(`Requisitos: ${reqCount}`);
  console.log(`ETL Packages: ${etlCount}`);
  console.log(`Relações Tabela-ETL: ${relCount}`);
}

importCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erro na importação:", err);
    process.exit(1);
  });