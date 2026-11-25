"use client";

import { useState } from "react";
import type {
  AssistantEntityAction,
  ConfirmItem,
  EntityKind,
  EntityQueryResult,
  EntitySnapshot,
} from "../../lib/assistant";
import { formatInr, formatShortDate, TYPE_BADGE, TYPE_LABEL } from "./format";

const ENTITY_LABEL: Record<EntityKind, string> = {
  DEBT: "Debt",
  CATEGORY: "Category",
  GROUP: "Group",
};

const ENTITY_ICON: Record<EntityKind, string> = {
  DEBT: "🤝",
  CATEGORY: "🏷️",
  GROUP: "🗂️",
};

function isDebtType(value: EntitySnapshot["type"]): value is "TAKEN" | "GIVEN" {
  return value === "TAKEN" || value === "GIVEN";
}

function SnapshotDetails({ snapshot }: { snapshot: EntitySnapshot }) {
  if (snapshot.entity === "DEBT") {
    return (
      <div className="space-y-0.5">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {snapshot.partyName} ·{" "}
          {isDebtType(snapshot.type)
            ? snapshot.type === "TAKEN"
              ? "you owe"
              : "owed to you"
            : "debt"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {formatInr(snapshot.amount ?? 0)}
          {snapshot.outstanding !== undefined && snapshot.outstanding !== snapshot.amount
            ? ` · ${formatInr(snapshot.outstanding)} outstanding`
            : ""}
          {snapshot.date ? ` · ${formatShortDate(snapshot.date)}` : ""}
        </p>
        {snapshot.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">“{snapshot.description}”</p>
        )}
      </div>
    );
  }

  if (snapshot.entity === "CATEGORY") {
    return (
      <div className="space-y-1">
        <p className="flex flex-wrap items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-50">
          {snapshot.name}
          {snapshot.type && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[snapshot.type as keyof typeof TYPE_BADGE] ?? ""}`}>
              {TYPE_LABEL[snapshot.type as keyof typeof TYPE_LABEL] ?? snapshot.type}
            </span>
          )}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {snapshot.groupName ? `Group: ${snapshot.groupName}` : "No group"}
          {snapshot.transactionCount !== undefined
            ? ` · ${snapshot.transactionCount} transaction${snapshot.transactionCount === 1 ? "" : "s"}`
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="font-medium text-zinc-900 dark:text-zinc-50">{snapshot.name}</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {snapshot.type ? `${TYPE_LABEL[snapshot.type as keyof typeof TYPE_LABEL] ?? snapshot.type} group` : "Group"}
        {snapshot.categoryCount !== undefined
          ? ` · ${snapshot.categoryCount} categor${snapshot.categoryCount === 1 ? "y" : "ies"}`
          : ""}
      </p>
    </div>
  );
}

function itemFor(action: AssistantEntityAction): ConfirmItem {
  if (action.kind === "DELETE") {
    return {
      kind: "ENTITY",
      entity: action.entity,
      action: "DELETE",
      ...(action.targetId ? { targetId: action.targetId } : {}),
      actionId: action.actionId,
    };
  }

  if (action.kind === "UPDATE") {
    const { type, partyName, amount, description, date, name, groupId } = action.changes;
    return {
      kind: "ENTITY",
      entity: action.entity,
      action: "UPDATE",
      ...(action.targetId ? { targetId: action.targetId } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(partyName !== undefined ? { partyName } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(date !== undefined ? { date } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(groupId !== undefined ? { groupId } : {}),
      actionId: action.actionId,
    };
  }

  const after = action.after;
  return {
    kind: "ENTITY",
    entity: action.entity,
    action: "CREATE",
    ...(after?.partyName ? { partyName: after.partyName } : {}),
    ...(after?.amount !== undefined ? { amount: after.amount } : {}),
    ...(after?.description !== undefined ? { description: after.description } : {}),
    ...(after?.type ? { type: after.type } : {}),
    ...(after?.name ? { name: after.name } : {}),
    ...(after?.groupId !== undefined ? { groupId: after.groupId } : {}),
    ...(after?.date ? { date: after.date } : {}),
    actionId: action.actionId,
  };
}

export function EntityActionCard({
  action,
  saved,
  disabled,
  onConfirm,
}: {
  action: AssistantEntityAction;
  saved: boolean;
  disabled?: boolean;
  onConfirm: (item: ConfirmItem) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(saved);

  const isDelete = action.kind === "DELETE";
  const summary = action.kind === "CREATE" ? action.after : action.kind === "UPDATE" ? action.after : action.before;

  async function handleConfirm() {
    setWorking(true);
    setError(null);
    try {
      await onConfirm(itemFor(action));
      setDone(true);
      setConfirming(false);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error ? confirmError.message : "Could not apply that change.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        isDelete
          ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20"
          : action.kind === "CREATE"
            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
            : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {action.kind === "CREATE" ? "New" : action.kind === "UPDATE" ? "Edit" : "Delete"}
          </span>
          <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {ENTITY_ICON[action.entity]} {ENTITY_LABEL[action.entity]}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {Math.round(action.confidence * 100)}% confidence
          </span>
        </div>
        {done && (
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            Applied
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm">
        {action.kind === "UPDATE" && action.before ? (
          <>
            <div className="opacity-70">
              <SnapshotDetails snapshot={action.before} />
            </div>
            <div className="mt-2 rounded-lg bg-white/70 p-2 dark:bg-zinc-950/40">
              <p className="mb-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                After the change
              </p>
              {summary && <SnapshotDetails snapshot={summary} />}
            </div>
          </>
        ) : summary ? (
          <SnapshotDetails snapshot={summary} />
        ) : null}

        {isDelete && (
          <p className="text-xs text-red-700 dark:text-red-300">
            {action.entity === "GROUP"
              ? "The group will be deleted. Its categories stay, but they leave the group."
              : action.entity === "CATEGORY"
                ? "This category will be deleted. It can only be deleted if no transactions use it."
                : "This debt will be deleted permanently."}{" "}
            You can undo it shortly after.
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
                  isDelete ? "bg-red-600 hover:bg-red-700" : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                {working ? "Working…" : isDelete ? "Yes, delete" : "Confirm"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={disabled}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                isDelete ? "bg-red-600 hover:bg-red-700" : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {isDelete
                ? `Delete ${ENTITY_LABEL[action.entity].toLowerCase()}`
                : action.kind === "CREATE"
                  ? `Review ${ENTITY_LABEL[action.entity].toLowerCase()}`
                  : "Review change"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EntityQueryCard({ result }: { result: EntityQueryResult }) {
  const label =
    result.entity === "DEBT" ? "debt" : result.entity === "CATEGORY" ? "category" : "group";

  return (
    <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
          {result.count} {label}
          {result.count === 1 ? "" : "s"}
        </p>
        {result.entity === "DEBT" && (
          <p className="text-xs text-blue-800 dark:text-blue-200">
            {result.takenOutstanding
              ? `Owe ${formatInr(result.takenOutstanding, 0)}`
              : "Nothing owed by you"}
            {result.givenOutstanding
              ? ` · ${formatInr(result.givenOutstanding, 0)} owed to you`
              : ""}
          </p>
        )}
      </div>

      {result.items.length > 0 && (
        <ul className="mt-2 divide-y divide-blue-200/70 border-t border-blue-200/70 pt-1 text-xs dark:divide-blue-900/40 dark:border-blue-900/40">
          {result.items.slice(0, 6).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0">
                <span className="block truncate font-medium text-blue-900 dark:text-blue-100">
                  {item.title}
                </span>
                <span className="block truncate text-[11px] text-blue-700/70 dark:text-blue-300/70">
                  {item.subtitle}
                </span>
              </span>
              {item.amount !== undefined && result.entity === "DEBT" && (
                <span className="shrink-0 tabular-nums font-semibold text-blue-900 dark:text-blue-100">
                  {formatInr(item.amount)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
