export const FIELD_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CONFLICT: "conflict",
} as const;

export const FIELD_CLASSIFICATION = {
  PENDING: "pending",
  RELIABLE: "reliable",
  ATTENTION: "attention",
  CRITICAL: "critical",
} as const;

export const DICTIONARY_STATUS = {
  PENDING: "pending",
  IN_REVIEW: "in_review",
  VALIDATED: "validated",
} as const;

export const SCORE_THRESHOLDS = {
  APPROVE: 60,
  RELIABLE: 90,
  ATTENTION: 60,
} as const;
