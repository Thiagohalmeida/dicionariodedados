import React from "react";
import { useListDictionaries } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function traduzirStatus(status: string) {
  const map: Record<string, string> = {
    pending: "Pendente",
    in_review: "Em Revisão",
    validated: "Validado",
  };
  return map[status] ?? status;
}

export default function DictionariesList() {
  const { data, isLoading } = useListDictionaries();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dicionários...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dicionários de Dados</h1>
          <p className="text-muted-foreground">Gerencie e valide seus dicionários de dados.</p>
        </div>
        <Button asChild>
          <Link href="/dictionaries/new">
            <Plus className="mr-2 h-4 w-4" /> Importar Dicionário
          </Link>
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tabela</TableHead>
              <TableHead>Processo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Pontuação Média</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((dict) => {
              const progress = dict.totalFields > 0 ? (dict.approvedFields / dict.totalFields) * 100 : 0;
              return (
                <TableRow key={dict.id}>
                  <TableCell className="font-medium">{dict.tabela}</TableCell>
                  <TableCell>{dict.processo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{traduzirStatus(dict.status)}</Badge>
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{Math.round(progress)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {dict.avgScore ? dict.avgScore.toFixed(1) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dictionaries/${dict.id}`}>Validar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!data || data.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhum dicionário encontrado. Importe um para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
