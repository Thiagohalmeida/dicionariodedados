"use client";

import React from "react";
import { ChevronLeft, Database, Columns, BarChart2, FileText, Package, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CatalogTable, CatalogColumn } from "@/hooks/use-catalog";
import { getLayerLabel, getLayerColor } from "@/lib/catalog-constants";

interface CatalogTableDetailProps {
  table: CatalogTable;
  columns: any[];
  indicators: any[];
  etlPackages: { id: number; nome: string }[];
  onBack: () => void;
  onColumnClick: (column: any) => void;
}

export function CatalogTableDetail({ table, columns, indicators, etlPackages, onBack, onColumnClick }: CatalogTableDetailProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={table.camada === "RFN" ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}>
              {table.camada === "RFN" ? "RFN (Refinada)" : "RAW (Bruta)"}
            </Badge>
            <h1 className="font-mono text-xl font-bold truncate">{table.schema}.{table.nome}</h1>
          </div>
        </div>
      </div>

      {table.descricao && (
        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground">{table.descricao}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Schema</p>
                <p className="font-mono font-medium">{table.schema}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Camada</p>
                <Badge variant={table.camada === "RFN" ? "secondary" : "outline"} className={table.camada === "RFN" ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}>
                  {table.camada === "RFN" ? "RFN (Refinada)" : "RAW (Bruta)"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Data Owner</p>
                <p className="font-medium">{table.dataOwner || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total de Colunas</p>
                <p className="font-medium">{columns?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ETL Packages */}
        {etlPackages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pacotes ETL ({etlPackages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {etlPackages.map((pkg) => (
                  <Badge key={pkg.id} variant="outline" className="font-mono text-xs">
                    {pkg.nome}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Indicators */}
        {indicators.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                Indicadores Relacionados ({indicators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {indicators.map((ind) => (
                  <div key={ind.id} className="p-3 bg-muted/50 rounded-lg border">
                    <p className="font-medium">{ind.nome}</p>
                    {ind.formula && <p className="text-sm text-muted-foreground font-mono mt-1">{ind.formula}</p>}
                    {ind.meta && <p className="text-xs text-muted-foreground mt-1">Meta: {ind.meta}</p>}
                    {ind.frequencia && <p className="text-xs text-muted-foreground mt-1">Freq: {ind.frequencia}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Columns Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Colunas ({columns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">PK</th>
                  <th className="pb-2 font-medium">Obrig.</th>
                  <th className="pb-2 font-medium">Confid.</th>
                  <th className="pb-2 font-medium">LGPD</th>
                  <th className="pb-2 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {columns.map((col) => (
                  <tr key={col.id} className="hover:bg-accent/50 cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent("catalog-column-click", { detail: col }))}>
                    <td className="py-2 font-mono text-sm font-medium">{col.nome}</td>
                    <td className="py-2 text-sm">{col.tipo}</td>
                    <td className="py-2 text-center">
                      {col.pk && <Badge variant="default" className="text-xs">PK</Badge>}
                    </td>
                    <td className="py-2 text-center">
                      {col.obrigatorio && <Badge variant="secondary" className="text-xs">Sim</Badge>}
                    </td>
                    <td className="py-2 text-center">
                      {col.confidencialidade && <Badge variant="outline" className="text-xs">{col.confidencialidade}</Badge>}
                    </td>
                    <td className="py-2 text-center">
                      {col.classificacaoLgpd && <Badge variant="outline" className="text-xs">{col.classificacaoLgpd}</Badge>}
                    </td>
                    <td className="py-2 text-sm text-muted-foreground max-w-xs truncate">{col.descricao || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}