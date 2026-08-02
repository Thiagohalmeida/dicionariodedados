"use client";

import React from "react";
import { ChevronRight, ChevronDown, Database, Columns, BarChart2, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CatalogTable } from "@/hooks/use-catalog";
import { getLayerLabel, getLayerColor } from "@/lib/catalog-constants";

interface CatalogResultsProps {
  tables: CatalogTable[];
  columns: any[];
  indicators: any[];
  requirements: any[];
  onSelect: (item: { type: string; data: any }) => void;
}

export function CatalogResults({ tables, columns, indicators, requirements, onSelect }: CatalogResultsProps) {
  if (!tables.length && !columns.length && !indicators.length && !requirements.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum resultado encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tables.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Tabelas ({tables.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                    onClick={() => onSelect({ type: "table", data: table })}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="secondary" className={getLayerColor(table.camada)}>
                        {getLayerLabel(table.camada)}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium truncate">{table.schema}.{table.nome}</p>
                        {table.descricao && <p className="text-xs text-muted-foreground truncate">{table.descricao}</p>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {columns.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Columns className="h-5 w-5" />
                Colunas ({columns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {columns.slice(0, 20).map((col) => (
                  <button
                    key={col.id}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                    onClick={() => onSelect({ type: "column", data: col })}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs">{col.tableSchema}.{col.tableNome}</Badge>
                      <Badge variant={col.pk ? "default" : "secondary"} className="text-xs">
                        {col.pk ? "PK" : "Col"}
                      </Badge>
                      <span className="font-mono text-sm truncate">{col.nome}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                {columns.length > 20 && (
                  <p className="text-center text-muted-foreground text-sm py-2">
                    +{columns.length - 20} colunas não exibidas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {indicators.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                Indicadores ({indicators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {indicators.map((ind) => (
                  <button
                    key={ind.id}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                    onClick={() => onSelect({ type: "indicator", data: ind })}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ind.nome}</p>
                      {ind.formula && <p className="text-sm text-muted-foreground font-mono mt-1 line-clamp-1">{ind.formula}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {requirements.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Requisitos ({requirements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {requirements.map((req) => (
                  <button
                    key={req.id}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                    onClick={() => onSelect({ type: "requirement", data: req })}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{req.assunto}</p>
                      {req.descricao && <p className="text-sm text-muted-foreground line-clamp-1">{req.descricao}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}