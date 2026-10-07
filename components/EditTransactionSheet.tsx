"use client";

import { useEffect } from "react";
import TransactionForm from "./TransactionForm";
import type { Transaction } from "../lib/api";

export function EditTransactionSheet({
  transaction,
  onClose,
  onSaved,
  onDeleted,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
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
        aria-labelledby="edit-transaction-sheet-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 id="edit-transaction-sheet-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Edit transaction
          </h2>
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <TransactionForm
            key={transaction.id}
            transaction={transaction}
            onSuccess={onSaved}
            onCancel={onClose}
            onDeleted={onDeleted}
          />
        </div>
      </aside>
    </div>
  );
}
