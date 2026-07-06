import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
