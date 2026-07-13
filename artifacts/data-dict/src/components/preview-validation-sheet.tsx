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
import { getApiBase } from "@/lib/utils";
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

function EditFieldDialog({
  field,
  onClose,
  onSave,
}: {
  field: PreviewField;
  onClose: () => void;
  onSave: (updated: Partial<PreviewField>) => void;
}) {
  const [form, setForm] = useState({
    campoOrigem: field.campoOrigem ?? "",
    descricao: field.descricao ?? "",
    origem: field.origem ?? "",
    periodicidade: field.periodicidade ?? "",
    campoTecnico: field.campoTecnico ?? "",
    tipoDado: field.tipoDado ?? "",
    chave: field.chave ?? false,
    included: field.included ?? true,
  });

  function handleSave() {
    onSave(form);
    onClose();
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Campo: {field.campoOrigem}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Campo de Origem</Label>
            <Input
              value={form.campoOrigem}
              onChange={(e) =>
                setForm({ ...form, campoOrigem: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Campo Técnico</Label>
            <Input
              value={form.campoTecnico}
              onChange={(e) =>
                setForm({ ...form, campoTecnico: e.target.value })
              }
              className="font-mono"
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de Dado</Label>
            <Input
              value={form.tipoDado}
              onChange={(e) => setForm({ ...form, tipoDado: e.target.value })}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Origem</Label>
            <Input
              value={form.origem}
              onChange={(e) => setForm({ ...form, origem: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Periodicidade</Label>
            <Input
              value={form.periodicidade}
              onChange={(e) =>
                setForm({ ...form, periodicidade: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Chave Primária</Label>
            <Select
              value={form.chave ? "sim" : "nao"}
              onValueChange={(v) => setForm({ ...form, chave: v === "sim" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Incluir no JSON</Label>
            <Select
              value={form.included ? "sim" : "nao"}
              onValueChange={(v) => setForm({ ...form, included: v === "sim" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{"Salvar Alterações"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValidationPanel({
  field,
  onClose,
  onSave,
}: {
  field: PreviewField;
  onClose: () => void;
  onSave: (validation: PreviewField["validation"]) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    validatorName: field.validation?.validatorName ?? "",
    used: field.validation?.used ?? false,
    required: field.validation?.required ?? false,
    correctName: field.validation?.correctName ?? false,
    correctOrigin: field.validation?.correctOrigin ?? false,
    hasBusinessRule: field.validation?.hasBusinessRule ?? false,
    originType: field.validation?.originType ?? "",
    originDetail: field.validation?.originDetail ?? "",
    businessRuleRationale: field.validation?.businessRuleRationale ?? "",
    formula: field.validation?.formula ?? "nao",
    comment: field.validation?.comment ?? "",
  });

  const validatorOptions = [
    "Cleber Horta",
    "Fernando Rosseto",
    "Lucas Silva",
    "Rosangela Goncalves",
    "Alexandra Joelma",
    "Tania Ribeiro",
    "Ricardo Paulino",
    "Eduardo Lefundes",
    "Thiago Almeida",
  ];

  const handleSubmit = () => {
    const name = form.validatorName.trim();
    if (!name) {
      toast({
        title: "Campo obrigatório",
        description: "Informe seu nome antes de enviar a validação.",
        variant: "destructive",
      });
      return;
    }

    if (!form.originType) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o tipo de origem do dado.",
        variant: "destructive",
      });
      return;
    }

    if (form.hasBusinessRule && !form.businessRuleRationale.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o conceito/racional da regra de negócio.",
        variant: "destructive",
      });
      return;
    }

    // Auto-fill comment when formula is "sim"
    const comment = form.formula === "sim" ? "fórmula" : form.comment;

    // Remove formula from validation payload (not part of validation schema)
    const { formula, ...validationData } = form;

    onSave({ ...validationData, comment });
    onClose();
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validar Campo: {field.campoOrigem}</DialogTitle>
        </DialogHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Nome Técnico</span>
              <span className="font-mono">{field.campoTecnico}</span>
              <span className="text-muted-foreground">Descrição</span>
              <span>{field.descricao}</span>
              <span className="text-muted-foreground">Tipo de Dado</span>
              <span className="font-mono">{field.tipoDado}</span>
              <span className="text-muted-foreground">Origem</span>
              <span>{field.origem}</span>
              <span className="text-muted-foreground">Periodicidade</span>
              <span>{field.periodicidade}</span>
              <span className="text-muted-foreground">Chave Primária</span>
              <span>{field.chave ? "Sim" : "Não"}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Responsável pela Validação</Label>
              <Select
                value={form.validatorName}
                onValueChange={(value) =>
                  setForm({ ...form, validatorName: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o validador" />
                </SelectTrigger>
                <SelectContent>
                  {validatorOptions.map((validator) => (
                    <SelectItem key={validator} value={validator}>
                      {validator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">
                Critérios de Validação (20 pts cada)
              </Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="used"
                  checked={form.used}
                  onCheckedChange={(c) =>
                    setForm({ ...form, used: c === true })
                  }
                />
                <label
                  htmlFor="used"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Campo utilizado no processo
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={form.required}
                  onCheckedChange={(c) =>
                    setForm({ ...form, required: c === true })
                  }
                />
                <label
                  htmlFor="required"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Campo obrigatório
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="correctName"
                  checked={form.correctName}
                  onCheckedChange={(c) =>
                    setForm({ ...form, correctName: c === true })
                  }
                />
                <label
                  htmlFor="correctName"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Nome técnico correto
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">
                  Origem
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="correctOrigin"
                    checked={form.correctOrigin}
                    onCheckedChange={(c) =>
                      setForm({ ...form, correctOrigin: c === true })
                    }
                  />
                  <label
                    htmlFor="correctOrigin"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Origem
                  </label>
                </div>
                <div className="ml-6 space-y-2">
                  <Label className="text-sm">Fonte</Label>
                  <Select
                    value={form.originType}
                    onValueChange={(value) =>
                      setForm({ ...form, originType: value, originDetail: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interno">Interno</SelectItem>
                      <SelectItem value="externo">Externo</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-4 space-y-2">
                    {form.originType === "interno" && (
                      <div className="space-y-2">
                        <Label className="text-sm">Plataforma</Label>
                        <Input
                          value={form.originDetail}
                          onChange={(e) =>
                            setForm({ ...form, originDetail: e.target.value })
                          }
                          placeholder="Ex: SAP - M303M"
                        />
                      </div>
                    )}
                    {form.originType === "externo" && (
                      <div className="space-y-2">
                        <Label className="text-sm">Origem</Label>
                        <Input
                          value={form.originDetail}
                          onChange={(e) =>
                            setForm({ ...form, originDetail: e.target.value })
                          }
                          placeholder="Ex: Fornecedor"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasBusinessRule"
                  checked={form.hasBusinessRule}
                  onCheckedChange={(c) =>
                    setForm({ ...form, hasBusinessRule: c === true })
                  }
                />
                <label
                  htmlFor="hasBusinessRule"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Possui regra de negócio definida
                </label>
              </div>

              {form.hasBusinessRule && (
                <div className="ml-6 space-y-2 pt-2 border-l-2 border-primary/20 pl-4">
                  <Label className="text-sm">Conceito / Racional da Regra</Label>
                  <Input
                    value={form.businessRuleRationale}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        businessRuleRationale: e.target.value,
                      })
                    }
                    placeholder="Descreva o conceito e a lógica da regra de negócio..."
                  />
                </div>
              )}

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm">Campo Fórmula</Label>
                <Select
                  value={form.formula}
                  onValueChange={(value) => setForm({ ...form, formula: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.formula === "sim"
                    ? "Campo será excluído do JSON. Observação preenchida com 'fórmula'."
                    : form.formula === "suporte"
                    ? "Campo será excluído do JSON (campo de suporte)."
                    : "Campo será incluído normalmente no JSON."}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Observação (opcional)</Label>
              <Input
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Comentários adicionais sobre o campo..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>{"Salvar Validação"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getClassificationColor(classification: string) {
  switch (classification) {
    case "reliable":
      return "default";
    case "attention":
      return "secondary";
    case "critical":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusColor(status: string) {
  return status === "conflict" ? "destructive" : "outline";
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    conflict: "Conflito",
  };
  return map[status] || status;
}

function translateClassification(classification: string) {
  const map: Record<string, string> = {
    pending: "Pendente",
    reliable: "Confiável",
    attention: "Atenção",
    critical: "Crítico",
  };
  return map[classification] || classification;
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
  const [editingField, setEditingField] = useState<PreviewField | null>(null);
  const [validatingField, setValidatingField] = useState<PreviewField | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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
    (validation: PreviewField["validation"]) => {
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

  const generateValidatedJson = async () => {
    setIsGenerating(true);
    try {
      const validatedFields = fields.map((f) => ({
        ...f,
        validation: f.validation,
      }));
      onGenerateValidatedJson(validatedFields);
      toast({
        title: "JSON Validado Gerado",
        description: "Validações aplicadas ao JSON. Pronto para importar.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar JSON validado.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const importDictionary = async () => {
    setIsImporting(true);
    try {
      const includedFields = fields.filter((f) => f.included);
      // Filter out formula fields (sim/suporte)
      const validFields = includedFields.filter((f) => f.validation?.formula !== "sim" && f.validation?.formula !== "suporte");
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
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível importar.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

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
                      className={`cursor-pointer hover:bg-muted/50 ${!field.included ? "opacity-40 bg-muted/50" : ""}`}
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
                          variant={getStatusColor(
                            field.validation ? "approved" : "pending",
                          )}
                        >
                          {translateStatus(
                            field.validation ? "approved" : "pending",
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getClassificationColor(
                            field.validation ? "reliable" : "pending",
                          )}
                        >
                          {translateClassification(
                            field.validation ? "reliable" : "pending",
                          )}
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
            onClick={generateValidatedJson}
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
            onClick={importDictionary}
            className="gap-2"
            variant="default"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {" "}
                <Download className="h-4 w-4" /> Importar Dicionário
              </>
            )}
          </Button>
        </SheetFooter>

        {editingField && (
          <EditFieldDialog
            field={editingField}
            onClose={() => setEditingField(null)}
            onSave={handleEditSave}
          />
        )}

        {validatingField && (
          <ValidationPanel
            field={validatingField}
            onClose={() => setValidatingField(null)}
            onSave={handleValidationSave}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
