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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Pencil, ChevronDown, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { traduzirStatus, traduzirClassificacao, getApiBase } from "@/lib/utils";

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
  const { toast } = useToast();

  const { isFetching: isExporting } = useExportDictionary(id, {
    query: { enabled: false, queryKey: ["export", id] },
  });
  const [isExportingExtra, setIsExportingExtra] = useState(false);

  const handleExport = async (format?: "csv") => {
    const url = `${getApiBase()}/api/dictionaries/${id}/export${format === "csv" ? "?format=csv" : ""}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      triggerDownload(
        data.content,
        data.filename,
        format === "csv" ? "text/csv" : "application/json",
      );
    } catch {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const handleExportExtra = async (type: "ddl" | "data-contract") => {
    setIsExportingExtra(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/dictionaries/${id}/export/${type}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      triggerDownload(
        data.content,
        data.filename,
        type === "ddl" ? "text/plain" : "application/json",
      );
    } catch {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsExportingExtra(false);
    }
  };

  function triggerDownload(
    content: string,
    filename: string,
    mimeType: string,
  ) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

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
                <TableRow
                  key={field.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedField(field)}
                >
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
                  <TableCell>{field.periodicidade}</TableCell>
                  <TableCell>{field.chave ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        field.summary?.statusFinal === "conflict"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {traduzirStatus(field.summary?.statusFinal || "pending")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        field.summary?.classification === "reliable"
                          ? "default"
                          : field.summary?.classification === "attention"
                            ? "secondary"
                            : field.summary?.classification === "critical"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {traduzirClassificacao(
                        field.summary?.classification || "pending",
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>{field.summary?.score ?? "-"}</TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedField(field)}
                      >
                        Validar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Editar campo"
                        onClick={() => setEditingField(field)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {selectedField && (
        <ValidationPanel
          field={selectedField}
          onClose={() => setSelectedField(null)}
          dictId={id}
        />
      )}

      {editingField && (
        <EditFieldDialog
          field={editingField}
          dictId={id}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  );
}

function EditFieldDialog({
  field,
  dictId,
  onClose,
}: {
  field: FieldWithSummary;
  dictId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateField = useUpdateField();

  const [form, setForm] = useState({
    campoOrigem: field.campoOrigem ?? "",
    descricao: field.descricao ?? "",
    origem: field.origem ?? "",
    periodicidade: field.periodicidade ?? "",
    campoTecnico: field.campoTecnico ?? "",
    tipoDado: field.tipoDado ?? "",
    chave: field.chave ?? false,
  });

  function handleSave() {
    updateField.mutate(
      { id: field.id, data: form },
      {
        onSuccess: () => {
          toast({
            title: "Campo atualizado",
            description: "As informações do campo foram salvas.",
          });
          queryClient.invalidateQueries({
            queryKey: getGetDictionaryQueryKey(dictId),
          });
          onClose();
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateField.isPending}>
            {updateField.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValidationPanel({
  field,
  onClose,
  dictId,
}: {
  field: FieldWithSummary;
  onClose: () => void;
  dictId: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const submitValidation = useSubmitValidation();
  const updateField = useUpdateField();

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

  const [form, setForm] = useState({
    validatorName: "",
    used: false,
    required: false,
    correctName: false,
    correctOrigin: false,
    hasBusinessRule: false,
    originType: "" as ValidationInputOriginType,
    originDetail: "",
    businessRuleRationale: "",
    formula: "nao",
    comment: "",
  });

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

    // Update the formula field separately (cast to proper enum type)
    const formulaValue = formula as "nao" | "sim" | "suporte";
    updateField.mutate(
      { id: field.id, data: { formula: formulaValue } },
      {
        onError: () => {
          toast({
            title: "Erro ao atualizar campo",
            description: "Não foi possível salvar o tipo de fórmula.",
            variant: "destructive",
          });
        },
      }
    );

    submitValidation.mutate(
      { id: field.id, data: { ...validationData, validatorName: name, comment } },
      {
        onSuccess: () => {
          toast({
            title: "Validação registrada",
            description: "Sua validação foi salva com sucesso.",
          });
          queryClient.invalidateQueries({
            queryKey: getGetDictionaryQueryKey(dictId),
          });
          onClose();
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

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Validar Campo: {field.campoOrigem}</SheetTitle>
        </SheetHeader>
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
                    onValueChange={(value: ValidationInputOriginType) =>
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
                  {form.originType === "interno" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Plataforma</Label>
                      <Select
                        value={form.originDetail}
                        onValueChange={(value) =>
                          setForm({ ...form, originDetail: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAP - M303M">SAP - M303M</SelectItem>
                          <SelectItem value="SAP - Outro relatório">
                            SAP - Outro relatório
                          </SelectItem>
                          <SelectItem value="Outra plataforma local">
                            Outra plataforma local
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {form.originType === "externo" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Origem</Label>
                      <Select
                        value={form.originDetail}
                        onValueChange={(value) =>
                          setForm({ ...form, originDetail: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                          <SelectItem value="Outra origem externa">
                            Outra origem externa
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                <div className="ml-6 space-y-2 pt-2 border-t">
                  <Label className="text-sm">
                    Conceito / Racional da Regra de Negócio
                  </Label>
                  <Input
                    value={form.businessRuleRationale}
                    onChange={(e) =>
                      setForm({ ...form, businessRuleRationale: e.target.value })
                    }
                    placeholder="Explique o conceito e a lógica da regra de negócio..."
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

              <div className="space-y-2 pt-4 border-t">
              <Label>Observação (opcional)</Label>
              <Input
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Comentários adicionais sobre o campo..."
              />
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleSubmit}
              disabled={submitValidation.isPending}
            >
              {submitValidation.isPending
                ? "Enviando..."
                : "Registrar Validação"}
            </Button>
          </div>
        </div>
      </div>
      </SheetContent>
    </Sheet>
  );
}
