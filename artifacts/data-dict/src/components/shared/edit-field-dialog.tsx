"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditFieldDialogProps {
  field: {
    campoOrigem: string;
    descricao: string;
    origem: string;
    periodicidade: string;
    campoTecnico: string;
    tipoDado: string;
    chave: boolean;
    included?: boolean;
  };
  onClose: () => void;
  onSave: (data: {
    campoOrigem: string;
    descricao: string;
    origem: string;
    periodicidade: string;
    campoTecnico: string;
    tipoDado: string;
    chave: boolean;
    included?: boolean;
  }) => void;
  showIncludedField?: boolean;
}

export function EditFieldDialog({
  field,
  onClose,
  onSave,
  showIncludedField = false,
}: EditFieldDialogProps) {
  const [form, setForm] = useState({
    campoOrigem: field.campoOrigem ?? "",
    descricao: field.descricao ?? "",
    origem: field.origem ?? "",
    periodicidade: field.periodicidade ?? "",
    campoTecnico: field.campoTecnico ?? "",
    tipoDado: field.tipoDado ?? "",
    chave: field.chave ?? false,
    included: field.included ?? true,
  });

  function handleSave() {
    onSave(form);
    onClose();
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
          {showIncludedField && (
            <div className="space-y-1.5">
              <Label>Incluir no JSON</Label>
              <Select
                value={form.included ? "sim" : "nao"}
                onValueChange={(v) =>
                  setForm({ ...form, included: v === "sim" })
                }
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
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}