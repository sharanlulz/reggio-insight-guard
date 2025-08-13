// src/lib/tables.ts
// List ONLY the public views/tables the browser is allowed to read.
// Add new views here as you expose them from the backend.
export const T = {
  REGULATIONS: "regulations_v",
  REGDOCS: "regulation_documents_v",
  REGDOCS_DETAIL: "regulation_documents_detail_v",
  CLAUSES: "clauses_v",
  INGESTIONS: "ingestions_v",
  COV_BY_DOC: "clause_coverage_by_document_v",
  COV_BY_REG: "clause_coverage_by_regulation_v",
  CHANGE_LOG: "clauses_change_log_v",
} as const;

// Build a string literal union type of allowed names
export type PublicTable = typeof T[keyof typeof T];
