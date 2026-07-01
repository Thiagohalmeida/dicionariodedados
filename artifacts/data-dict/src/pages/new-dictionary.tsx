import React, { useState } from "react";
import { useImportDictionary } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

export default function NewDictionary() {
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Dicionário de Dados</h1>
        <p className="text-muted-foreground">Cole o JSON do seu dicionário para iniciar a validação dos campos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entrada JSON</CardTitle>
          <CardDescription>
            O JSON deve conter os campos: <code className="font-mono text-xs">processo</code>, <code className="font-mono text-xs">categoria</code>, <code className="font-mono text-xs">tabela</code> e o array <code className="font-mono text-xs">campos</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
