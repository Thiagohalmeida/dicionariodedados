import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBase(): string {
  const explicit = import.meta.env.VITE_API_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/$/, "");
  }
  return (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
}

export function traduzirStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendente",
    in_review: "Em Revisão",
    validated: "Validado",
    approved: "Aprovado",
    rejected: "Reprovado",
    conflict: "Conflito",
  };
  return map[status] ?? status;
}

export function traduzirClassificacao(cls: string): string {
  const map: Record<string, string> = {
    pending: "Pendente",
    reliable: "Confiável",
    attention: "Atenção",
    critical: "Crítico",
  };
  return map[cls] ?? cls;
}

export function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  return status === "conflict" ? "destructive" : "outline";
}

export function classificationBadgeVariant(
  classification: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (classification) {
    case "reliable":
      return "default";
    case "attention":
      return "secondary";
    case "critical":
      return "destructive";
    default:
      return "outline";
  }
}
