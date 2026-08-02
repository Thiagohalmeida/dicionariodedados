"use client";

import React from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCatalogSearch, CatalogSearchResult } from "@/hooks/use-catalog";
import { CatalogTable } from "@/hooks/use-catalog";
import { getLayerLabel, getLayerColor } from "@/lib/catalog-constants";

interface CatalogSearchProps {
  onResultClick: (result: { type: "table" | "column" | "indicator" | "requirement"; data: any }) => void;
  onClose: () => void;
}

export function CatalogSearch({ onResultClick, onClose }: CatalogSearchProps) {
  const [query, setQuery] = React.useState("");
  const [showResults, setShowResults] = React.useState(false);
  const [filterType, setFilterType] = React.useState<"all" | "tables" | "columns" | "indicators" | "requirements">("all");

  const { data, isLoading, isError } = useCatalogSearch(query, query.length >= 2);

  const filteredResults = React.useMemo(() => {
    if (!data) return { tables: [], columns: [], indicators: [], requirements: [] };

    if (filterType === "all") return data;

    return {
      tables: filterType === "tables" ? data.tables : [],
      columns: filterType === "columns" ? data.columns : [],
      indicators: filterType === "indicators" ? data.indicators : [],
      requirements: filterType === "requirements" ? data.requirements : [],
    };
  }, [data, filterType]);

  const totalResults = filteredResults.tables.length + filteredResults.columns.length + filteredResults.indicators.length + filteredResults.requirements.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Buscar no catálogo... (mín. 2 caracteres)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 w-full"
          autoComplete="off"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => {
              setQuery("");
              setShowResults(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && query.length >= 2 && (
        <div className="mt-2 rounded-lg border bg-card shadow-lg overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b px-2">
            {[
              { value: "all", label: `Todos (${totalResults})` },
              { value: "tables", label: `Tabelas (${filteredResults.tables.length})` },
              { value: "columns", label: `Colunas (${filteredResults.columns.length})` },
              { value: "indicators", label: `Indicadores (${filteredResults.indicators.length})` },
              { value: "requirements", label: `Requisitos (${filteredResults.requirements.length})` },
            ].map(({ value, label }) => (
              <Button
                key={value}
                variant={filterType === value ? "default" : "ghost"}
                size="sm"
                className="px-3 py-1 text-xs"
                onClick={() => setFilterType(value as "all" | "tables" | "columns" | "indicators" | "requirements")}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto p-2">
            {isLoading && <div className="text-center py-8 text-muted-foreground">Buscando...</div>}
            {isError && <div className="text-center py-8 text-destructive">Erro na busca</div>}

            {!isLoading && !isError && totalResults === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum resultado encontrado para "{query}"
              </div>
            )}

            {filteredResults.tables.map((table) => (
              <button
                key={`table-${table.id}`}
                className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                onClick={() => onResultClick({ type: "table", data: table })}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className={getLayerColor(table.camada)}>
                    {getLayerLabel(table.camada)}
                  </Badge>
                  <span className="font-mono text-sm text-muted-foreground">{table.schema}.{table.nome}</span>
                </div>
                {table.descricao && <p className="text-sm text-muted-foreground line-clamp-1">{table.descricao}</p>}
              </button>
            ))}

            {filteredResults.columns.map((col) => (
              <button
                key={`column-${col.id}`}
                className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                onClick={() => onResultClick({ type: "column", data: col })}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {col.tableSchema}.{col.tableNome}
                  </Badge>
                  <Badge variant={col.pk ? "default" : "secondary"} className="text-xs">
                    {col.pk ? "PK" : "Col"}
                  </Badge>
                  <span className="font-mono text-sm">{col.nome}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{col.descricao || "Sem descrição"}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {col.pk && <Badge variant="secondary">PK</Badge>}
                  {col.obrigatorio && <Badge variant="secondary">Obrigatório</Badge>}
                  {col.confidencialidade && <Badge variant="outline">{col.confidencialidade}</Badge>}
                  {col.classificacaoLgpd && <Badge variant="outline">{col.classificacaoLgpd}</Badge>}
                </div>
              </button>
            ))}

            {filteredResults.indicators.map((ind) => (
              <button
                key={`indicator-${ind.id}`}
                className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                onClick={() => onResultClick({ type: "indicator", data: ind })}
              >
                <h4 className="font-medium">{ind.nome}</h4>
                {ind.formula && <p className="text-sm text-muted-foreground font-mono mt-1 line-clamp-2">{ind.formula}</p>}
                {ind.meta && <p className="text-xs text-muted-foreground mt-1">Meta: {ind.meta}</p>}
              </button>
            ))}

            {filteredResults.requirements.map((req) => (
              <button
                key={`requirement-${req.id}`}
                className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                onClick={() => onResultClick({ type: "requirement", data: req })}
              >
                <h4 className="font-medium">{req.assunto}</h4>
                {req.descricao && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{req.descricao}</p>}
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <Badge variant="outline">{req.status || "Ativo"}</Badge>
                  {req.dataLevantamento && <span className="text-muted-foreground">{new Date(req.dataLevantamento).toLocaleDateString()}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}