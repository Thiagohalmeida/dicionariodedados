import React, { useState, useRef } from "react";
import { useImportDictionary, useUpdateField, useSubmitValidation, useGetDictionary } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  FileJson,
  Upload,
  CheckCircle2,
  Info,
  Save,
  Download,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import PreviewValidationSheet from "@/components/preview-validation-sheet";
import { useQueryClient } from "@tanstack/react-query";

const EXEMPLO_JSON = `{
  "processo": "RFQ",
  "categoria": "Medicamentos",
  "tabela": "rfp_item",
  "campos": [
    {
      "campo_origem": "COD Hapvida",
      "descricao": "Código interno do material",
      "origem": "SAP",
      "periodicidade": "eventual",
      "campo_tecnico": "cod_hapvida",
      "tipo_dado": "varchar",
      "chave": true
    }
  ]
}`;

function JsonImportTab() {
  const [jsonInput, setJsonInput] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const importMutation = useImportDictionary();

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      importMutation.mutate(
        { data: parsed },
        {
          onSuccess: (dict) => {
            toast({
              title: "Importação concluída",
              description: "Dicionário importado com sucesso.",
            });
            setLocation(`/dictionaries/${dict.id}`);
          },
          onError: (err: unknown) => {
            const msg =
              err instanceof Error
                ? err.message
                : "Verifique o formato do JSON e tente novamente.";
            toast({
              title: "Erro na importação",
              description: msg,
              variant: "destructive",
            });
          },
        },
      );
    } catch {
      toast({
        title: "JSON inválido",
        description: "O conteúdo inserido não é um JSON válido.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        className="font-mono text-sm min-h-[300px]"
        placeholder={EXEMPLO_JSON}
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      />
      <div className="flex justify-between items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setJsonInput(EXEMPLO_JSON)}
        >
          Usar exemplo
        </Button>
        <Button
          disabled={importMutation.isPending || !jsonInput.trim()}
          onClick={handleImport}
        >
          {importMutation.isPending ? "Importando..." : "Importar Dicionário"}
        </Button>
      </div>
    </div>
  );
}

interface ExcelMeta {
  arquivo: string;
  aba_utilizada: string;
  abas_ignoradas: { aba: string; motivo: string }[];
  total_colunas_raw: number;
  colunas_removidas: string[];
}

interface ResolvedMeta {
  processo: string;
  categoria: string;
  tabela: string;
}

function extractGeneratedDictionary(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.json_gerado,
    record.jsonGerado,
    record.generatedJson,
    record.dictionary,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) return candidate;
  }

  if (record.payload && typeof record.payload === "object") {
    const nested = record.payload as Record<string, unknown>;
    const nestedCandidates = [
      nested.json_gerado,
      nested.jsonGerado,
      nested.generatedJson,
      nested.dictionary,
    ];
    for (const candidate of nestedCandidates) {
      if (candidate !== undefined && candidate !== null) return candidate;
    }
  }

  if ("processo" in record || "categoria" in record || "campos" in record) {
    return payload;
  }

  return null;
}

function ExcelImportTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportDictionary();
  const updateFieldMutation = useUpdateField();
  const submitValidationMutation = useSubmitValidation();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<ExcelMeta | null>(null);
  const [previewJson, setPreviewJson] = useState("");
  const [previewFields, setPreviewFields] = useState<
    Array<{
      id: number;
      campoOrigem: string;
      campoTecnico: string;
      descricao: string;
      tipoDado: string;
      origem: string;
      periodicidade: string;
      chave: boolean;
      included: boolean;
      validation?: any;
      excluded?: boolean;
      customInternalPlatform?: string;
    }>
  >([]);
  const [resolvedMeta, setResolvedMeta] = useState<{
    processo: string;
    categoria: string;
    tabela: string;
  } | null>(null);

  const [showValidationSheet, setShowValidationSheet] = useState(false);

  const [form, setForm] = useState({
    processo: "",
    categoria: "",
    tabela: "",
    aba_preferencial: "",
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setMeta(null);
    setPreviewJson("");
  }

  async function handlePreview() {
    if (!file) {
      toast({ title: "Selecione um arquivo Excel", variant: "destructive" });
      return;
    }
    if (!form.processo.trim() || !form.categoria.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe processo e categoria antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("processo", form.processo.trim());
      fd.append("categoria", form.categoria.trim());
      if (form.tabela.trim()) fd.append("tabela", form.tabela.trim());
      if (form.aba_preferencial.trim())
        fd.append("aba_preferencial", form.aba_preferencial.trim());

      const basePath = getApiBase();
      const res = await fetch(`${basePath}/api/excel/preview`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Erro no servidor");
      }

      const data = await res.json();
      const generated = extractGeneratedDictionary(data);
      if (!generated) {
        throw new Error(
          "O endpoint não retornou um JSON de dicionário válido para pré-visualização.",
        );
      }

      const meta = (data as { meta?: ExcelMeta }).meta ?? null;
      const previewText =
        typeof generated === "string"
          ? generated
          : JSON.stringify(generated, null, 2);

      // Parse fields for validation sheet
      const parsed =
        typeof generated === "string" ? JSON.parse(generated) : generated;
      const fields = (parsed.campos || []).map((c: any, idx: number) => ({
        id: idx + 1,
        campoOrigem: c.campo_origem,
        campoTecnico: c.campo_tecnico,
        descricao: c.descricao,
        tipoDado: c.tipo_dado,
        origem: c.origem,
        periodicidade: c.periodicidade,
        chave: c.chave,
        included: true,
      }));

      // Use resolved values from backend (processo, categoria, tabela)
      // If backend didn't return them, fall back to form values
      setResolvedMeta({
        processo: parsed.processo ?? form.processo,
        categoria: parsed.categoria ?? form.categoria,
        tabela: parsed.tabela ?? form.tabela,
      });

      setMeta(meta);
      setPreviewJson(previewText);
      setPreviewFields(fields);
      setShowValidationSheet(true);

      toast({
        title: "Preview gerado",
        description: `${meta?.total_colunas_raw ?? 0} colunas lidas, ${meta?.colunas_removidas?.length ?? 0} removidas por ruído.`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao processar arquivo";
      toast({
        title: "Erro na pré-visualização",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleImportPreview() {
    if (!previewJson.trim()) {
      toast({
        title: "Nenhum preview disponível",
        description: "Gere um preview antes de importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsed = JSON.parse(previewJson);
      importMutation.mutate(
        { data: parsed },
        {
          onSuccess: (dict) => {
            toast({
              title: "Importação concluída",
              description: "O dicionário foi criado com sucesso.",
            });
            setLocation(`/dictionaries/${dict.id}`);
          },
          onError: (err: unknown) => {
            const msg =
              err instanceof Error
                ? err.message
                : "Verifique o JSON gerado e tente novamente.";
            toast({
              title: "Erro na importação",
              description: msg,
              variant: "destructive",
            });
          },
        },
      );
    } catch {
      toast({
        title: "JSON inválido",
        description:
          "O preview contém JSON inválido. Corrija o conteúdo e tente novamente.",
        variant: "destructive",
      });
    }
  }

  const handleGenerateValidatedJson = (
    validatedFields: typeof previewFields,
  ) => {
    // Update previewJson with validated fields
    const parsed = JSON.parse(previewJson);
    parsed.campos = validatedFields
      .filter((f) => f.included)
      .map((f) => ({
        campo_origem: f.campoOrigem,
        campo_tecnico: f.campoTecnico,
        descricao: f.descricao,
        tipo_dado: f.tipoDado,
        origem: f.origem,
        periodicidade: f.periodicidade,
        chave: f.chave,
      }));
    setPreviewJson(JSON.stringify(parsed, null, 2));
    toast({
      title: "JSON atualizado",
      description: "Validações aplicadas ao JSON editável.",
    });
  };

const handleImportFromSheet = (json: any) => {
    importMutation.mutate(
      { data: json },
      {
        onSuccess: async (dict) => {
          toast({
            title: "Dicionário criado",
            description: "Salvando validações e configurações dos campos...",
          });

          try {
            // Fetch the dictionary with fields to get the real field IDs
            const response = await fetch(`${getApiBase()}/api/dictionaries/${dict.id}`);
            if (!response.ok) throw new Error("Falha ao buscar dicionário");
            const dictWithFields = await response.json();

            // Build a map of campoTecnico -> field ID for the imported dictionary
            const fieldMap = new Map<string, number>();
            for (const f of dictWithFields.fields) {
              fieldMap.set(f.campoTecnico, f.id);
            }

            // Update fields: excluded status and customInternalPlatform
            for (const previewField of previewFields) {
              const fieldId = fieldMap.get(previewField.campoTecnico);
              if (!fieldId) continue;

              const updates: Record<string, any> = {};

              if (previewField.excluded !== undefined) {
                updates.excluded = previewField.excluded;
              }
              if (previewField.customInternalPlatform !== undefined) {
                updates.customInternalPlatform = previewField.customInternalPlatform;
              }

              if (Object.keys(updates).length > 0) {
                await new Promise<void>((resolve, reject) => {
                  updateFieldMutation.mutate(
                    { id: fieldId, data: updates },
                    { onSuccess: () => resolve(), onError: reject }
                  );
                });
              }

              // Save validation if exists
              if (previewField.validation && previewField.validation.validatorName) {
                const v = previewField.validation;
                await new Promise<void>((resolve, reject) => {
                  submitValidationMutation.mutate(
                    {
                      id: fieldId,
                      data: {
                        validatorName: v.validatorName,
                        used: v.used ?? false,
                        required: v.required ?? false,
                        correctName: v.correctName ?? false,
                        correctOrigin: v.correctOrigin ?? false,
                        hasBusinessRule: v.hasBusinessRule ?? false,
                        originType: v.originType ?? "",
                        originDetail: v.originDetail ?? "",
                        businessRuleRationale: v.businessRuleRationale ?? "",
                        formula: v.formula ?? "nao",
                        comment: v.comment ?? "",
                      },
                    },
                    { onSuccess: () => resolve(), onError: reject }
                  );
                });
              }
            }

            queryClient.invalidateQueries({ queryKey: ["dictionaries", dict.id] });

            toast({
              title: "Importação concluída",
              description: "Dicionário criado com validações e configurações salvas.",
            });
            setShowValidationSheet(false);
            setLocation(`/dictionaries/${dict.id}`);
          } catch (err) {
            toast({
              title: "Erro ao salvar validações",
              description: err instanceof Error ? err.message : "Erro desconhecido",
              variant: "destructive",
            });
            setLocation(`/dictionaries/${dict.id}`);
          }
        },
        onError: (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message
              : "Verifique o JSON e tente novamente.";
          toast({
            title: "Erro na importação",
            description: msg,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>
            Processo <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Ex: rfq, contrato, compra"
            value={form.processo}
            onChange={(e) => setForm({ ...form, processo: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Categoria <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Ex: medicamentos, laboratorio"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Nome da Tabela{" "}
            <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input
            placeholder="Gerado automaticamente se vazio"
            value={form.tabela}
            onChange={(e) => setForm({ ...form, tabela: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Aba Preferencial{" "}
            <span className="text-muted-foreground text-xs">(opcional)</span>
          </Label>
          <Input
            placeholder="Detectada automaticamente se vazia"
            value={form.aba_preferencial}
            onChange={(e) =>
              setForm({ ...form, aba_preferencial: e.target.value })
            }
          />
        </div>
      </div>

      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          className="hidden"
          onChange={handleFileChange}
        />
        {file ? (
          <div className="space-y-1">
            <FileSpreadsheet className="h-8 w-8 mx-auto text-emerald-500" />
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB — clique para trocar
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">
              Clique para selecionar um arquivo Excel
            </p>
            <p className="text-xs text-muted-foreground">
              .xlsx, .xls, .xlsm — máx. 20 MB
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex gap-2 text-sm text-blue-700">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          O sistema detecta automaticamente a aba mais relevante, remove colunas
          de ruído (%, variação, projeções) e infere tipos de dados. Colunas com{" "}
          <code className="font-mono text-xs">%</code>,{" "}
          <code className="font-mono text-xs">∆</code> ou{" "}
          <code className="font-mono text-xs">variação</code> são filtradas
          automaticamente.
        </div>
      </div>

      {meta && (
        <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Preview gerado com sucesso
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Aba utilizada</span>
            <span className="font-medium">{meta.aba_utilizada}</span>
            <span className="text-muted-foreground">Colunas lidas</span>
            <span>{meta.total_colunas_raw}</span>
            {meta.colunas_removidas.length > 0 && (
              <>
                <span className="text-muted-foreground">Colunas removidas</span>
                <span className="text-amber-600">
                  {meta.colunas_removidas.join(", ")}
                </span>
              </>
            )}
            {meta.abas_ignoradas.length > 0 && (
              <>
                <span className="text-muted-foreground">Abas ignoradas</span>
                <span className="text-muted-foreground">
                  {meta.abas_ignoradas.map((a) => a.aba).join(", ")}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {previewJson && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>JSON gerado (editável)</Label>
            <span className="text-xs text-muted-foreground">
              Edite antes de importar
            </span>
          </div>
          <Textarea
            className="font-mono text-sm min-h-[260px]"
            value={previewJson}
            onChange={(e) => setPreviewJson(e.target.value)}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={handlePreview}
          disabled={loading || !file}
          className="gap-2"
        >
          {loading ? (
            <>Processando Excel...</>
          ) : (
            <>
              <FileSpreadsheet className="h-4 w-4" /> Processar e Pré-visualizar
            </>
          )}
        </Button>
        <Button
          onClick={handleImportPreview}
          disabled={!previewJson.trim() || importMutation.isPending}
          variant="outline"
          className="gap-2"
        >
          {importMutation.isPending ? "Importando..." : "Importar JSON"}
        </Button>
      </div>

<PreviewValidationSheet
        open={showValidationSheet}
        onOpenChange={setShowValidationSheet}
        fields={previewFields}
        onGenerateValidatedJson={handleGenerateValidatedJson}
        onImportDictionary={handleImportFromSheet}
        resolvedMeta={resolvedMeta}
      />
    </div>
  );
}

export default function NewDictionary() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Importar Dicionário de Dados
        </h1>
        <p className="text-muted-foreground">
          Importe um dicionário a partir de JSON estruturado ou faça upload de
          um arquivo Excel.
        </p>
      </div>

      <Tabs defaultValue="excel">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="excel" className="gap-2 relative">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ingestão de Excel</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              Passo 1/2
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-2 relative">
            <FileJson className="h-4 w-4" />
            <span>Importação por JSON</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
              Direto
            </Badge>
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <TabsContent value="excel" className="m-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                Ingestão de Excel
                <Badge variant="default" className="text-[10px] px-2 py-0.5">
                  Novo
                </Badge>
              </CardTitle>
              <CardDescription>
                Upload de planilha → Preview JSON → Validação campo a campo →
                Importação.
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <Zap className="h-3 w-3" /> Fluxo guiado 2 passos
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExcelImportTab />
            </CardContent>
          </TabsContent>

          <TabsContent value="json" className="m-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-blue-500" />
                Importação por JSON
              </CardTitle>
              <CardDescription>
                Cole o JSON do dicionário seguindo o formato padrão:
                <code className="font-mono text-xs">processo</code>,
                <code className="font-mono text-xs">categoria</code>,
                <code className="font-mono text-xs">tabela</code> e array
                <code className="font-mono text-xs">campos</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JsonImportTab />
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
