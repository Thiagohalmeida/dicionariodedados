"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { traduzirStatus, traduzirClassificacao } from "@/lib/utils";

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

interface RawField {
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

interface FieldWithSummary extends RawField {
  summary: FieldSummary;
}

interface FieldTableRowProps {
  field: RawField;
  onSelect: (field: RawField) => void;
  onEdit: (field: RawField) => void;
}

export const FieldTableRow = React.memo(function FieldTableRow({
  field,
  onSelect,
  onEdit,
}: FieldTableRowProps) {
  return (
    <TableRow
      key={field.id}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSelect(field)}
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
          {traduzirClassificacao(field.summary?.classification || "pending")}
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
            onClick={() => onSelect(field)}
          >
            Validar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Editar campo"
            onClick={() => onEdit(field)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

FieldTableRow.displayName = "FieldTableRow";