"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VALIDATOR_OPTIONS,
  INTERNAL_PLATFORM_OPTIONS,
  EXTERNAL_ORIGIN_OPTIONS,
  type ValidationFormData,
} from "@/hooks/use-validation-form";
import type { ValidationInputOriginType } from "@workspace/api-client-react";

interface ValidationFormFieldsProps {
  form: ValidationFormData;
  setForm: React.Dispatch<React.SetStateAction<ValidationFormData>>;
}

export function ValidationFormFields({ form, setForm }: ValidationFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Responsável pela Validação</Label>
        <Select
          value={form.validatorName}
          onValueChange={(value) => setForm({ ...form, validatorName: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o validador" />
          </SelectTrigger>
          <SelectContent>
            {VALIDATOR_OPTIONS.map((validator) => (
              <SelectItem key={validator} value={validator}>
                {validator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <Label className="text-base font-semibold">
          Critérios de Validação (20 pts cada)
        </Label>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="used"
            checked={form.used}
            onCheckedChange={(c) => setForm({ ...form, used: c === true })}
          />
          <label
            htmlFor="used"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Campo utilizado no processo
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="required"
            checked={form.required}
            onCheckedChange={(c) => setForm({ ...form, required: c === true })}
          />
          <label
            htmlFor="required"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Campo obrigatório
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="correctName"
            checked={form.correctName}
            onCheckedChange={(c) => setForm({ ...form, correctName: c === true })}
          />
          <label
            htmlFor="correctName"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Nome técnico correto
          </label>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm font-medium">Origem</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="correctOrigin"
              checked={form.correctOrigin}
              onCheckedChange={(c) =>
                setForm({ ...form, correctOrigin: c === true })
              }
            />
            <label
              htmlFor="correctOrigin"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Origem
            </label>
          </div>
          <div className="ml-6 space-y-2">
            <Label className="text-sm">Fonte</Label>
            <Select
              value={form.originType}
              onValueChange={(value: ValidationInputOriginType) =>
                setForm({ ...form, originType: value, originDetail: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>
            {form.originType === "interno" && (
              <div className="space-y-2">
                <Label className="text-sm">Plataforma</Label>
                <Select
                  value={form.originDetail}
                  onValueChange={(value) =>
                    setForm({ ...form, originDetail: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERNAL_PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.originType === "externo" && (
              <div className="space-y-2">
                <Label className="text-sm">Origem</Label>
                <Select
                  value={form.originDetail}
                  onValueChange={(value) =>
                    setForm({ ...form, originDetail: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXTERNAL_ORIGIN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasBusinessRule"
            checked={form.hasBusinessRule}
            onCheckedChange={(c) =>
              setForm({ ...form, hasBusinessRule: c === true })
            }
          />
          <label
            htmlFor="hasBusinessRule"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Possui regra de negócio definida
          </label>
        </div>
        {form.hasBusinessRule && (
          <div className="ml-6 space-y-2 pt-2 border-t">
            <Label className="text-sm">Conceito / Racional da Regra de Negócio</Label>
            <Input
              value={form.businessRuleRationale}
              onChange={(e) =>
                setForm({ ...form, businessRuleRationale: e.target.value })
              }
              placeholder="Explique o conceito e a lógica da regra de negócio..."
            />
          </div>
        )}

<div className="space-y-2 pt-2 border-t">
          <Label className="text-sm">Campo Fórmula</Label>
          <Select
            value={form.formula}
            onValueChange={(value) =>
              setForm({ ...form, formula: value as "nao" | "sim" | "suporte" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nao">Não</SelectItem>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="suporte">Suporte</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {form.formula === "sim"
              ? "Campo será excluído do JSON. Observação preenchida com 'fórmula'."
              : form.formula === "suporte"
              ? "Campo será excluído do JSON (campo de suporte)."
              : "Campo será incluído normalmente no JSON."}
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <Label>Observação (opcional)</Label>
        <Input
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          placeholder="Comentários adicionais sobre o campo..."
        />
      </div>
    </div>
  );
}