import React, { useState, useRef } from "react";
import { useImportDictionary } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileJson, Upload, CheckCircle2, Info } from "lucide-react";

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
      importMutation.mutate({ data: parsed }, {
        onSuccess: (dict) => {
          toast({ title: "Importação concluída", description: "Dicionário importado com sucesso." });
          setLocation(`/dictionaries/${dict.id}`);
        },
        onError: () => {
          toast({ title: "Erro na importação", description: "Verifique o formato do JSON e tente novamente.", variant: "destructive" });
        }
      });
    } catch {
      toast({ title: "JSON inválido", description: "O conteúdo inserido não é um JSON válido.", variant: "destructive" });
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
        <Button variant="ghost" size="sm" onClick={() => setJsonInput(EXEMPLO_JSON)}>
          Usar exemplo
        </Button>
        <Button disabled={importMutation.isPending || !jsonInput.trim()} onClick={handleImport}>
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

function ExcelImportTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<ExcelMeta | null>(null);

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
  }

  async function handleUpload() {
    if (!file) { toast({ title: "Selecione um arquivo Excel", variant: "destructive" }); return; }
    if (!form.processo.trim() || !form.categoria.trim()) {
      toast({ title: "Campos obrigatórios", description: "Informe processo e categoria antes de continuar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("processo", form.processo.trim());
      fd.append("categoria", form.categoria.trim());
      if (form.tabela.trim()) fd.append("tabela", form.tabela.trim());
      if (form.aba_preferencial.trim()) fd.append("aba_preferencial", form.aba_preferencial.trim());

      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${basePath}/api/dictionaries/from-excel`, { method: "POST", body: fd });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Erro no servidor");
      }

      const data = await res.json();
      setMeta(data.meta);

      toast({
        title: "Excel processado com sucesso",
        description: `${data.meta.total_colunas_raw} colunas lidas, ${data.meta.colunas_removidas.length} removidas por ruído.`,
      });

      setTimeout(() => setLocation(`/dictionaries/${data.id}`), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivo";
      toast({ title: "Erro na ingestão", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Processo <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Ex: rfq, contrato, compra"
            value={form.processo}
            onChange={(e) => setForm({ ...form, processo: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Ex: medicamentos, laboratorio"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nome da Tabela <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input
            placeholder="Gerado automaticamente se vazio"
            value={form.tabela}
            onChange={(e) => setForm({ ...form, tabela: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Aba Preferencial <span className="text-muted-foreground text-xs">(opcional)</span></Label>
          <Input
            placeholder="Detectada automaticamente se vazia"
            value={form.aba_preferencial}
            onChange={(e) => setForm({ ...form, aba_preferencial: e.target.value })}
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
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — clique para trocar</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Clique para selecionar um arquivo Excel</p>
            <p className="text-xs text-muted-foreground">.xlsx, .xls, .xlsm — máx. 20 MB</p>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex gap-2 text-sm text-blue-700">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          O sistema detecta automaticamente a aba mais relevante, remove colunas de ruído (%, variação, projeções)
          e infere tipos de dados. Colunas com <code className="font-mono text-xs">%</code>, <code className="font-mono text-xs">∆</code> ou
          {" "}<code className="font-mono text-xs">variação</code> são filtradas automaticamente.
        </div>
      </div>

      {meta && (
        <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Processamento concluído
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Aba utilizada</span>
            <span className="font-medium">{meta.aba_utilizada}</span>
            <span className="text-muted-foreground">Colunas lidas</span>
            <span>{meta.total_colunas_raw}</span>
            {meta.colunas_removidas.length > 0 && (
              <>
                <span className="text-muted-foreground">Colunas removidas</span>
                <span className="text-amber-600">{meta.colunas_removidas.join(", ")}</span>
              </>
            )}
            {meta.abas_ignoradas.length > 0 && (
              <>
                <span className="text-muted-foreground">Abas ignoradas</span>
                <span className="text-muted-foreground">{meta.abas_ignoradas.map((a) => a.aba).join(", ")}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleUpload} disabled={loading || !file} className="gap-2">
          {loading ? (
            <>Processando Excel...</>
          ) : (
            <><FileSpreadsheet className="h-4 w-4" /> Processar e Importar</>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function NewDictionary() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Dicionário de Dados</h1>
        <p className="text-muted-foreground">Importe um dicionário a partir de JSON estruturado ou faça upload de um arquivo Excel.</p>
      </div>

      <Tabs defaultValue="excel">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="excel" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">Novo</Badge>
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-2">
            <FileJson className="h-4 w-4" /> JSON
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <TabsContent value="excel" className="m-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                Ingestão de Excel
              </CardTitle>
              <CardDescription>
                Informe o contexto do processo e faça upload da planilha. O sistema detecta a aba correta, infere tipos e gera o dicionário automaticamente.
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
                Cole o JSON do seu dicionário seguindo o formato padrão: <code className="font-mono text-xs">processo</code>, <code className="font-mono text-xs">categoria</code>, <code className="font-mono text-xs">tabela</code> e array <code className="font-mono text-xs">campos</code>.
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
