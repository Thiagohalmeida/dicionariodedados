import type { FieldWithSummary } from "@workspace/api-client-react";

export interface DatabricksDDLConfig {
  catalog: string;
  schema: string;
  tableName: string;
  partitionColumn?: string;
  zorderColumns?: string[];
  tableProperties?: Record<string, string>;
  includeBusinessRules?: boolean;
}

function mapToDatabricksType(tipoDado: string): string {
  const typeMap: Record<string, string> = {
    string: "STRING",
    int: "BIGINT",
    decimal: "DECIMAL(38,18)",
    date: "DATE",
    timestamp: "TIMESTAMP",
    boolean: "BOOLEAN",
  };
  return typeMap[tipoDado] || "STRING";
}

function detectPartitionColumn(fields: FieldWithSummary[]): string | undefined {
  // Auto-detect date-like columns for partitioning
  for (const f of fields) {
    const name = f.campoTecnico.toLowerCase();
    if (f.tipoDado === "date" || 
        name.includes("data") || 
        name.includes("dt_") ||
        name.includes("_dt") ||
        name === "data_particao") {
      return f.campoTecnico;
    }
  }
  return undefined;
}

function detectZOrderColumns(fields: FieldWithSummary[]): string[] {
  const zorder: string[] = [];
  
  // Always include primary keys
  for (const f of fields) {
    if (f.chave && !zorder.includes(f.campoTecnico)) {
      zorder.push(f.campoTecnico);
    }
  }
  
  // Add foreign key-like columns (common patterns)
  for (const f of fields) {
    const name = f.campoTecnico.toLowerCase();
    if (!zorder.includes(f.campoTecnico) &&
        (name.includes("id_") || 
         name.endsWith("_id") || 
         name.includes("cod_") ||
         name.endsWith("_cod"))) {
      zorder.push(f.campoTecnico);
    }
  }
  
  return zorder.slice(0, 4); // Databricks recommends max 4 Z-Order columns
}

export function generateDatabricksDDL(
  fields: FieldWithSummary[],
  config: DatabricksDDLConfig
): string {
  const tableName = `${config.catalog}.${config.schema}.${config.tableName}`;
  
  // Auto-detect partition if not specified
  const partitionColumn = config.partitionColumn || detectPartitionColumn(fields);
  
  // Auto-detect Z-Order if not specified
  const zorderColumns = config.zorderColumns || detectZOrderColumns(fields);
  
  // Build columns
  const columns = fields.map((f) => {
    const dbType = mapToDatabricksType(f.tipoDado);
    const pk = f.chave ? " PRIMARY KEY" : "";
    
    // Build comment with business description + validation status
    const commentParts: string[] = [];
    if (f.descricao) commentParts.push(f.descricao);
    if (f.businessRuleExpression) {
      commentParts.push(`Regra: ${f.businessRuleExpression}`);
    }
    if (f.summary) {
      commentParts.push(`Score: ${f.summary.score ?? "N/A"} (${f.summary.classification})`);
    }
    const comment = commentParts.length > 0 
      ? ` COMMENT '${commentParts.join(" | ").replace(/'/g, "''")}'` 
      : "";
    
    // Generated column for business rule if SQL exists
    const generated = (f.businessRuleSql && config.includeBusinessRules)
      ? ` GENERATED ALWAYS AS (${f.businessRuleSql}) STORED`
      : "";
    
    return `  ${f.campoTecnico} ${dbType}${pk}${generated}${comment}`;
  });
  
  // Build table properties
  const defaultProperties = {
    'delta.enableChangeDataFeed': 'true',
    'delta.autoOptimize.optimizeWrite': 'true',
    'delta.autoOptimize.autoCompact': 'true',
    'delta.minReaderVersion': '2',
    'delta.minWriterVersion': '5',
  };
  
  const allProperties = { ...defaultProperties, ...config.tableProperties };
  const propertiesStr = Object.entries(allProperties)
    .map(([k, v]) => `  '${k}' = '${v}'`)
    .join(",\n");
  
  // Build partition clause
  const partitionClause = partitionColumn 
    ? `PARTITIONED BY (${partitionColumn})`
    : "";
  
  // Build Z-Order clause
  const zorderClause = zorderColumns.length > 0
    ? `CLUSTER BY (${zorderColumns.join(", ")})`
    : "";
  
  const ddl = `-- DDL Databricks gerado automaticamente
-- Tabela: ${config.tableName} | Processo: ${config.catalog}.${config.schema}
-- Gerado em: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS ${tableName} (
${columns.join(",\n")}
)
USING DELTA
${partitionClause}
${zorderClause}
TBLPROPERTIES (
${propertiesStr}
);`;

  return ddl;
}

export function generateDatabricksCreateOrReplace(
  fields: FieldWithSummary[],
  config: DatabricksDDLConfig
): string {
  const baseDDL = generateDatabricksDDL(fields, config);
  return baseDDL.replace("CREATE TABLE IF NOT EXISTS", "CREATE OR REPLACE TABLE");
}

export function generateDatabricksAlterAddColumns(
  fields: FieldWithSummary[],
  config: DatabricksDDLConfig,
  existingColumns: string[]
): string {
  const newFields = fields.filter(f => !existingColumns.includes(f.campoTecnico));
  
  if (newFields.length === 0) return "-- No new columns to add";
  
  const alterStatements = newFields.map((f) => {
    const dbType = mapToDatabricksType(f.tipoDado);
    const comment = f.descricao ? ` COMMENT '${f.descricao.replace(/'/g, "''")}'` : "";
    return `ALTER TABLE ${config.catalog}.${config.schema}.${config.tableName} ADD COLUMN ${f.campoTecnico} ${dbType}${comment};`;
  });
  
  return alterStatements.join("\n");
}

export interface DatabricksLoadConfig {
  catalog: string;
  schema: string;
  tableName: string;
  sourcePath: string; // S3/ADLS/DBFS path
  fileFormat?: "parquet" | "csv" | "json" | "avro" | "orc";
  partitionColumn?: string;
  writeMode?: "append" | "overwrite" | "merge";
  mergeKey?: string; // For merge mode
}

export function generateDatabricksLoadSQL(config: DatabricksLoadConfig): string {
  const tableName = `${config.catalog}.${config.schema}.${config.tableName}`;
  const format = config.fileFormat || "parquet";
  const writeMode = config.writeMode || "append";
  
  if (writeMode === "merge" && config.mergeKey) {
    return `-- Merge Upsert (requires Delta Lake)
MERGE INTO ${config.catalog}.${config.schema}.${config.tableName} AS target
USING (
  SELECT * FROM ${config.sourcePath}
) AS source
ON target.${config.mergeKey} = source.${config.mergeKey}
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;`;
  }
  
  if (writeMode === "overwrite") {
    return `-- Overwrite mode (replaces entire table)
COPY INTO ${config.catalog}.${config.schema}.${config.tableName}
FROM '${config.sourcePath}'
FILEFORMAT = ${format.toUpperCase()}
FORMAT_OPTIONS ('mergeSchema' = 'true')
COPY_OPTIONS ('overwrite' = 'true');`;
  }
  
  // Default append
  return `-- Append mode (default)
COPY INTO ${config.catalog}.${config.schema}.${config.tableName}
FROM '${config.sourcePath}'
FILEFORMAT = ${format.toUpperCase()}
FORMAT_OPTIONS ('mergeSchema' = 'true');`;
}

export function generateOptimizeSQL(config: DatabricksDDLConfig): string {
  const tableName = `${config.catalog}.${config.schema}.${config.tableName}`;
  const zorderColumns = detectZOrderColumns([]);
  
  let sql = `OPTIMIZE ${tableName}`;
  
  if (zorderColumns.length > 0) {
    sql += ` ZORDER BY (${zorderColumns.join(", ")})`;
  }
  
  return sql + ";";
}

export function generateVacuumSQL(config: DatabricksDDLConfig, retentionHours = 168): string {
  const tableName = `${config.catalog}.${config.schema}.${config.tableName}`;
  return `VACUUM ${tableName} RETAIN ${retentionHours} HOURS;`;
}