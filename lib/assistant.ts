import { apiFetch, apiUpload, type CategoryType } from "./api";

export type AssistantIntent =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "QUERY"
  | "IMPORT"
  | "MANAGE"
  | "CLARIFY"
  | "UNSUPPORTED";

export type EntityKind = "DEBT" | "CATEGORY" | "GROUP";
export type DebtDirection = "TAKEN" | "GIVEN";

export type EntitySnapshot = {
  entity: EntityKind;
  id: string;
  type?: DebtDirection | CategoryType;
  partyName?: string;
  amount?: number;
  description?: string | null;
  date?: string;
  status?: string;
  paidAmount?: number;
  outstanding?: number;
  paymentCount?: number;
  name?: string;
  groupId?: string | null;
  groupName?: string | null;
  transactionCount?: number;
  categoryCount?: number;
  memberIds?: string[];
};

export type EntityChanges = {
  type?: DebtDirection | CategoryType;
  partyName?: string;
  amount?: number;
  description?: string | null;
  date?: string;
  name?: string;
  groupId?: string | null;
};

export type AssistantEntityAction = {
  actionId: string;
  entity: EntityKind;
  kind: "CREATE" | "UPDATE" | "DELETE";
  targetId: string | null;
  before: EntitySnapshot | null;
  after: EntitySnapshot | null;
  changes: EntityChanges;
  confidence: number;
};

export type EntityQueryResult = {
  entity: EntityKind;
  count: number;
  total: number;
  takenOutstanding?: number;
  givenOutstanding?: number;
  items: Array<{ id: string; title: string; subtitle: string; amount?: number }>;
};

export type AssistantProposal = {
  proposalId: string;
  amount: number;
  type: CategoryType;
  categoryId: string | null;
  categoryName: string | null;
  suggestedCategoryName: string | null;
  date: string;
  note: string;
  confidence: number;
  source: "TEXT" | "IMAGE" | "AUDIO";
};

export type TransactionSnapshot = {
  id: string;
  amount: number;
  note: string | null;
  type: CategoryType;
  date: string;
  categoryId: string;
  categoryName: string;
};

export type AssistantOperation = {
  operationId: string;
  kind: "UPDATE" | "DELETE";
  targetId: string;
  before: TransactionSnapshot;
  after: TransactionSnapshot | null;
  changes: {
    amount?: number;
    categoryId?: string;
    date?: string;
    note?: string | null;
  };
  confidence: number;
};

export type QueryResult = {
  total: number;
  count: number;
  average: number;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    type: CategoryType;
    categoryName: string;
    note: string | null;
  }>;
  groups: Array<{ key: string; total: number; count: number }>;
};

export type AssistantTurn = {
  intent: AssistantIntent;
  reply: string;
  proposals: AssistantProposal[];
  operations: AssistantOperation[];
  entityActions: AssistantEntityAction[];
  query: Record<string, unknown> | null;
  queryResult: QueryResult | null;
  entityQuery: Record<string, unknown> | null;
  entityQueryResult: EntityQueryResult | null;
  clarifications: string[];
  savedProposalIds?: string[];
  savedOperationIds?: string[];
  savedActionIds?: string[];
  savedBatchId?: string;
};

export type AssistantStatus = {
  enabled: boolean;
  configured: boolean;
  consentRequired: boolean;
  model: string;
  limits: {
    maxTextChars: number;
    maxCreatesPerTurn: number;
    dailyMessages: number;
    dailyImportPages: number;
    maxImportRows: number;
    maxImageMb: number;
    maxAudioMb: number;
    maxStatementMb: number;
  };
};

export type AssistantPreferences = {
  autoSaveCreates: boolean;
  thinkingMode: boolean;
  reasoningEffort: "low" | "high" | "max";
  timezone: string;
  consentAt: string | null;
};

export type AssistantThreadSummary = {
  id: string;
  title: string;
  messageCount: number;
  importCount: number;
  preview: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssistantMessageRecord = {
  id: string;
  threadId: string;
  userId: string;
  seq: number;
  role: "user" | "assistant" | "system";
  kind: "TEXT" | "IMAGE" | "AUDIO" | "STATEMENT" | "SYSTEM";
  text: string | null;
  transcript: string | null;
  reasoning: string | null;
  attachment: {
    kind?: string;
    mime?: string;
    bytes?: number;
    filename?: string;
  } | null;
  turn: AssistantTurn | null;
  model: string | null;
  createdAt: string;
};

export type AssistantImportSummary = {
  id: string;
  filename: string;
  source: "PDF" | "CSV" | "XLSX";
  status: "PROCESSING" | "READY" | "FAILED" | "COMMITTED";
  pages: number | null;
  rowCount: number;
  duplicateCount: number;
  error: string | null;
  createdAt: string;
  committedAt: string | null;
};

export type AssistantImportRow = {
  id: string;
  importId: string;
  userId: string;
  rowIndex: number;
  date: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  description: string | null;
  categoryId: string | null;
  suggestedCategoryName: string | null;
  confidence: number;
  dedupeKey: string | null;
  status: "PENDING" | "DUPLICATE" | "IMPORTED" | "SKIPPED";
  transactionId: string | null;
};

export type AssistantImportDetail = {
  import: AssistantImportSummary;
  rows: AssistantImportRow[];
  counts: Record<string, number>;
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

export type AssistantTurnResponse = {
  threadId: string;
  messageId: string;
  turn: AssistantTurn;
  reasoning: string | null;
  autoSaved: ConfirmResult | null;
  autoSaveError: string | null;
};

export type AssistantUsage = {
  today: { day: string; messages: number; importPages: number; costUsd: number };
  limits: {
    dailyMessages: number;
    dailyImportPages: number;
    maxImportRows: number;
    maxCreatesPerTurn: number;
  };
  last30Days: {
    messages: number;
    importPages: number;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
  };
};

export async function getAssistantStatus(accessToken: string): Promise<AssistantStatus> {
  return apiFetch<AssistantStatus>("/assistant/status", { accessToken });
}

export async function recordAssistantConsent(accessToken: string) {
  return apiFetch<{ consentAt: string }>("/assistant/consent", {
    method: "POST",
    accessToken,
  });
}

export async function getAssistantPreferences(accessToken: string): Promise<AssistantPreferences> {
  return apiFetch<AssistantPreferences>("/assistant/preferences", { accessToken });
}

export async function updateAssistantPreferences(
  input: {
    autoSaveCreates?: boolean;
    thinkingMode?: boolean;
    reasoningEffort?: "low" | "high" | "max";
    timezone?: string;
  },
  accessToken: string,
): Promise<AssistantPreferences> {
  return apiFetch<AssistantPreferences>("/assistant/preferences", {
    method: "PUT",
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function listAssistantThreads(accessToken: string): Promise<AssistantThreadSummary[]> {
  const result = await apiFetch<{ threads: AssistantThreadSummary[] }>("/assistant/threads", {
    accessToken,
  });
  return result.threads;
}

export async function createAssistantThread(
  accessToken: string,
  title?: string,
): Promise<{ id: string; title: string }> {
  const result = await apiFetch<{ thread: { id: string; title: string } }>("/assistant/threads", {
    method: "POST",
    body: JSON.stringify(title ? { title } : {}),
    accessToken,
  });
  return result.thread;
}

export async function getAssistantThread(
  threadId: string,
  accessToken: string,
): Promise<{
  thread: { id: string; title: string; createdAt: string; updatedAt: string };
  messages: AssistantMessageRecord[];
  imports: AssistantImportSummary[];
}> {
  return apiFetch(`/assistant/threads/${threadId}`, { accessToken });
}

export async function deleteAssistantThread(threadId: string, accessToken: string): Promise<void> {
  await apiFetch<{ message: string }>(`/assistant/threads/${threadId}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function sendAssistantMessage(
  threadId: string,
  input: { text: string; timezone?: string },
  accessToken: string,
): Promise<AssistantTurnResponse> {
  return apiFetch<AssistantTurnResponse>(`/assistant/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function uploadAssistantAttachment(
  threadId: string,
  input: { file: File; kind: "IMAGE" | "AUDIO"; timezone?: string },
  accessToken: string,
): Promise<AssistantTurnResponse | { transcript: string; durationMs: number | null }> {
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("file", input.file);
  if (input.timezone) form.append("timezone", input.timezone);

  return apiUpload(`/assistant/threads/${threadId}/attachments`, form, accessToken);
}

export type ConfirmItem =
  | {
      kind: "CREATE";
      amount: number;
      categoryId?: string | null;
      newCategoryName?: string | null;
      newCategoryType?: CategoryType;
      date: string;
      note?: string;
      source?: "TEXT" | "IMAGE" | "AUDIO" | "IMPORT";
      proposalId?: string;
    }
  | {
      kind: "UPDATE";
      targetId: string;
      changes: {
        amount?: number;
        categoryId?: string;
        date?: string;
        note?: string | null;
      };
      operationId?: string;
    }
  | { kind: "DELETE"; targetId: string; operationId?: string }
  | {
      kind: "ENTITY";
      entity: EntityKind;
      action: "CREATE" | "UPDATE" | "DELETE";
      targetId?: string;
      partyName?: string;
      amount?: number;
      description?: string | null;
      type?: DebtDirection | CategoryType;
      name?: string;
      groupId?: string | null;
      date?: string;
      actionId?: string;
    };

export type ConfirmResult = {
  batchId: string;
  created: number;
  updated: number;
  deleted: number;
  transactions: TransactionSnapshot[];
  entityCreated: number;
  entityUpdated: number;
  entityDeleted: number;
  entities: EntitySnapshot[];
  undoUntil: string;
};

export async function confirmAssistantActions(
  input: {
    clientRequestId: string;
    threadId?: string;
    messageId?: string;
    timezone?: string;
    items: ConfirmItem[];
  },
  accessToken: string,
): Promise<ConfirmResult> {
  return apiFetch("/assistant/actions/confirm", {
    method: "POST",
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function undoAssistantBatch(
  batchId: string,
  accessToken: string,
): Promise<{ undone: boolean; restored: number; deleted: number }> {
  return apiFetch(`/assistant/actions/${batchId}/undo`, {
    method: "POST",
    accessToken,
  });
}

export async function startStatementImport(
  input: { file: File; threadId?: string; timezone?: string },
  accessToken: string,
): Promise<AssistantImportSummary> {
  const form = new FormData();
  form.append("file", input.file);
  if (input.threadId) form.append("threadId", input.threadId);
  if (input.timezone) form.append("timezone", input.timezone);

  const result = await apiUpload<{ import: AssistantImportSummary }>(
    "/assistant/imports",
    form,
    accessToken,
  );
  return result.import;
}

export async function getStatementImport(
  importId: string,
  accessToken: string,
  options: { page?: number; status?: string; limit?: number } = {},
): Promise<AssistantImportDetail> {
  const qs = new URLSearchParams();
  if (options.page) qs.set("page", String(options.page));
  if (options.status) qs.set("status", options.status);
  if (options.limit) qs.set("limit", String(options.limit));

  return apiFetch(`/assistant/imports/${importId}?${qs.toString()}`, { accessToken });
}

export async function listStatementImports(
  accessToken: string,
): Promise<AssistantImportSummary[]> {
  const result = await apiFetch<{ imports: AssistantImportSummary[] }>("/assistant/imports", {
    accessToken,
  });
  return result.imports;
}

export async function commitStatementImport(
  importId: string,
  input: {
    clientRequestId: string;
    timezone?: string;
    rows: Array<{
      rowId: string;
      include?: boolean;
      amount?: number;
      categoryId?: string | null;
      newCategoryName?: string | null;
      newCategoryType?: CategoryType;
      date?: string;
      note?: string;
    }>;
  },
  accessToken: string,
): Promise<{ batchId: string; imported: number; skipped: number; undoUntil: string }> {
  return apiFetch(`/assistant/imports/${importId}/commit`, {
    method: "POST",
    body: JSON.stringify(input),
    accessToken,
  });
}

export async function discardStatementImport(importId: string, accessToken: string): Promise<void> {
  await apiFetch<{ message: string }>(`/assistant/imports/${importId}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function getAssistantUsage(accessToken: string): Promise<AssistantUsage> {
  return apiFetch<AssistantUsage>("/assistant/usage", { accessToken });
}

export async function eraseAssistantData(accessToken: string): Promise<void> {
  await apiFetch<{ message: string }>("/assistant/data", {
    method: "DELETE",
    accessToken,
  });
}
