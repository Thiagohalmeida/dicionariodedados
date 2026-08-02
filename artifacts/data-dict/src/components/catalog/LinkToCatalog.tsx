"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Link as LinkIcon, Unlink2, ExternalLink } from "lucide-react";
import { CatalogSearch } from "./CatalogSearch";
import { CatalogColumnDetail } from "./CatalogColumnDetail";
import { useCatalogSearch, useCatalogColumn, linkFieldToCatalog, unlinkFieldFromCatalog } from "@/hooks/use-catalog";
import { useToast } from "@/hooks/use-toast";
import { CatalogTable } from "@/hooks/use-catalog";

interface LinkToCatalogProps {
  fieldId: number;
  fieldName: string;
  currentCatalogColumnId?: number;
  onClose: () => void;
  onLinked: () => void;
}

export function LinkToCatalog({ fieldId, fieldName, currentCatalogColumnId, onClose, onLinked }: LinkToCatalogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColumn, setSelectedColumn] = useState<any | null>(null);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [view, setView] = useState<"search" | "table" | "column">("search");
  const [linking, setLinking] = useState(false);

  const { data: searchResults, isLoading: searchLoading } = useCatalogSearch(searchQuery, searchQuery.length >= 2);
  const { data: columnDetail, isLoading: columnLoading } = useCatalogColumn(selectedColumn?.id ?? 0);

  const handleLink = async () => {
    if (!selectedColumn) return;
    setLinking(true);
    try {
      await linkFieldToCatalog(fieldId, selectedColumn.id);
      toast({ title: "Vinculado com sucesso", description: `"${fieldName}" agora está vinculado a ${selectedColumn.tableSchema}.${selectedColumn.tableNome}.${selectedColumn.nome}` });
      onLinked();
      onClose();
    } catch (error) {
      toast({ title: "Erro ao vincular", description: "Não foi possível vincular ao catálogo", variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!currentCatalogColumnId) return;
    setLinking(true);
    try {
      await unlinkFieldFromCatalog(fieldId);
      toast({ title: "Desvinculado", description: "A vinculação com o catálogo foi removida" });
      onLinked();
      onClose();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível desvincular", variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const handleResultClick = (result: { type: string; data: any }) => {
    if (result.type === "table") {
      setSelectedTable(result.data);
      setView("table");
    } else if (result.type === "column") {
      setSelectedColumn(result.data);
      setView("column");
    }
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[90vw] max-w-5xl h-[90vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Vincular ao Catálogo: {fieldName}</span>
            {currentCatalogColumnId && (
              <Button variant="destructive" size="sm" onClick={handleUnlink} disabled={linking}>
                <Unlink2 className="h-4 w-4 mr-2" /> Desvincular
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {view === "search" && (
            <CatalogSearch
              onResultClick={handleResultClick}
              onClose={() => setView("search")}
            />
          )}

          {view === "table" && selectedTable && (
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => setView("search")}>
                  <Search className="h-4 w-4 mr-1" /> Voltar à busca
                </Button>
                <h3 className="font-medium">{selectedTable.schema}.{selectedTable.nome}</h3>
              </div>
              {/* Table columns would be loaded here */}
              <p className="text-center text-muted-foreground py-8">Clique em uma tabela nos resultados para ver suas colunas</p>
            </div>
          )}

          {view === "column" && selectedColumn && (
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => setView("search")}>
                  <Search className="h-4 w-4 mr-1" /> Voltar à busca
                </Button>
                <Button
                  variant="default"
                  onClick={handleLink}
                  disabled={linking}
                  className="ml-auto"
                >
                  <LinkIcon className="h-4 w-4 mr-2" /> Vincular este campo
                </Button>
              </div>
              <CatalogColumnDetail
                column={columnDetail?.column || selectedColumn}
                table={columnDetail?.table || { schema: selectedColumn.tableSchema, nome: selectedColumn.tableNome, camada: selectedColumn.tableCamada }}
                linkedFields={columnDetail?.linkedFields || []}
                onBack={() => setView("search")}
                onLinkClick={handleLink}
              />
            </div>
          )}

          {view === "search" && !searchQuery && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Digite pelo menos 2 caracteres para buscar no catálogo</p>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}