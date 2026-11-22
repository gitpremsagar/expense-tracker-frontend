"use client";

import { useMemo, useState } from "react";
import type { Category } from "../../lib/api";
import type { AssistantProposal, ConfirmItem } from "../../lib/assistant";
import { confidenceLabel, formatInr, TYPE_BADGE, TYPE_LABEL } from "./format";

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

export function ProposalCard({
  proposal,
  categories,
  saved,
  disabled,
  onSave,
}: {
  proposal: AssistantProposal;
  categories: Category[];
  saved: boolean;
  disabled?: boolean;
  onSave: (item: ConfirmItem) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(proposal.amount));
  const [date, setDate] = useState(proposal.date);
  const [note, setNote] = useState(proposal.note);
  const [categoryId, setCategoryId] = useState(proposal.categoryId ?? "");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState(proposal.suggestedCategoryName ?? "");
  const [newCategoryType, setNewCategoryType] = useState(proposal.type);
  const [saving, setSaving] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const type = selectedCategory?.type ?? newCategoryType;

  const matchingSuggestion = useMemo(
    () =>
      proposal.suggestedCategoryName
        ? categories.find(
            (category) =>
              category.name.toLowerCase() === proposal.suggestedCategoryName?.toLowerCase(),
          )
        : undefined,
    [categories, proposal.suggestedCategoryName],
  );

  if (discarded) return null;

  async function handleSave() {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!date) {
      setError("Choose a date.");
      return;
    }
    if (!categoryId && !creatingCategory) {
      setError("Choose a category, or create the suggested one.");
      return;
    }
    if (creatingCategory && !newCategoryName.trim()) {
      setError("Give the new category a name.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        kind: "CREATE",
        amount: parsedAmount,
        ...(categoryId ? { categoryId } : {}),
        ...(creatingCategory
          ? { newCategoryName: newCategoryName.trim(), newCategoryType }
          : {}),
        date,
        note: note.trim(),
        source: proposal.source,
        proposalId: proposal.proposalId,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save that transaction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        saved
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[type]}`}>
            {TYPE_LABEL[type]}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {confidenceLabel(proposal.confidence)} · {Math.round(proposal.confidence * 100)}%
          </span>
        </div>
        {saved && (
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            Saved
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Amount (₹)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            disabled={saved || disabled || saving}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Date</span>
          <input
            type="date"
            value={date}
            disabled={saved || disabled || saving}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Category</span>
          <select
            value={creatingCategory ? "__new__" : categoryId}
            disabled={saved || disabled || saving}
            onChange={(event) => {
              if (event.target.value === "__new__") {
                setCreatingCategory(true);
                setCategoryId("");
              } else {
                setCreatingCategory(false);
                setCategoryId(event.target.value);
              }
            }}
            className={inputClass}
          >
            <option value="">Select a category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({TYPE_LABEL[category.type]})
              </option>
            ))}
            <option value="__new__">+ Create a new category</option>
          </select>
        </label>

        {creatingCategory && (
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_140px]">
            <input
              value={newCategoryName}
              disabled={saved || disabled || saving}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="New category name"
              className={inputClass}
            />
            <select
              value={newCategoryType}
              disabled={saved || disabled || saving}
              onChange={(event) => setNewCategoryType(event.target.value as typeof newCategoryType)}
              className={inputClass}
            >
              {(["EXPENSE", "INCOME", "SAVING", "INVESTMENT"] as const).map((option) => (
                <option key={option} value={option}>
                  {TYPE_LABEL[option]}
                </option>
              ))}
            </select>
          </div>
        )}

        {!categoryId && !creatingCategory && proposal.suggestedCategoryName && (
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <span>Suggested: {proposal.suggestedCategoryName}</span>
            {matchingSuggestion ? (
              <button
                type="button"
                onClick={() => {
                  setCreatingCategory(false);
                  setCategoryId(matchingSuggestion.id);
                }}
                className="font-semibold underline"
              >
                Use it
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCreatingCategory(true);
                  setNewCategoryName(proposal.suggestedCategoryName ?? "");
                }}
                className="font-semibold underline"
              >
                Create it
              </button>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Note</span>
          <input
            value={note}
            maxLength={500}
            disabled={saved || disabled || saving}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What was this for?"
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {!saved && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDiscarded(true)}
            disabled={saving}
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Discard
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatInr(Number(amount) || 0)}</span>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || disabled}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
