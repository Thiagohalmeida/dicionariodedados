import React, { useState } from "react";
import { useGetCriticalFields } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function CriticalFields() {
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const { data: pageData, isLoading } = useGetCriticalFields({
    page,
    limit: LIMIT,
  });

  if (isLoading)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Carregando campos críticos...
      </div>
    );

  const fields = pageData?.data ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-destructive">
        <AlertTriangle className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Campos Críticos
          </h1>
          <p className="text-muted-foreground">
            Campos com pontuação de validação abaixo de 60 — requerem atenção
            imediata.
          </p>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campo de Origem</TableHead>
              <TableHead>Dicionário</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Pontuação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell className="font-medium text-destructive">
                  {field.campoOrigem}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dictionaries/${field.dictionaryId}`}
                    className="text-primary hover:underline"
                  >
                    #{field.dictionaryId}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {field.descricao}
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    {field.summary?.score ?? "-"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dictionaries/${field.dictionaryId}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Ver Dicionário
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhum campo crítico encontrado. Ótimo trabalho!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "Nenhum campo crítico"
            : `Exibindo ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} de ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="px-2">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
