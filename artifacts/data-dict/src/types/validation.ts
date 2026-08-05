export interface ValidationData {
  id?: number;
  fieldId?: number;
  validatorName?: string;
  used?: boolean;
  required?: boolean;
  correctName?: boolean;
  correctOrigin?: boolean;
  hasBusinessRule?: boolean;
  originType?: string | null;
  originDetail?: string | null;
  businessRuleRationale?: string | null;
  formula?: "nao" | "sim" | "suporte";
  comment?: string | null;
  createdAt?: string;
  excluded?: boolean;
  customInternalPlatform?: string;
}

export interface FieldSummary {
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

export interface Field {
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
  validation?: ValidationData | null;
}

export interface FieldWithSummary extends Field {
  summary: FieldSummary;
}