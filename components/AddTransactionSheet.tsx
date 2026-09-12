"use client";

import { useEffect } from "react";
import TransactionForm from "./TransactionForm";
import type { ReportPeriod } from "./CategoryDetailSheet";
import type { CategoryType } from "../lib/api";

const TYPE_LABEL: Record<CategoryType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  SAVING: "Saving",
  INVESTMENT: "Investment",
};

function defaultDateForPeriod(period: ReportPeriod): Date {
  const now = new Date();
  if (period.kind === "month") {
    const [year, mon] = period.month.split("-").map(Number);
    if (year === now.getFullYear() && mon === now.getMonth() + 1) return now;
    return new Date(year!, (mon ?? 1) - 1, 1, 12, 0);
  }
  if (period.year === now.getFullYear()) return now;
  return new Date(period.year, 0, 1, 12, 0);
}

export function AddTransactionSheet({
  type,
  period,
  onClose,
  onCreated,
}: {
  type: CategoryType;
  period: ReportPeriod;
  onClose: () => void;
  onCreated: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-transaction-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 id="add-transaction-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Add {TYPE_LABEL[type]}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Type is set to {TYPE_LABEL[type]}. You can change it before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <TransactionForm
            defaultType={type}
            defaultDate={defaultDateForPeriod(period)}
            onCancel={onClose}
            onSuccess={() => {
              onCreated();
              onClose();
            }}
          />
        </div>
      </aside>
    </div>
  );
}
