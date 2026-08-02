"use client";

import React, { useState } from "react";
import { Database, Search, ChevronLeft, ChevronRight, Columns, BarChart2, FileText, Package, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogSearch } from "@/components/catalog/CatalogSearch";
import { CatalogTableDetail } from "@/components/catalog/CatalogTableDetail";
import { CatalogColumnDetail } from "@/components/catalog/CatalogColumnDetail";
import { CatalogTable, CatalogColumn } from "@/hooks/use-catalog";
import { useCatalogSearch, useCatalogTable } from "@/hooks/use-catalog";
import { getLayerLabel, getLayerColor } from "@/lib/catalog-constants";

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "tables" | "columns" | "indicators" | "requirements">("search");
  const [selectedTable, setSelectedTable] = useState<CatalogTable | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<any | null>(null);

  const { data: searchResults, isLoading: searchLoading } = useCatalogSearch(searchQuery, activeTab === "search" && searchQuery.length >= 2);
  const { data: tableDetail, isLoading: tableLoading } = useCatalogTable(selectedTable?.id ?? 0);

  const handleResultClick = (result: { type: string; data: any }) => {
    if (result.type === "table") {
      setSelectedTable(result.data);
      setActiveTab("tables" as const);
    } else if (result.type === "column") {
      setSelectedColumn(result.data);
      setActiveTab("columns" as const);
    } else if (result.type === "indicator") {
      setActiveTab("indicators" as const);
    } else if (result.type === "requirement") {
      setActiveTab("requirements" as const);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Dados</h1>
        <p className="text-muted-foreground">
          Busque e explore tabelas, colunas, indicadores e requisitos do catálogo corporativo SAP/Suprimentos
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar no catálogo... (mín. 2 caracteres) - ex: contratualizacao, SK_, ME2N, valor pedido"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
              autoComplete="off"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-center text-xs text-muted-foreground mt-2">Digite pelo menos 2 caracteres</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "search" | "tables" | "columns" | "indicators" | "requirements")} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="search">Busca</TabsTrigger>
          <TabsTrigger value="tables">
            Tabelas {searchResults?.tables.length && <Badge variant="secondary" className="ml-1">{searchResults.tables.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="columns">
            Colunas {searchResults?.columns.length && <Badge variant="secondary" className="ml-1">{searchResults.columns.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="indicators">
            Indicadores {searchResults?.indicators.length && <Badge variant="secondary" className="ml-1">{searchResults.indicators.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="requirements">
            Requisitos {searchResults?.requirements.length && <Badge variant="secondary" className="ml-1">{searchResults.requirements.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Search Results Tab */}
        <TabsContent value="search" className="mt-4">
          {searchQuery.length < 2 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg">Digite para buscar no catálogo</p>
              <p className="text-sm mt-1">Exemplos: <code className="bg-muted px-1.5 py-0.5 rounded">contratualizacao</code>, <code className="bg-muted px-1.5 py-0.5 rounded">SK_</code>, <code className="bg-muted px-1.5 py-0.5 rounded">ME2N</code></p>
            </div>
          ) : searchLoading ? (
            <div className="text-center py-8">Buscando...</div>
          ) : (
            <div className="space-y-6">
              {searchResults?.tables.length && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <Database className="h-5 w-5" />
                    Tabelas ({searchResults!.tables.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults!.tables.map((table) => (
                      <Button
                        key={table.id}
                        variant="outline"
                        className="w-full justify-start p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                        onClick={() => { setSelectedTable(table); setActiveTab("tables"); }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge variant="secondary" className={table.camada === "RFN" ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}>
                            {table.camada === "RFN" ? "RFN" : "RAW"}
                          </Badge>
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium truncate">{table.schema}.{table.nome}</p>
                            {table.descricao && <p className="text-xs text-muted-foreground truncate">{table.descricao}</p>}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </section>
              )}

              {searchResults?.columns.length && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <Columns className="h-5 w-5" />
                    Colunas ({searchResults!.columns.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults!.columns.slice(0, 20).map((col) => (
                      <Button
                        key={col.id}
                        variant="outline"
                        className="w-full justify-start p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                        onClick={() => { setSelectedColumn(col); setActiveTab("columns"); }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="outline" className="text-xs">{col.tableSchema}.{col.tableNome}</Badge>
                          <Badge variant={col.pk ? "default" : "secondary"} className="text-xs">
                            {col.pk ? "PK" : "Col"}
                          </Badge>
                          <span className="font-mono text-sm truncate">{col.nome}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ))}
                    {searchResults!.columns.length > 20 && (
                      <p className="text-center text-muted-foreground text-sm py-2">+{searchResults!.columns.length - 20} colunas não exibidas</p>
                    )}
                  </div>
                </section>
              )}

              {searchResults?.indicators.length && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <BarChart2 className="h-5 w-5" />
                    Indicadores ({searchResults!.indicators.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults!.indicators.map((ind) => (
                      <Button
                        key={ind.id}
                        variant="outline"
                        className="w-full justify-start p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ind.nome}</p>
                          {ind.formula && <p className="text-sm text-muted-foreground font-mono mt-1 line-clamp-1">{ind.formula}</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </section>
              )}

              {searchResults?.requirements.length && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <FileText className="h-5 w-5" />
                    Requisitos ({searchResults!.requirements.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults!.requirements.map((req) => (
                      <Button
                        key={req.id}
                        variant="outline"
                        className="w-full justify-start p-3 hover:bg-accent rounded-lg transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{req.assunto}</p>
                          {req.descricao && <p className="text-sm text-muted-foreground line-clamp-1">{req.descricao}</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </section>
              )}

              {!searchResults?.tables.length && !searchResults?.columns.length && !searchResults?.indicators.length && !searchResults?.requirements.length && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum resultado encontrado para "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tables Tab */}
        <TabsContent value="tables" className="mt-4">
          {/* Would show all tables with pagination - for now shows search results */}
          <div className="text-center py-8 text-muted-foreground">
            Use a aba "Busca" para encontrar tabelas
          </div>
        </TabsContent>

        {/* Columns Tab */}
        <TabsContent value="columns" className="mt-4">
          {selectedColumn ? (
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedColumn(null); setActiveTab("search"); }}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <h2 className="font-mono text-lg font-medium">{selectedColumn.tableSchema}.{selectedColumn.tableNome}.{selectedColumn.nome}</h2>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Use a aba "Busca" para encontrar colunas
            </div>
          )}
        </TabsContent>

        {/* Indicators Tab */}
        <TabsContent value="indicators" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Use a aba "Busca" para encontrar indicadores
          </div>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Use a aba "Busca" para encontrar requisitos
          </div>
        </TabsContent>
      </Tabs>

      {/* Table Detail View */}
      {activeTab === "tables" && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg shadow-xl">
            <CatalogTableDetail
              table={selectedTable}
              columns={tableDetail?.columns || []}
              indicators={tableDetail?.indicators || []}
              etlPackages={tableDetail?.etlPackages || []}
              onBack={() => setSelectedTable(null)}
              onColumnClick={() => {}}
            />
          </div>
        </div>
      )}

      {/* Column Detail View */}
      {activeTab === "columns" && selectedColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg shadow-xl">
            <CatalogColumnDetail
              column={selectedColumn}
              table={selectedColumn}
              linkedFields={[]}
              onBack={() => { setSelectedColumn(null); setActiveTab("search"); }}
              onLinkClick={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}