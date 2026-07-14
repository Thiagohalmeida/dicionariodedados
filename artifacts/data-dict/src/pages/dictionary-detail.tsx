import React, { useState } from "react";
import {
  useGetDictionary,
  useSubmitValidation,
  useUpdateField,
  getGetDictionaryQueryKey,
  useExportDictionary,
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { ValidationInputOriginType } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Download, Pencil, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  traduzirStatus,
  traduzirClassificacao,
  getApiBase,
  statusBadgeVariant,
  classificationBadgeVariant,
} from "@/lib/utils";
import { EditFieldDialog } from "@/components/shared/edit-field-dialog";
import { FieldTableRow } from "@/components/shared/field-table-row";
import { ValidationPanel } from "@/components/shared/validation-panel";
import { useApiExport } from "@/hooks/use-api-action";

interface FieldSummary {
  fieldId: number;
  totalValidations: number;
  approvedCount: number;
  rejectedCount: number;
  conflictCount: number;
  statusFinal: "pending" | "approved" | "rejected" | "conflict";
  score: number | null;
  classification: "pending" | "reliable" | "attention" | "critical";
  avgUsed?: number | null;
  avgRequired?: number | null;
  avgCorrectName?: number | null;
  avgCorrectOrigin?: number | null;
  avgHasBusinessRule?: number | null;
}

interface Field {
  id: number;
  dictionaryId: number;
  campoOrigem: string;
  descricao: string;
  origem: string;
  periodicidade: string;
  campoTecnico: string;
  tipoDado: string;
  chave: boolean;
  summary?: FieldSummary;
}

interface FieldWithSummary extends Field {
  summary: FieldSummary;
}

export default function DictionaryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: dict, isLoading } = useGetDictionary(id, {
    query: { enabled: !!id, queryKey: getGetDictionaryQueryKey(id) },
  });
  const [selectedField, setSelectedField] = useState<FieldWithSummary | null>(
    null,
  );
  const [editingField, setEditingField] = useState<FieldWithSummary | null>(
    null,
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { exportWithToast: exportJsonCsv, isLoading: isExporting } = useApiExport();
  const { exportWithToast: exportExtra, isLoading: isExportingExtra } = useApiExport();
  const submitValidation = useSubmitValidation();
  const updateField = useUpdateField();

  const handleExport = async (format?: "csv") => {
    const path = `/api/dictionaries/${id}/export${format === "csv" ? "?format=csv" : ""}`;
    await exportJsonCsv(path, "Exportado com sucesso", "Erro ao exportar");
  };

  const handleExportExtra = async (type: "ddl" | "data-contract") => {
    const path = `/api/dictionaries/${id}/export/${type}`;
    const title = type === "ddl" ? "DDL exportado" : "Data Contract exportado";
    await exportExtra(path, title, "Erro ao exportar");
  };

  const handleValidationSave = (validation: {
    validatorName: string;
    used: boolean;
    required: boolean;
    correctName: boolean;
    correctOrigin: boolean;
    hasBusinessRule: boolean;
    originType: "interno" | "externo";
    originDetail: string;
    businessRuleRationale: string;
    formula: string;
    comment: string;
  }) => {
    const { formula, ...validationData } = validation;
    const formulaValue = formula as "nao" | "sim" | "suporte";

    updateField.mutate(
      { id: selectedField!.id, data: { formula: formulaValue } },
      {
        onError: () => {
          toast({
            title: "Erro ao atualizar campo",
            description: "Não foi possível salvar o tipo de fórmula.",
            variant: "destructive",
          });
        },
      },
    );

    submitValidation.mutate(
      { id: selectedField!.id, data: { ...validationData, validatorName: validation.validatorName, comment: validation.comment } },
      {
        onSuccess: () => {
          toast({
            title: "Validação registrada",
            description: "Sua validação foi salva com sucesso.",
          });
          queryClient.invalidateQueries({
            queryKey: getGetDictionaryQueryKey(id),
          });
        },
        onError: () => {
          toast({
            title: "Erro ao registrar",
            description: "Não foi possível salvar a validação.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleEditSave = (form: {
    campoOrigem: string;
    descricao: string;
    origem: string;
    periodicidade: string;
    campoTecnico: string;
    tipoDado: string;
    chave: boolean;
    included?: boolean;
  }) => {
    updateField.mutate(
      { id: editingField!.id, data: form },
      {
        onSuccess: () => {
          toast({
            title: "Campo atualizado",
            description: "As informações do campo foram salvas.",
          });
          queryClient.invalidateQueries({
            queryKey: getGetDictionaryQueryKey(id),
          });
        },
        onError: () => {
          toast({
            title: "Erro ao salvar",
            description: "Não foi possível salvar as alterações.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (!dict) return <div className="p-8">Dicionário não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dict.tabela}</h1>
          <p className="text-muted-foreground">
            {dict.processo} / {dict.categoria}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <Badge variant="outline" className="text-lg py-1 px-3">
            {traduzirStatus(dict.status)}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={isExporting || isExportingExtra}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExport()}>
                JSON validado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportExtra("ddl")}>
                DDL (CREATE TABLE)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportExtra("data-contract")}
              >
                Data Contract (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo de Origem</TableHead>
                <TableHead>Campo Técnico</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo de Dado</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Pontuação</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dict.fields.map((field) => (
                <FieldTableRow
                  key={field.id}
                  field={field}
                  onSelect={(f) => setSelectedField(f as FieldWithSummary)}
                  onEdit={(f) => setEditingField(f as FieldWithSummary)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedField && (
        <ValidationPanel
          field={selectedField}
          onClose={() => setSelectedField(null)}
          onSave={handleValidationSave}
          variant="sheet"
        />
      )}

      {editingField && (
        <EditFieldDialog
          field={editingField}
          onClose={() => setEditingField(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}