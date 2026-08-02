import {
  catalogConfidentialityEnum,
  catalogLgpdEnum,
  catalogLayerEnum,
} from "@workspace/db/schema";

export const CONFIDENTIALITY_LABELS: Record<string, string> = {
  publica: "Pública",
  interna: "Interna",
  restrita: "Restrita",
  confidencial: "Confidencial",
};

export const LGPD_LABELS: Record<string, string> = {
  pessoal: "Pessoal",
  sensivel: "Sensível",
  nao_pessoal: "Não Pessoal",
  anonimizado: "Anonimizado",
};

export const LAYER_LABELS: Record<string, string> = {
  RFN: "RFN (Refinada)",
  RAW: "RAW (Bruta)",
};

export const CONFIDENTIALITY_COLORS: Record<string, string> = {
  publica: "bg-green-100 text-green-800",
  interna: "bg-blue-100 text-blue-800",
  restrita: "bg-amber-100 text-amber-800",
  confidencial: "bg-red-100 text-red-800",
};

export const LGPD_COLORS: Record<string, string> = {
  pessoal: "bg-red-100 text-red-800",
  sensivel: "bg-orange-100 text-orange-800",
  nao_pessoal: "bg-green-100 text-green-800",
  anonimizado: "bg-gray-100 text-gray-800",
};

export function getConfidentialityLabel(value: string): string {
  return CONFIDENTIALITY_LABELS[value] ?? value;
}

export function getLgpdLabel(value: string): string {
  return LGPD_LABELS[value] ?? value;
}

export function getLayerLabel(value: string): string {
  return LAYER_LABELS[value] ?? value;
}

export function getConfidentialityColor(value: string): string {
  return CONFIDENTIALITY_COLORS[value] ?? "bg-gray-100 text-gray-800";
}

export function getLgpdColor(value: string): string {
  return LGPD_COLORS[value] ?? "bg-gray-100 text-gray-800";
}

export function getLayerColor(value: string): string {
  return value === "RFN" ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800";
}