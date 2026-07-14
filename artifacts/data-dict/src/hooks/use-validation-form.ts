"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ValidationInputOriginType } from "@workspace/api-client-react";

export interface ValidationFormData {
  validatorName: string;
  used: boolean;
  required: boolean;
  correctName: boolean;
  correctOrigin: boolean;
  hasBusinessRule: boolean;
  originType: ValidationInputOriginType;
  originDetail: string;
  businessRuleRationale: string;
  formula: "nao" | "sim" | "suporte";
  comment: string;
  excluded: boolean; // campo para excluir/desconsiderar sem validar
  customInternalPlatform?: string; // para digitar "Outro relatório" customizado
}

export function useValidationForm({
  initialData,
  onSubmit,
  onClose,
}: {
  initialData?: ValidationFormData;
  onSubmit: (data: ValidationFormData) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const [form, setForm] = useState<ValidationFormData>({
    validatorName: initialData?.validatorName ?? "",
    used: initialData?.used ?? false,
    required: initialData?.required ?? false,
    correctName: initialData?.correctName ?? false,
    correctOrigin: initialData?.correctOrigin ?? false,
    hasBusinessRule: initialData?.hasBusinessRule ?? false,
    originType: (initialData?.originType as ValidationInputOriginType) ?? "",
    originDetail: initialData?.originDetail ?? "",
    businessRuleRationale: initialData?.businessRuleRationale ?? "",
    formula: (initialData?.formula as "nao" | "sim" | "suporte") ?? "nao",
    comment: initialData?.comment ?? "",
    excluded: initialData?.excluded ?? false,
    customInternalPlatform: initialData?.customInternalPlatform ?? "",
  });

  const handleSubmit = () => {
    const name = form.validatorName.trim();
    if (!name) {
      toast({
        title: "Campo obrigatório",
        description: "Informe seu nome antes de enviar a validação.",
        variant: "destructive",
      });
      return;
    }

    if (!form.originType) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o tipo de origem do dado.",
        variant: "destructive",
      });
      return;
    }

    if (form.hasBusinessRule && !form.businessRuleRationale.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o conceito/racional da regra de negócio.",
        variant: "destructive",
      });
      return;
    }

    // If custom internal platform is selected but no custom name provided
    if (form.originType === "interno" && form.originDetail === "__custom__" && !form.customInternalPlatform?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite o nome do relatório personalizado.",
        variant: "destructive",
      });
      return;
    }

    // Auto-fill comment when formula is "sim"
    const comment = form.formula === "sim" ? "fórmula" : form.comment;

    // Prepare originDetail - use custom if selected
    const originDetail = form.originType === "interno" && form.originDetail === "__custom__"
      ? (form.customInternalPlatform ?? "")
      : form.originDetail;

    onSubmit({
      ...form,
      comment,
      validatorName: name,
      originDetail,
    });
    onClose();
  };

  return { form, setForm, handleSubmit };
}

export const VALIDATOR_OPTIONS = [
  "Cleber Horta",
  "Fernando Rosseto",
  "Lucas Silva",
  "Rosangela Goncalves",
  "Alexandra Joelma",
  "Tania Ribeiro",
  "Ricardo Paulino",
  "Eduardo Lefundes",
  "Thiago Almeida",
] as const;

export const EXTERNAL_ORIGIN_OPTIONS = [
  { value: "Fornecedor", label: "Fornecedor" },
  { value: "Outra origem externa", label: "Outra origem externa" },
] as const;

export const INTERNAL_PLATFORM_OPTIONS = [
  { value: "SAP - M303M", label: "SAP - M303M" },
  { value: "SAP - Outro relatório", label: "SAP - Outro relatório" },
  { value: "Outra plataforma local", label: "Outra plataforma local" },
  { value: "__custom__", label: "Outro relatório (digitar)" },
] as const;