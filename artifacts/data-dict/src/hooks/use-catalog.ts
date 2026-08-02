import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-request";

export interface CatalogTable {
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

export interface CatalogColumn {
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

export interface CatalogIndicator {
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

export interface CatalogRequirement {
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

export interface CatalogEtlPackage {
  id: number;
  nome: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogSearchResult {
  tables: CatalogTable[];
  columns: (CatalogColumn & { tableNome: string; tableSchema: string; tableCamada: "RFN" | "RAW" })[];
  indicators: CatalogIndicator[];
  requirements: CatalogRequirement[];
}

export function useCatalogSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["catalog", "search", query],
    queryFn: async () => {
      const res = await apiRequest<CatalogSearchResult>({
        path: `/api/catalog/search?q=${encodeURIComponent(query)}`,
      });
      return res;
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30000,
  });
}

export function useCatalogTable(tableId: number) {
  return useQuery({
    queryKey: ["catalog", "table", tableId],
    queryFn: async () => {
      const res = await apiRequest<{
        table: CatalogTable;
        columns: CatalogColumn[];
        indicators: CatalogIndicator[];
        etlPackages: { id: number; nome: string }[];
      }>({
        path: `/api/catalog/tables/${tableId}`,
      });
      return res;
    },
    enabled: !!tableId,
    staleTime: 30000,
  });
}

export function useCatalogColumn(columnId: number) {
  return useQuery({
    queryKey: ["catalog", "column", columnId],
    queryFn: async () => {
      const res = await apiRequest<{
        column: CatalogColumn;
        table: CatalogTable;
        linkedFields: { id: number; campoTecnico: string; dictionaryId: number }[];
      }>({
        path: `/api/catalog/columns/${columnId}`,
      });
      return res;
    },
    enabled: !!columnId,
    staleTime: 30000,
  });
}

export async function linkFieldToCatalog(fieldId: number, catalogColumnId: number) {
  const res = await apiRequest({
    path: `/api/catalog/fields/${fieldId}/link`,
    method: "POST",
    body: JSON.stringify({ catalogColumnId }),
  });
  return res;
}

export async function unlinkFieldFromCatalog(fieldId: number) {
  const res = await apiRequest({
    path: `/api/catalog/fields/${fieldId}/link`,
    method: "DELETE",
  });
  return res;
}