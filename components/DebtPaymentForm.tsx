"use client";

import { useEffect, useState } from "react";
import {
  addDebtPayment,
  updateDebtPayment,
  type Debt,
  type DebtPayment,
} from "../lib/api";
import { useAuth } from "../lib/auth-context";

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function paymentLabels(debt: Debt) {
  return debt.type === "TAKEN"
    ? { verb: "Paid", add: "Record payment", edit: "Edit payment" }
    : { verb: "Received", add: "Record amount received", edit: "Edit amount received" };
}

export default function DebtPaymentForm({
  debt,
  payment,
  onSaved,
  onCancel,
}: {
  debt: Debt;
  payment?: DebtPayment;
  onSaved: (debt: Debt) => void;
  onCancel: () => void;
}) {
  const { accessToken } = useAuth();
  const maxAmount = Math.round((debt.outstanding + (payment?.amount ?? 0)) * 100) / 100;

  const [amount, setAmount] = useState(String(payment ? payment.amount : maxAmount));
  const [date, setDate] = useState(
    toLocalDatetimeValue(payment ? new Date(payment.date) : new Date()),
  );
  const [note, setNote] = useState(payment?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (parsedAmount > maxAmount + 0.005) {
      setError(`Amount cannot exceed ${formatAmount(maxAmount)}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const isoDate = new Date(date).toISOString();

    try {
      const updated = payment
        ? await updateDebtPayment(
            debt.id,
            payment.id,
            { amount: parsedAmount, date: isoDate, note: note.trim() || null },
            accessToken,
          )
        : await addDebtPayment(
            debt.id,
            { amount: parsedAmount, date: isoDate, note: note.trim() || undefined },
            accessToken,
          );
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="payment-amount" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Amount
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 dark:text-zinc-400 text-sm">
            ₹
          </span>
          <input
            id="payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            max={maxAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className={`${inputClass} pl-7`}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Up to {formatAmount(maxAmount)}
        </p>
      </div>

      <div>
        <label htmlFor="payment-date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Date & Time
        </label>
        <input
          id="payment-date"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="payment-note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Note <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="payment-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="e.g. Paid via UPI"
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : payment ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function DebtPaymentSheet({
  debt,
  payment,
  onClose,
  onSaved,
}: {
  debt: Debt;
  payment?: DebtPayment;
  onClose: () => void;
  onSaved: (debt: Debt) => void;
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

  const labels = paymentLabels(debt);

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
        aria-labelledby="debt-payment-sheet-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {debt.partyName}
            </p>
            <h2 id="debt-payment-sheet-title" className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {payment ? labels.edit : labels.add}
            </h2>
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <DebtPaymentForm
            key={payment?.id ?? "new"}
            debt={debt}
            payment={payment}
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      </aside>
    </div>
  );
}
