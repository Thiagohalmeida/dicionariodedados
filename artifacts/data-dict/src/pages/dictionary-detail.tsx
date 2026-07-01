import React, { useState } from "react";
import { useGetDictionary, useSubmitValidation, getGetDictionaryQueryKey, useExportDictionary } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download } from "lucide-react";

export default function DictionaryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: dict, isLoading } = useGetDictionary(id, { query: { enabled: !!id, queryKey: getGetDictionaryQueryKey(id) } });
  const [selectedField, setSelectedField] = useState<any>(null);
  
  const { refetch: exportDict, isFetching: isExporting } = useExportDictionary(id, { query: { enabled: false, queryKey: ['export', id] } });

  const handleExport = async () => {
    const result = await exportDict();
    if (result.data) {
      const blob = new Blob([result.data.content], { type: result.data.format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };
  
  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!dict) return <div className="p-8">Not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dict.tabela}</h1>
          <p className="text-muted-foreground">{dict.processo} / {dict.categoria}</p>
        </div>
        <div className="flex gap-4 items-center">
          <Badge variant="outline" className="text-lg py-1 px-3">{dict.status}</Badge>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Technical Field</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Periodicity</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dict.fields.map((field) => (
                <TableRow key={field.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedField(field)}>
                  <TableCell className="font-medium">{field.campoOrigem}</TableCell>
                  <TableCell>{field.campoTecnico}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={field.descricao}>{field.descricao}</TableCell>
                  <TableCell>{field.tipoDado}</TableCell>
                  <TableCell>{field.periodicidade}</TableCell>
                  <TableCell>{field.chave ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{field.summary?.statusFinal || "pending"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      field.summary?.classification === 'reliable' ? 'default' :
                      field.summary?.classification === 'attention' ? 'secondary' :
                      field.summary?.classification === 'critical' ? 'destructive' : 'outline'
                    }>
                      {field.summary?.classification || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>{field.summary?.score ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Validate</Button>
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
    </div>
  );
}

function ValidationPanel({ field, onClose, dictId }: { field: any, onClose: () => void, dictId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const submitValidation = useSubmitValidation();
  
  const [form, setForm] = useState({
    validatorName: "",
    used: false,
    required: false,
    correctName: false,
    correctOrigin: false,
    hasBusinessRule: false,
    comment: ""
  });

  const handleSubmit = () => {
    if (!form.validatorName) {
      toast({ title: "Error", description: "Validator name is required", variant: "destructive" });
      return;
    }
    
    submitValidation.mutate({ id: field.id, data: form }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Validation submitted" });
        queryClient.invalidateQueries({ queryKey: getGetDictionaryQueryKey(dictId) });
        onClose();
      }
    });
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Validate Field: {field.campoOrigem}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Technical Name</span>
              <span className="font-mono">{field.campoTecnico}</span>
              <span className="text-muted-foreground">Description</span>
              <span>{field.descricao}</span>
              <span className="text-muted-foreground">Type</span>
              <span>{field.tipoDado}</span>
              <span className="text-muted-foreground">Origin</span>
              <span>{field.origem}</span>
              <span className="text-muted-foreground">Periodicity</span>
              <span>{field.periodicidade}</span>
              <span className="text-muted-foreground">Primary Key</span>
              <span>{field.chave ? "Yes" : "No"}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Validator Name</Label>
              <Input value={form.validatorName} onChange={(e) => setForm({...form, validatorName: e.target.value})} placeholder="Your name" />
            </div>
            
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Validation Criteria (20 pts each)</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="used" checked={form.used} onCheckedChange={(c) => setForm({...form, used: c === true})} />
                <label htmlFor="used" className="text-sm font-medium leading-none">Field is used (Usado)</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="required" checked={form.required} onCheckedChange={(c) => setForm({...form, required: c === true})} />
                <label htmlFor="required" className="text-sm font-medium leading-none">Field is required (Obrigatório)</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="correctName" checked={form.correctName} onCheckedChange={(c) => setForm({...form, correctName: c === true})} />
                <label htmlFor="correctName" className="text-sm font-medium leading-none">Correct name (Nome Correto)</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="correctOrigin" checked={form.correctOrigin} onCheckedChange={(c) => setForm({...form, correctOrigin: c === true})} />
                <label htmlFor="correctOrigin" className="text-sm font-medium leading-none">Correct origin (Origem Correta)</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="hasBusinessRule" checked={form.hasBusinessRule} onCheckedChange={(c) => setForm({...form, hasBusinessRule: c === true})} />
                <label htmlFor="hasBusinessRule" className="text-sm font-medium leading-none">Has business rule (Tem Regra de Negócio)</label>
              </div>
            </div>
            
            <div className="space-y-2 pt-4 border-t">
              <Label>Comment (optional)</Label>
              <Input value={form.comment} onChange={(e) => setForm({...form, comment: e.target.value})} />
            </div>
            
            <Button className="w-full mt-4" onClick={handleSubmit} disabled={submitValidation.isPending}>
              {submitValidation.isPending ? "Submitting..." : "Submit Validation"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
