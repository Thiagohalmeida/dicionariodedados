"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useValidationForm } from "@/hooks/use-validation-form";
import { ValidationFormFields } from "@/components/shared/validation-form-fields";

interface ValidationPanelProps {
  field: {
    id: number;
    campoOrigem: string;
    campoTecnico: string;
    descricao: string;
    tipoDado: string;
    origem: string;
    periodicidade: string;
    chave: boolean;
    validation?: {
      validatorName?: string;
      used?: boolean;
      required?: boolean;
      correctName?: boolean;
      correctOrigin?: boolean;
      hasBusinessRule?: boolean;
      originType?: string;
      originDetail?: string;
      businessRuleRationale?: string;
      formula?: string;
      comment?: string;
    };
  };
  onClose: () => void;
  onSave: (validation: {
    validatorName: string;
    used: boolean;
    required: boolean;
    correctName: boolean;
    correctOrigin: boolean;
    hasBusinessRule: boolean;
    originType: string;
    originDetail: string;
    businessRuleRationale: string;
    formula: string;
    comment: string;
  }) => void;
}

export function ValidationPanel({
  field,
  onClose,
  onSave,
}: ValidationPanelProps) {
  const validation = field.validation ?? {};
  const { form, setForm, handleSubmit } = useValidationForm({
    initialData: {
      validatorName: validation.validatorName ?? "",
      used: validation.used ?? false,
      required: validation.required ?? false,
      correctName: validation.correctName ?? false,
      correctOrigin: validation.correctOrigin ?? false,
      hasBusinessRule: validation.hasBusinessRule ?? false,
      originType: (validation.originType as "interno" | "externo") ?? "",
      originDetail: validation.originDetail ?? "",
      businessRuleRationale: validation.businessRuleRationale ?? "",
      formula: (validation.formula as "nao" | "sim" | "suporte") ?? "nao",
      comment: validation.comment ?? "",
    },
    onSubmit: (data) => onSave(data),
    onClose,
  });

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Validar Campo: {field.campoOrigem}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Nome Técnico</span>
              <span className="font-mono">{field.campoTecnico}</span>
              <span className="text-muted-foreground">Descrição</span>
              <span>{field.descricao}</span>
              <span className="text-muted-foreground">Tipo de Dado</span>
              <span className="font-mono">{field.tipoDado}</span>
              <span className="text-muted-foreground">Origem</span>
              <span>{field.origem}</span>
              <span className="text-muted-foreground">Periodicidade</span>
              <span>{field.periodicidade}</span>
              <span className="text-muted-foreground">Chave Primária</span>
              <span>{field.chave ? "Sim" : "Não"}</span>
            </div>
          </div>

          <ValidationFormFields form={form} setForm={setForm} />

          <Button className="w-full mt-4" onClick={handleSubmit}>
            Registrar Validação
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}