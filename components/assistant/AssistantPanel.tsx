"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { useToast } from "../ToastProvider";
import { listCategories, type Category } from "../../lib/api";
import {
  confirmAssistantActions,
  createAssistantThread,
  deleteAssistantThread,
  getAssistantPreferences,
  getAssistantStatus,
  getAssistantThread,
  getAssistantUsage,
  listAssistantThreads,
  recordAssistantConsent,
  sendAssistantMessage,
  undoAssistantBatch,
  updateAssistantPreferences,
  uploadAssistantAttachment,
  type AssistantMessageRecord,
  type AssistantPreferences,
  type AssistantStatus,
  type AssistantThreadSummary,
  type AssistantTurnResponse,
  type AssistantUsage,
  type ConfirmItem,
  type QueryResult,
} from "../../lib/assistant";
import { ProposalCard } from "./ProposalCard";
import { OperationCard } from "./OperationCard";
import { EntityActionCard, EntityQueryCard } from "./EntityActionCard";
import { VoiceRecorder } from "./VoiceRecorder";
import { StatementImportModal } from "./StatementImportModal";
import ConfirmDialog from "../ConfirmDialog";
import { formatDateTime, formatInr, formatShortDate } from "./format";

const SUGGESTIONS = [
  "Spent 450 on groceries at BigBasket yesterday",
  "Got salary 85,000 today",
  "How much did I spend on food this month?",
  "I borrowed 25,000 from Ramesh today",
  "Rename my Food category to Dining",
  "How much do I owe Ramesh?",
];

const EFFORT_LABEL: Record<"low" | "high" | "max", string> = {
  low: "Low",
  high: "High",
  max: "Max",
};

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 20 * 1024 * 1024) throw new Error("That image is larger than 20 MB.");

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1_600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read that image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("Could not compress that image.");
    return new File([blob], "bill.jpg", { type: "image/jpeg" });
  } catch {
    if (file.size <= 10 * 1024 * 1024) return file;
    throw new Error("Could not read that image. Try a JPEG or PNG under 10 MB.");
  }
}

function QueryCard({ result }: { result: QueryResult }) {
  return (
    <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
            {result.count} transaction{result.count === 1 ? "" : "s"}
          </p>
          <p className="text-xl font-bold tabular-nums text-blue-900 dark:text-blue-100">
            {formatInr(result.total, 0)}
          </p>
        </div>
        <Link
          href="/transactions"
          className="text-xs font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300"
        >
          Open transactions
        </Link>
      </div>

      {result.groups.length > 1 && (
        <div className="mt-3 space-y-1">
          {result.groups.slice(0, 5).map((group) => (
            <div key={group.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-blue-900/80 dark:text-blue-100/80">{group.key}</span>
              <span className="tabular-nums font-medium text-blue-900 dark:text-blue-100">
                {formatInr(group.total, 0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {result.transactions.length > 0 && (
        <ul className="mt-3 divide-y divide-blue-200/70 border-t border-blue-200/70 pt-1 text-xs dark:divide-blue-900/40 dark:border-blue-900/40">
          {result.transactions.slice(0, 4).map((transaction) => (
            <li key={transaction.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0">
                <span className="block truncate font-medium text-blue-900 dark:text-blue-100">
                  {transaction.categoryName}
                </span>
                <span className="block truncate text-[11px] text-blue-700/70 dark:text-blue-300/70">
                  {formatShortDate(transaction.date)}
                  {transaction.note ? ` · ${transaction.note}` : ""}
                </span>
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-blue-900 dark:text-blue-100">
                {formatInr(transaction.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-zinc-50/70 dark:border-zinc-700 dark:bg-zinc-900/50">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 [&::-webkit-details-marker]:hidden">
        <svg
          className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Show thinking
      </summary>
      <div className="max-h-72 overflow-y-auto whitespace-pre-wrap border-t border-zinc-200 px-3 py-2 text-xs leading-5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {reasoning}
      </div>
    </details>
  );
}

function MessageBubble({
  message,
  categories,
  onConfirm,
  disabled,
}: {
  message: AssistantMessageRecord;
  categories: Category[];
  onConfirm: (items: ConfirmItem[], messageId: string) => Promise<void>;
  disabled: boolean;
}) {
  const isUser = message.role === "user";
  const turn = message.turn;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-700 px-3.5 py-2.5 text-sm text-white shadow-sm">
          {message.kind === "IMAGE" ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v9.75M3 16.5l4.72-4.72a2.25 2.25 0 013.18 0l3.6 3.6m0 0l1.72-1.72a2.25 2.25 0 013.18 0L21 16.5M3 16.5v.75A2.25 2.25 0 005.25 19.5h13.5A2.25 2.25 0 0021 17.25v-.75" />
              </svg>
              Bill photo{message.attachment?.filename ? ` · ${message.attachment.filename}` : ""}
            </span>
          ) : message.text ? (
            <span className="whitespace-pre-wrap">{message.text}</span>
          ) : (
            <span className="opacity-70">Voice note</span>
          )}
        </div>
      </div>
    );
  }

  const savedProposals = new Set(turn?.savedProposalIds ?? []);
  const savedOperations = new Set(turn?.savedOperationIds ?? []);
  const savedActions = new Set(turn?.savedActionIds ?? []);
  const proposals = turn?.proposals.filter((proposal) => !savedProposals.has(proposal.proposalId)) ?? [];
  const operations = turn?.operations.filter((operation) => !savedOperations.has(operation.operationId)) ?? [];
  const entityActions =
    turn?.entityActions?.filter((action) => !savedActions.has(action.actionId)) ?? [];
  const queryResult = turn?.queryResult ?? null;
  const entityQueryResult = turn?.entityQueryResult ?? null;

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[92%] space-y-2">
        <div className="inline-block max-w-full rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          <span className="whitespace-pre-wrap">{turn?.reply || message.text || "…"}</span>
        </div>

        {message.reasoning && <ReasoningBlock reasoning={message.reasoning} />}

        {turn?.clarifications && turn.clarifications.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {turn.clarifications.map((clarification) => (
              <span
                key={clarification}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
              >
                {clarification}
              </span>
            ))}
          </div>
        )}

        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.proposalId}
            proposal={proposal}
            categories={categories}
            saved={false}
            disabled={disabled}
            onSave={(item) => onConfirm([item], message.id)}
          />
        ))}

        {operations.map((operation) => (
          <OperationCard
            key={operation.operationId}
            operation={operation}
            saved={false}
            disabled={disabled}
            onConfirm={(item) => onConfirm([item], message.id)}
          />
        ))}

        {entityActions.map((action) => (
          <EntityActionCard
            key={action.actionId}
            action={action}
            saved={false}
            disabled={disabled}
            onConfirm={(item) => onConfirm([item], message.id)}
          />
        ))}

        {queryResult && <QueryCard result={queryResult} />}

        {entityQueryResult && <EntityQueryCard result={entityQueryResult} />}

        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{formatDateTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

export function AssistantPanel() {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [preferences, setPreferences] = useState<AssistantPreferences | null>(null);
  const [threads, setThreads] = useState<AssistantThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessageRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [usage, setUsage] = useState<AssistantUsage | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const [consentOpen, setConsentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshUsage = useCallback(async () => {
    if (!accessToken) return;
    try {
      setUsage(await getAssistantUsage(accessToken));
    } catch {
      // Usage is informational.
    }
  }, [accessToken]);

  const refreshThreads = useCallback(async () => {
    if (!accessToken) return [];
    const result = await listAssistantThreads(accessToken);
    setThreads(result);
    return result;
  }, [accessToken]);

  const loadThread = useCallback(
    async (threadId: string) => {
      if (!accessToken) return;
      const detail = await getAssistantThread(threadId, accessToken);
      setMessages(detail.messages);
      setActiveThreadId(threadId);
    },
    [accessToken],
  );

  const refreshActiveThread = useCallback(async () => {
    if (!accessToken || !activeThreadId) return;
    await loadThread(activeThreadId);
    await refreshThreads();
    await refreshUsage();
  }, [accessToken, activeThreadId, loadThread, refreshThreads, refreshUsage]);

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;

    async function load() {
      try {
        const [nextStatus, nextPreferences, nextCategories, nextThreads] = await Promise.all([
          getAssistantStatus(accessToken!),
          getAssistantPreferences(accessToken!),
          listCategories(accessToken!),
          listAssistantThreads(accessToken!),
        ]);

        if (!mounted) return;
        setStatus(nextStatus);
        setPreferences(nextPreferences);
        setCategories(nextCategories);
        setThreads(nextThreads);
        setConsentOpen(nextStatus.enabled && nextStatus.consentRequired);

        if (nextThreads[0]) {
          await loadThread(nextThreads[0].id);
        }

        void refreshUsage();
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the assistant.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
    // loadThread/refreshUsage are stable for a given token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingUserText]);

  const ensureThread = useCallback(async (): Promise<string> => {
    if (!accessToken) throw new Error("Please sign in again.");
    if (activeThreadId) return activeThreadId;
    const thread = await createAssistantThread(accessToken);
    setActiveThreadId(thread.id);
    setThreads((current) => [
      {
        id: thread.id,
        title: thread.title,
        messageCount: 0,
        importCount: 0,
        preview: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ]);
    return thread.id;
  }, [accessToken, activeThreadId]);

  function handleTurnExtras(result: AssistantTurnResponse) {
    if (result.autoSaved) {
      showToast(
        `Saved ${result.autoSaved.created} transaction${result.autoSaved.created === 1 ? "" : "s"}.`,
        {
          tone: "success",
          durationMs: 10_000,
          action: {
            label: "Undo",
            onClick: () => void handleUndo(result.autoSaved!.batchId),
          },
        },
      );
      router.refresh();
    }
    if (result.autoSaveError) {
      showToast(result.autoSaveError, { tone: "error" });
    }
  }

  async function refreshAfterTurn(threadId: string) {
    await loadThread(threadId);
    await refreshThreads();
    await refreshUsage();
    router.refresh();
  }

  async function handleSend(text: string) {
    const value = text.trim();
    if (!value || isSending || !accessToken) return;
    if (status?.consentRequired) {
      setConsentOpen(true);
      return;
    }
    if (!status?.enabled) {
      showToast(
        status?.configured
          ? "The assistant is currently turned off."
          : "The assistant is not configured. Add DEEPSEEK_API_KEY to the API.",
        { tone: "error" },
      );
      return;
    }

    setIsSending(true);
    setError(null);
    setInput("");
    setPendingUserText(value);

    try {
      const threadId = await ensureThread();
      const result = await sendAssistantMessage(
        threadId,
        { text: value, timezone: preferences?.timezone },
        accessToken,
      );
      await refreshAfterTurn(threadId);
      handleTurnExtras(result);
    } catch (sendError) {
      setInput(value);
      const message = sendError instanceof Error ? sendError.message : "Could not send that message.";
      setError(message);
      showToast(message, { tone: "error" });
    } finally {
      setPendingUserText(null);
      setIsSending(false);
    }
  }

  async function handleImage(file: File) {
    if (!accessToken || isSending) return;
    setIsSending(true);
    setUploadLabel("Reading your bill…");
    setError(null);

    try {
      const compressed = await compressImage(file);
      const threadId = await ensureThread();
      const result = await uploadAssistantAttachment(
        threadId,
        { file: compressed, kind: "IMAGE", timezone: preferences?.timezone },
        accessToken,
      );
      if ("turn" in result) {
        await refreshAfterTurn(threadId);
        handleTurnExtras(result);
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Could not read that bill.";
      setError(message);
      showToast(message, { tone: "error" });
    } finally {
      setUploadLabel(null);
      setIsSending(false);
    }
  }

  async function handleVoice(file: File) {
    if (!accessToken || isSending) return;
    setIsSending(true);
    setUploadLabel("Transcribing your voice note…");
    setError(null);

    try {
      const threadId = await ensureThread();
      const result = await uploadAssistantAttachment(
        threadId,
        { file, kind: "AUDIO", timezone: preferences?.timezone },
        accessToken,
      );

      if ("transcript" in result) {
        setInput((current) => (current ? `${current} ${result.transcript}` : result.transcript));
        showToast("Transcript ready. Check it, then send.", { tone: "info", durationMs: 5_000 });
      }
    } catch (voiceError) {
      const message =
        voiceError instanceof Error ? voiceError.message : "Could not transcribe that voice note.";
      setError(message);
      showToast(message, { tone: "error" });
    } finally {
      setUploadLabel(null);
      setIsSending(false);
    }
  }

  async function handleConfirm(items: ConfirmItem[], messageId: string) {
    if (!accessToken) throw new Error("Please sign in again.");
    const result = await confirmAssistantActions(
      {
        clientRequestId: crypto.randomUUID(),
        ...(activeThreadId ? { threadId: activeThreadId } : {}),
        messageId,
        ...(preferences?.timezone ? { timezone: preferences.timezone } : {}),
        items,
      },
      accessToken,
    );

    const count =
      result.created +
      result.updated +
      result.deleted +
      result.entityCreated +
      result.entityUpdated +
      result.entityDeleted;
    showToast(`${count} change${count === 1 ? "" : "s"} saved.`, {
      tone: "success",
      durationMs: 10_000,
      action: {
        label: "Undo",
        onClick: () => void handleUndo(result.batchId),
      },
    });
    if (accessToken) {
      setCategories(await listCategories(accessToken));
    }
    await refreshActiveThread();
    router.refresh();
  }

  async function handleUndo(batchId: string) {
    if (!accessToken) return;
    try {
      await undoAssistantBatch(batchId, accessToken);
      showToast("Change undone.", { tone: "info" });
      await refreshActiveThread();
      router.refresh();
    } catch (undoError) {
      showToast(undoError instanceof Error ? undoError.message : "Could not undo that change.", {
        tone: "error",
      });
    }
  }

  async function handleAcceptConsent() {
    if (!accessToken) return;
    try {
      await recordAssistantConsent(accessToken);
      setConsentOpen(false);
      setStatus((current) => (current ? { ...current, consentRequired: false } : current));
      setPreferences((current) => (current ? { ...current, consentAt: new Date().toISOString() } : current));
    } catch (consentError) {
      showToast(
        consentError instanceof Error ? consentError.message : "Could not save your consent.",
        { tone: "error" },
      );
    }
  }

  async function savePreferences(patch: {
    autoSaveCreates?: boolean;
    thinkingMode?: boolean;
    reasoningEffort?: "low" | "high" | "max";
  }): Promise<boolean> {
    if (!accessToken) return false;
    const previous = preferences;
    setPreferences((current) => (current ? { ...current, ...patch } : current));
    try {
      setPreferences(await updateAssistantPreferences(patch, accessToken));
      return true;
    } catch (toggleError) {
      setPreferences(previous);
      showToast(
        toggleError instanceof Error ? toggleError.message : "Could not change that setting.",
        { tone: "error" },
      );
      return false;
    }
  }

  async function handleAutoSaveToggle(next: boolean) {
    if (await savePreferences({ autoSaveCreates: next })) {
      showToast(next ? "Auto-save is on for new transactions." : "Auto-save is off.", {
        tone: "info",
      });
    }
  }

  async function handleDeleteThread() {
    if (!accessToken || !deleteThreadId) return;
    setDeletingThread(true);
    try {
      await deleteAssistantThread(deleteThreadId, accessToken);
      if (activeThreadId === deleteThreadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
      setThreads((current) => current.filter((thread) => thread.id !== deleteThreadId));
      setDeleteThreadId(null);
      showToast("Conversation deleted", { tone: "info" });
    } catch (deleteError) {
      showToast(
        deleteError instanceof Error ? deleteError.message : "Could not delete that conversation.",
        { tone: "error" },
      );
    } finally {
      setDeletingThread(false);
    }
  }

  async function openStatementImport() {
    try {
      await ensureThread();
      setImportOpen(true);
    } catch (openError) {
      showToast(openError instanceof Error ? openError.message : "Could not start the import.", {
        tone: "error",
      });
    }
  }

  function startNewConversation() {
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setHistoryOpen(false);
  }

  const hasMessages = messages.length > 0 || pendingUserText !== null;
  const consentRequired = status?.consentRequired ?? false;
  const disabled = isSending || !status?.enabled || consentRequired;

  const usageText = useMemo(() => {
    if (!usage) return null;
    return `${usage.today.messages}/${usage.limits.dailyMessages} messages today · ${usage.today.importPages}/${usage.limits.dailyImportPages} statement pages`;
  }, [usage]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 py-24">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] w-full max-w-5xl flex-col px-3 py-4 sm:px-6 md:h-[calc(100vh-2rem)]">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            <span className="text-emerald-700 dark:text-emerald-400">✦</span> Assistant
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Add, edit, delete or ask about transactions, debts, categories and groups. Nothing is
            saved without confirmation.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={preferences?.autoSaveCreates ?? false}
            disabled={!status?.enabled || consentRequired}
            onChange={(event) => void handleAutoSaveToggle(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
          />
          Auto-save new
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setThinkingOpen((open) => !open)}
            aria-expanded={thinkingOpen}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              preferences?.thinkingMode
                ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.188M12 12.75a6.01 6.01 0 01-1.5-.188M12 18a4.5 4.5 0 004.5-4.5c0-2.485-2.015-4.5-4.5-4.5s-4.5 2.015-4.5 4.5A4.5 4.5 0 0012 18zM9.75 3h4.5"
              />
            </svg>
            Thinking {preferences?.thinkingMode ? `· ${EFFORT_LABEL[preferences.reasoningEffort]}` : "off"}
          </button>

          {thinkingOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setThinkingOpen(false)}
              />
              <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Thinking mode</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                      Reason first, then answer. Slower and uses more tokens.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.thinkingMode ?? false}
                    disabled={!status?.enabled || consentRequired}
                    onChange={(event) =>
                      void savePreferences({ thinkingMode: event.target.checked })
                    }
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-amber-600"
                  />
                </div>

                <label className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <span>Effort</span>
                  <select
                    value={preferences?.reasoningEffort ?? "high"}
                    disabled={!preferences?.thinkingMode || !status?.enabled || consentRequired}
                    onChange={(event) =>
                      void savePreferences({
                        reasoningEffort: event.target.value as "low" | "high" | "max",
                      })
                    }
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-900 outline-none ring-amber-400 focus:ring-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="max">Max</option>
                  </select>
                </label>

                <p className="mt-3 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                  Applies to chat and bill analysis. Statements always use fast extraction. The
                  reasoning is saved with the reply, so you can open “Show thinking” on any answer.
                </p>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          History
        </button>

        <button
          type="button"
          onClick={startNewConversation}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          New chat
        </button>
      </header>

      {!status?.enabled && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {status?.configured
            ? "The AI assistant is turned off by the server."
            : "The AI assistant is not configured. Add DEEPSEEK_API_KEY to the API environment, then restart the API."}
        </div>
      )}

      {status?.enabled && status.consentRequired && !consentOpen && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <span>Accept the privacy notice to start using the assistant.</span>
          <button
            type="button"
            onClick={() => setConsentOpen(true)}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Review notice
          </button>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-4">
        {!hasMessages ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              ✦
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              What did you spend or receive?
            </h2>
            <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              Type it, snap a bill, record a voice note, or import a bank statement. I’ll show you
              exactly what will be saved.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void handleSend(suggestion)}
                  disabled={disabled}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-800 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-600 dark:hover:text-emerald-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={disabled}
                className="rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-emerald-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-600"
              >
                <span className="text-lg">📷</span>
                <span className="mt-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Bill photo
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  Read the total, date and merchant.
                </span>
              </button>
              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <span className="text-lg">🎙️</span>
                <span className="mt-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Voice note
                </span>
                <span className="mb-2 block text-xs text-zinc-500 dark:text-zinc-400">
                  Up to 2 minutes, edited before sending.
                </span>
                <VoiceRecorder disabled={disabled} onRecorded={handleVoice} onError={showToast} />
              </div>
              <button
                type="button"
                onClick={() => void openStatementImport()}
                disabled={disabled}
                className="rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-emerald-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-600"
              >
                <span className="text-lg">🏦</span>
                <span className="mt-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Bank statement
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  PDF, CSV or XLSX into a review queue.
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                categories={categories}
                disabled={disabled}
                onConfirm={handleConfirm}
              />
            ))}

            {pendingUserText && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-700 px-3.5 py-2.5 text-sm text-white shadow-sm">
                  {pendingUserText}
                </div>
              </div>
            )}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600" />
                  {uploadLabel ?? "Thinking…"}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend(input);
            }
          }}
          rows={2}
          maxLength={status?.limits.maxTextChars ?? 2_000}
          disabled={disabled}
          placeholder={
            status?.enabled
              ? "e.g. Spent 250 on lunch today, or I lent 5,000 to Priya, or rename my Food category"
              : "Assistant unavailable"
          }
          className="w-full resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:text-zinc-50"
        />
        <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImage(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={disabled}
            title="Upload a bill photo"
            className="flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v9.75M3 16.5l4.72-4.72a2.25 2.25 0 013.18 0l3.6 3.6m0 0l1.72-1.72a2.25 2.25 0 013.18 0L21 16.5M3 16.5v.75A2.25 2.25 0 005.25 19.5h13.5A2.25 2.25 0 0021 17.25v-.75" />
            </svg>
            Bill
          </button>
          <VoiceRecorder disabled={disabled} onRecorded={handleVoice} onError={showToast} />
          <button
            type="button"
            onClick={() => void openStatementImport()}
            disabled={disabled}
            className="flex items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A2.25 2.25 0 015.25 5.25h3l1.5 1.5h8.25A2.25 2.25 0 0120.25 9v7.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5v-9z" />
            </svg>
            Statement
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="hidden items-center gap-1 rounded-lg border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex"
          >
            History
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[10px] text-zinc-400 sm:inline">
              {input.length}/{status?.limits.maxTextChars ?? 2_000}
            </span>
            <button
              type="button"
              onClick={() => void handleSend(input)}
              disabled={disabled || !input.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
            >
              Send
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6-6m6 6l-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {usageText && <p className="mt-1 text-center text-[10px] text-zinc-400">{usageText}</p>}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close history"
            onClick={() => setHistoryOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Conversations</h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {threads.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No conversations yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {threads.map((thread) => (
                    <li key={thread.id} className="group flex items-start gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          void loadThread(thread.id);
                          setHistoryOpen(false);
                        }}
                        className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition ${
                          activeThreadId === thread.id
                            ? "bg-emerald-50 dark:bg-emerald-900/20"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        }`}
                      >
                        <span className="block truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          {thread.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {thread.preview ?? "No messages yet"} · {thread.messageCount}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteThreadId(thread.id)}
                        className="mt-2 rounded p-1 text-zinc-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/30"
                        aria-label={`Delete ${thread.title}`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={startNewConversation}
                className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Start a new conversation
              </button>
              {usageText && (
                <p className="mt-2 text-center text-[10px] text-zinc-400">{usageText}</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {consentOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assistant-consent-title"
            className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 id="assistant-consent-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Before you use the assistant
            </h2>
            <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                Messages, bill photos, voice notes and statement pages are sent to <strong>DeepSeek</strong>{" "}
                for processing.
              </p>
              <p>
                Money Tracker 365 does not store the original files. Only the transactions you confirm are
                saved to your account.
              </p>
              <p>
                DeepSeek’s handling of requests is governed by its privacy policy. Avoid sending information
                you would not want processed by a third party.
              </p>
              <p>
                Read our{" "}
                <Link href="/privacy" className="font-semibold text-emerald-700 underline dark:text-emerald-400">
                  privacy notice
                </Link>
                .
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConsentOpen(false)}
                className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void handleAcceptConsent()}
                className="flex-1 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      )}

      <StatementImportModal
        open={importOpen}
        threadId={activeThreadId}
        categories={categories}
        accessToken={accessToken ?? ""}
        onClose={() => setImportOpen(false)}
        onCommitted={(result) => {
          showToast(
            `${result.imported} transaction${result.imported === 1 ? "" : "s"} imported.`,
            {
              tone: "success",
              durationMs: 10_000,
              action: { label: "Undo", onClick: () => void handleUndo(result.batchId) },
            },
          );
          void refreshActiveThread();
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleteThreadId !== null}
        title="Delete conversation"
        message="This removes the conversation and its messages. Transactions you saved stay in your account."
        confirmLabel="Delete"
        isConfirming={deletingThread}
        onConfirm={() => void handleDeleteThread()}
        onCancel={() => {
          if (!deletingThread) setDeleteThreadId(null);
        }}
      />
    </div>
  );
}
