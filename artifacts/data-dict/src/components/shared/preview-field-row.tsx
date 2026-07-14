"use client";

import React from "react";
import {
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { PreviewField } from "../preview-validation-sheet";

interface PreviewFieldRowProps {
  field: PreviewField;
  onEdit: (field: PreviewField) => void;
  onValidate: (field: PreviewField) => void;
  onToggleIncluded: (id: number, included: boolean) => void;
}

export const PreviewFieldRow = React.memo(function PreviewFieldRow({
  field,
  onEdit,
  onValidate,
  onToggleIncluded,
}: PreviewFieldRowProps) {
  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${
        !field.included ? "opacity-40 bg-muted/50" : ""
      }`}
    >
      <TableCell style={{ width: "40px" }}>
        <Checkbox
          checked={field.included}
          onCheckedChange={(checked) =>
            onToggleIncluded(field.id, checked as boolean)
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
          variant={field.validation ? "default" : "outline"}
        >
          {field.validation ? "Aprovado" : "Pendente"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={field.validation ? "default" : "outline"}
        >
          {field.validation ? "Confiável" : "Pendente"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(field)}
            title="Editar campo"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onValidate(field)}
          >
            {field.validation ? "Revalidar" : "Validar"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

PreviewFieldRow.displayName = "PreviewFieldRow";