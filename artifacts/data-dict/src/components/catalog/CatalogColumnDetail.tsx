"use client";

import React from "react";
import { ChevronLeft, Database, Shield, User, Lock, FileText, Package, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CatalogColumn } from "@/hooks/use-catalog";
import { getConfidentialityLabel, getLgpdLabel, getConfidentialityColor, getLgpdColor } from "@/lib/catalog-constants";

interface CatalogColumnDetailProps {
  column: any;
  table: any;
  linkedFields: { id: number; campoTecnico: string; dictionaryId: number }[];
  onBack: () => void;
  onLinkClick: (fieldId: number, columnId: number) => void;
}

export function CatalogColumnDetail({ column, table, linkedFields, onBack, onLinkClick }: CatalogColumnDetailProps) {
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
              {table.camada === "RFN" ? "RFN" : "RAW"}
            </Badge>
            <span className="text-muted-foreground text-sm">{table.schema}.{table.nome}</span>
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium truncate">{column.nome}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações da Coluna
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Nome</p>
                <p className="font-mono font-medium">{column.nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Tipo de Dado</p>
                <p className="font-mono font-medium">{column.tipo}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Chave Primária</p>
                <p className="font-medium">{column.pk ? "Sim" : "Não"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Obrigatório</p>
                <p className="font-medium">{column.obrigatorio ? "Sim" : "Não"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Identificável</p>
                <p className="font-medium">{column.identificavel ? "Sim" : "Não"}</p>
              </div>
            </div>

            {column.descricao && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">Descrição</p>
                <p className="text-sm">{column.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Governança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Governança e LGPD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Confidencialidade</p>
                <Badge variant="outline" className={getConfidentialityColor(column.confidencialidade)}>
                  {getConfidentialityLabel(column.confidencialidade || "—")}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Classificação LGPD</p>
                <Badge variant="outline" className={getLgpdColor(column.classificacaoLgpd)}>
                  {getLgpdLabel(column.classificacaoLgpd || "—")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Origem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Tabela de Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className={table.camada === "RFN" ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}>
                {table.camada === "RFN" ? "RFN" : "RAW"}
              </Badge>
              <div>
                <p className="font-mono text-sm font-medium">{table.schema}.{table.nome}</p>
                {table.descricao && <p className="text-xs text-muted-foreground">{table.descricao}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pacotes ETL */}
        {column.etlPackages?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pacotes ETL Relacionados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {column.etlPackages.map((pkg: any) => (
                  <Badge key={pkg.id} variant="outline" className="font-mono text-xs">
                    {pkg.nome}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dicionários Vinculados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dicionários Vinculados ({linkedFields.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkedFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">Nenhum dicionário vinculado a esta coluna</p>
              <p className="text-sm">Use a busca no catálogo para encontrar e vincular</p>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Dict #{field.dictionaryId}</Badge>
                    <span className="font-mono text-sm">{field.campoTecnico}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onLinkClick(field.id, column.id)}>
                    Desvincular
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}