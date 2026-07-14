"use client";

import React, { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pencil,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Download,
  Save,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiAction } from "@/hooks/use-api-action";
import { EditFieldDialog } from "@/components/shared/edit-field-dialog";
import { ValidationPanel } from "@/components/shared/validation-panel";
import type { ValidationInputOriginType } from "@workspace/api-client-react";

interface PreviewField {
  id: number;
  campoOrigem: string;
  campoTecnico: string;
  descricao: string;
  tipoDado: string;
  origem: string;
  periodicidade: string;
  chave: boolean;
  included: boolean; // whether to include in final JSON
  validation?: {
    validatorName?: string;
    used?: boolean;
    required?: boolean;
    correctName?: boolean;
    correctOrigin?: boolean;
    hasBusinessRule?: boolean;
    originType?: string;
    originDetail?: string;
    businessRuleRationale?: string;
    formula?: string;
    comment?: string;
  };
}

interface PreviewValidationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: PreviewField[];
  onGenerateValidatedJson: (validatedFields: PreviewField[]) => void;
  onImportDictionary: (json: unknown) => void;
  // Context from the preview response (already resolved by backend)
  resolvedMeta?: {
    processo: string;
    categoria: string;
    tabela: string;
  } | null;
}

export default function PreviewValidationSheet({
  open,
  onOpenChange,
  fields: initialFields,
  onGenerateValidatedJson,
  onImportDictionary,
  resolvedMeta,
}: PreviewValidationSheetProps) {
  const { toast } = useToast();
  const { isLoading: isGenerating, executeWithToast: generateValidatedJson } = useApiAction();
  const { isLoading: isImporting, executeWithToast: importDictionary } = useApiAction();
  const [editingField, setEditingField] = useState<PreviewField | null>(null);
  const [validatingField, setValidatingField] = useState<PreviewField | null>(
    null,
  );
  const [fields, setFields] = useState<PreviewField[]>(initialFields);

  // Sync with initialFields when they change
  React.useEffect(() => {
    setFields(
      initialFields.map((f) => ({ ...f, included: f.included ?? true })),
    );
  }, [initialFields]);

  const handleEditSave = useCallback(
    (updated: Partial<PreviewField>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === editingField?.id ? { ...f, ...updated } : f)),
      );
      setEditingField(null);
    },
    [editingField?.id],
  );

  const handleValidationSave = useCallback(
    (formData: {
      validatorName: string;
      used: boolean;
      required: boolean;
      correctName: boolean;
      correctOrigin: boolean;
      hasBusinessRule: boolean;
      originType: string;
      originDetail: string;
      businessRuleRationale: string;
      formula: string;
      comment: string;
    }) => {
      const { formula, ...validation } = formData;
      setFields((prev) =>
        prev.map((f) =>
          f.id === validatingField?.id ? { ...f, validation } : f,
        ),
      );
      setValidatingField(null);
    },
    [validatingField?.id],
  );

  const toggleIncluded = useCallback((id: number, included: boolean) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, included } : f)),
    );
  }, []);

  const toggleAllIncluded = useCallback((included: boolean) => {
    setFields((prev) => prev.map((f) => ({ ...f, included })));
  }, []);

  const hasValidations = fields.some((f) => f.validation);
  const allIncluded = fields.length > 0 && fields.every((f) => f.included);
  const someIncluded = fields.some((f) => f.included);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[98vw] max-w-[98vw] overflow-x-auto overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Validação do Preview - {fields.length} campos</span>
            <div className="flex items-center gap-2">
              <Badge
                variant={hasValidations ? "default" : "outline"}
                className="text-xs"
              >
                {hasValidations ? "Validado" : "Sem validações"}
              </Badge>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Card className="mt-4 min-w-[1200px]">
          <CardHeader>
            <CardTitle>Edite e valide cada campo antes de importar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: "40px" }}>
                      <Checkbox
                        checked={allIncluded}
                        onCheckedChange={(checked) =>
                          toggleAllIncluded(checked as boolean)
                        }
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Campo de Origem</TableHead>
                    <TableHead>Campo Técnico</TableHead>
                    <TableHead className="max-w-[200px]">Descrição</TableHead>
                    <TableHead>Tipo de Dado</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Periodicidade</TableHead>
                    <TableHead>Chave</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field) => (
                    <TableRow
                      key={field.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        !field.included ? "opacity-40 bg-muted/50" : ""
                      }`}
                    >
                      <TableCell style={{ width: "40px" }}>
                        <Checkbox
                          checked={field.included}
                          onCheckedChange={(checked) =>
                            toggleIncluded(field.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {field.campoOrigem}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {field.campoTecnico}
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={field.descricao}
                      >
                        {field.descricao}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {field.tipoDado}
                      </TableCell>
                      <TableCell>{field.origem}</TableCell>
                      <TableCell>{field.periodicidade}</TableCell>
                      <TableCell>{field.chave ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={field.validation
                            ? "default"
                            : "outline"}
                        >
                          {field.validation ? "Aprovado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={field.validation
                            ? "default"
                            : "outline"}
                        >
                          {field.validation ? "Confiável" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingField(field)}
                            title="Editar campo"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setValidatingField(field)}
                          >
                            {field.validation ? "Revalidar" : "Validar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

<SheetFooter className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            disabled={isGenerating}
            onClick={() =>
              generateValidatedJson(
                async () => {
                  const validatedFields = fields.map((f) => ({
                    ...f,
                    validation: f.validation,
                  }));
                  onGenerateValidatedJson(validatedFields);
                  return validatedFields;
                },
                "JSON Validado Gerado",
                "Erro ao gerar JSON",
              )
            }
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {" "}
                <Save className="h-4 w-4" /> Gerar JSON Validado
              </>
            )}
          </Button>
          <Button
            disabled={isImporting || !hasValidations}
            onClick={() =>
              importDictionary(
                async () => {
                  const includedFields = fields.filter((f) => f.included);
                  // Filter out formula fields (sim/suporte)
                  const validFields = includedFields.filter(
                    (f) => f.validation?.formula !== "sim" && f.validation?.formula !== "suporte",
                  );
                  const jsonGerado = {
                    processo: resolvedMeta?.processo || "",
                    categoria: resolvedMeta?.categoria || "",
                    tabela: resolvedMeta?.tabela || "",
                    campos: validFields.map((f) => ({
                      campo_origem: f.campoOrigem,
                      campo_tecnico: f.campoTecnico,
                      descricao: f.descricao,
                      tipo_dado: f.tipoDado,
                      origem: f.origem,
                      periodicidade: f.periodicidade,
                      chave: f.chave,
                    })),
                  };
                  onImportDictionary(jsonGerado);
                  return jsonGerado;
                },
                "Dicionário importado",
                "Erro ao importar",
              )
            }
            className="gap-2"
            variant="default"
          >
            <>
              {" "}
              <Download className="h-4 w-4" /> Importar Dicionário
            </>
          </Button>
        </SheetFooter>

        {editingField && (
          <EditFieldDialog
            field={editingField}
            onClose={() => setEditingField(null)}
            onSave={handleEditSave}
            showIncludedField={true}
          />
        )}

        {validatingField && (
          <ValidationPanel
            field={validatingField}
            onClose={() => setValidatingField(null)}
            onSave={handleValidationSave}
            variant="dialog"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}