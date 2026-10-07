"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  listCategories,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type Category,
  type CategoryType,
  type Transaction,
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import ConfirmDialog from "./ConfirmDialog";

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TYPE_LABEL: Record<CategoryType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  SAVING: "Saving",
  INVESTMENT: "Investment",
};

type Props = {
  transaction?: Transaction;
  defaultType?: CategoryType;
  defaultDate?: Date;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDeleted?: () => void;
};

export default function TransactionForm({
  transaction,
  defaultType,
  defaultDate,
  onSuccess,
  onCancel,
  onDeleted,
}: Props) {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<CategoryType>(transaction?.type ?? defaultType ?? "EXPENSE");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [date, setDate] = useState(
    transaction
      ? toLocalDatetimeValue(new Date(transaction.date))
      : toLocalDatetimeValue(defaultDate ?? new Date()),
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      setIsLoadingCats(true);
      try {
        const cats = await listCategories(accessToken);
        setCategories(cats);
      } catch {
        setCategories([]);
      } finally {
        setIsLoadingCats(false);
      }
    })();
  }, [accessToken]);

  const filteredCategories = categories.filter((c) => c.type === type);

  // Clear category when it does not belong to the selected type (create and edit)
  const categoryIdForType = filteredCategories.some((c) => c.id === categoryId) ? categoryId : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (!categoryIdForType) {
      setError("Please select a category");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const isoDate = new Date(date).toISOString();

    try {
      if (transaction) {
        await updateTransaction(
          transaction.id,
          { amount: parsedAmount, note: note.trim() || null, categoryId: categoryIdForType, date: isoDate },
          accessToken,
        );
      } else {
        await createTransaction(
          { amount: parsedAmount, note: note.trim() || undefined, categoryId: categoryIdForType, date: isoDate },
          accessToken,
        );
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/transactions");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !transaction) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteTransaction(transaction.id, accessToken);
      if (onDeleted) {
        setConfirmOpen(false);
        onDeleted();
        return;
      }
      router.push("/transactions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction");
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["EXPENSE", "INCOME", "SAVING", "INVESTMENT"] as CategoryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg py-2.5 text-sm font-medium transition-colors border ${
                type === t
                  ? t === "INCOME"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-600 dark:text-emerald-400"
                    : t === "EXPENSE"
                      ? "bg-red-50 border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400"
                      : t === "SAVING"
                        ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400"
                        : "bg-purple-50 border-purple-400 text-purple-700 dark:bg-purple-900/20 dark:border-purple-600 dark:text-purple-400"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Amount
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 dark:text-zinc-400 text-sm">
            ₹
          </span>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded-lg border border-zinc-300 pl-7 pr-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Category
        </label>
        {isLoadingCats ? (
          <div className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        ) : filteredCategories.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No {type.toLowerCase()} categories found.{" "}
            <a href="/categories" className="text-emerald-600 underline dark:text-emerald-400">
              Create one
            </a>
            .
          </p>
        ) : (
          <select
            id="category"
            value={categoryIdForType}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Select a category…</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Date & time */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Date & Time
        </label>
        <input
          id="date"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {/* Note */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Note <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Add a description…"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 resize-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : router.back())}
          className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : transaction ? "Update" : "Add Transaction"}
        </button>
      </div>

      {transaction ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting || isSubmitting}
          className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {isDeleting ? "Deleting…" : "Delete transaction"}
        </button>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete transaction"
        message="This transaction will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isDeleting) setConfirmOpen(false);
        }}
      />
    </form>
  );
}
