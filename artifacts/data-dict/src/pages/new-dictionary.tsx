import React, { useState } from "react";
import { useImportDictionary } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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
          toast({ title: "Success", description: "Dictionary imported successfully" });
          setLocation(`/dictionaries/${dict.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to import dictionary. Check JSON format.", variant: "destructive" });
        }
      });
    } catch (e) {
      toast({ title: "Invalid JSON", description: "Please enter valid JSON data.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Dictionary</h1>
        <p className="text-muted-foreground">Paste your dictionary JSON to start validating.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>JSON Input</CardTitle>
          <CardDescription>Format requires processo, categoria, tabela, and an array of campos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            className="font-mono text-sm min-h-[300px]" 
            placeholder='{"processo": "...", "categoria": "...", "tabela": "...", "campos": []}'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button 
              disabled={importMutation.isPending || !jsonInput.trim()} 
              onClick={handleImport}
            >
              {importMutation.isPending ? "Importing..." : "Import Dictionary"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
