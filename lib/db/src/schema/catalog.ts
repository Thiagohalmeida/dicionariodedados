import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

export const catalogLayerEnum = pgEnum("catalog_layer", ["RFN", "RAW"]);

export const catalogConfidentialityEnum = pgEnum("catalog_confidentiality", [
  "publica",
  "interna",
  "restrita",
  "confidencial",
]);

export const catalogLgpdEnum = pgEnum("catalog_lgpd_classification", [
  "pessoal",
  "sensivel",
  "nao_pessoal",
  "anonimizado",
]);

export const catalogDomains = pgTable("catalog_domains", {
  id: serial("id").primaryKey(),
  assunto: text("assunto").notNull().unique(),
  owner: text("owner"),
  areaNegocio: text("area_negocio"),
  palavrasChave: text("palavras_chave").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const catalogTables = pgTable("catalog_tables", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id")
    .notNull()
    .references(() => catalogDomains.id, { onDelete: "cascade" }),
  schema: text("schema").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  camada: catalogLayerEnum("camada").notNull(),
  dataOwner: text("data_owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const catalogColumns = pgTable("catalog_columns", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id")
    .notNull()
    .references(() => catalogTables.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  descricao: text("descricao"),
  pk: boolean("pk").default(false),
  obrigatorio: boolean("obrigatorio").default(false),
  confidencialidade: catalogConfidentialityEnum("confidencialidade"),
  classificacaoLgpd: catalogLgpdEnum("classificacao_lgpd"),
  identificavel: boolean("identificavel").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const catalogIndicators = pgTable("catalog_indicators", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id")
    .notNull()
    .references(() => catalogDomains.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  formula: text("formula"),
  meta: text("meta"),
  frequencia: text("frequencia"),
  homologadores: text("homologadores").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const catalogRequirements = pgTable("catalog_requirements", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id")
    .notNull()
    .references(() => catalogDomains.id, { onDelete: "cascade" }),
  assunto: text("assunto").notNull(),
  descricao: text("descricao"),
  regrasNegocio: text("regras_negocio"),
  status: text("status"),
  dataLevantamento: timestamp("data_levantamento", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const catalogEtlPackages = pgTable("catalog_etl_packages", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const catalogTableEtl = pgTable(
  "catalog_table_etl",
  {
    tableId: integer("table_id")
      .notNull()
      .references(() => catalogTables.id, { onDelete: "cascade" }),
    etlPackageId: integer("etl_package_id")
      .notNull()
      .references(() => catalogEtlPackages.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tableId, t.etlPackageId] }),
  }),
);

export type CatalogDomain = typeof catalogDomains.$inferSelect;
export type CatalogTable = typeof catalogTables.$inferSelect;
export type CatalogColumn = typeof catalogColumns.$inferSelect;
export type CatalogIndicator = typeof catalogIndicators.$inferSelect;
export type CatalogRequirement = typeof catalogRequirements.$inferSelect;
export type CatalogEtlPackage = typeof catalogEtlPackages.$inferSelect;
export type CatalogTableEtl = typeof catalogTableEtl.$inferSelect;