"use client";

import { useState } from "react";
import type { AssistantOperation, ConfirmItem } from "../../lib/assistant";
import { formatInr, formatShortDate, TYPE_BADGE, TYPE_LABEL } from "./format";

export function OperationCard({
  operation,
  saved,
  disabled,
  onConfirm,
}: {
  operation: AssistantOperation;
  saved: boolean;
  disabled?: boolean;
  onConfirm: (item: ConfirmItem) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(saved);

  const before = operation.before;
  const after = operation.after;
  const isDelete = operation.kind === "DELETE";

  async function handleConfirm() {
    setWorking(true);
    setError(null);
    try {
      await onConfirm(
        isDelete
          ? { kind: "DELETE", targetId: operation.targetId, operationId: operation.operationId }
          : {
              kind: "UPDATE",
              targetId: operation.targetId,
              changes: operation.changes,
              operationId: operation.operationId,
            },
      );
      setDone(true);
      setConfirming(false);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Could not apply that change.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        isDelete
          ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20"
          : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {isDelete ? "Delete" : "Edit"}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[before.type]}`}>
            {TYPE_LABEL[before.type]}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {Math.round(operation.confidence * 100)}% confidence
          </span>
        </div>
        {done && (
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            Applied
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {before.categoryName} · {formatInr(before.amount)} · {formatShortDate(before.date)}
        </p>
        {before.note && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">“{before.note}”</p>
        )}

        {!isDelete && after && (
          <div className="mt-2 rounded-lg bg-white/70 p-2 text-xs text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
            <p className="mb-1 font-semibold text-zinc-500 dark:text-zinc-400">After the change</p>
            <p>
              {after.categoryName} · {formatInr(after.amount)} · {formatShortDate(after.date)}
            </p>
            {after.note && <p className="mt-0.5">“{after.note}”</p>}
          </div>
        )}

        {isDelete && (
          <p className="text-xs text-red-700 dark:text-red-300">
            This transaction will be permanently deleted. You can undo it for 10 seconds.
          </p>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {!done && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={working}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={working || disabled}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                  isDelete ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {working ? "Working…" : isDelete ? "Yes, delete" : "Confirm change"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={disabled}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                isDelete ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isDelete ? "Delete transaction" : "Review change"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
