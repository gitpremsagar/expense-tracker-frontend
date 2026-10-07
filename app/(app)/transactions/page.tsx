"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  listTransactions,
  listCategories,
  deleteTransaction,
  type Transaction,
  type Category,
  type CategoryType,
} from "../../../lib/api";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { EditTransactionSheet } from "../../../components/EditTransactionSheet";

const TYPE_SHORT: Record<CategoryType, string> = {
  INCOME: "Inc",
  EXPENSE: "Exp",
  SAVING: "Sav",
  INVESTMENT: "Inv",
};

function typeIconClass(type: CategoryType) {
  switch (type) {
    case "INCOME":
      return "bg-emerald-100 dark:bg-emerald-900/30";
    case "EXPENSE":
      return "bg-red-100 dark:bg-red-900/30";
    case "SAVING":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "INVESTMENT":
      return "bg-purple-100 dark:bg-purple-900/30";
  }
}

function typeAmountClass(type: CategoryType) {
  switch (type) {
    case "INCOME":
      return "text-emerald-600 dark:text-emerald-400";
    case "EXPENSE":
      return "text-red-600 dark:text-red-400";
    case "SAVING":
      return "text-blue-600 dark:text-blue-400";
    case "INVESTMENT":
      return "text-purple-600 dark:text-purple-400";
  }
}

function typeIcon(type: CategoryType) {
  return type === "EXPENSE" ? "↓" : "↑";
}

function formatAmount(amount: number, type: CategoryType) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
  return type === "INCOME" ? `+${formatted}` : `-${formatted}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateInput(value: string) {
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

type PresetId = "thisMonth" | "lastMonth" | "last3Months" | "thisYear";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "last3Months", label: "Last 3 months" },
  { id: "thisYear", label: "This year" },
];

function presetRange(id: PresetId): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (id) {
    case "thisMonth":
      return { from: toDateInput(new Date(y, m, 1)), to: toDateInput(new Date(y, m + 1, 0)) };
    case "lastMonth":
      return { from: toDateInput(new Date(y, m - 1, 1)), to: toDateInput(new Date(y, m, 0)) };
    case "last3Months":
      return { from: toDateInput(new Date(y, m - 2, 1)), to: toDateInput(new Date(y, m + 1, 0)) };
    case "thisYear":
      return { from: toDateInput(new Date(y, 0, 1)), to: toDateInput(new Date(y, 11, 31)) };
  }
}

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export default function TransactionsPage() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const closeEditSheet = useCallback(() => setEditing(null), []);

  const [fromDate, setFromDate] = useState(() => presetRange("thisMonth").from);
  const [toDate, setToDate] = useState(() => presetRange("thisMonth").to);
  const [typeFilter, setTypeFilter] = useState<CategoryType | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.id);
    return r.from === fromDate && r.to === toDate;
  })?.id;

  const visibleCategories = typeFilter
    ? categories.filter((c) => c.type === typeFilter)
    : categories;

  const searchTerm = searchInput.trim().toLowerCase();
  const minAmountValue = minAmount.trim() === "" ? null : Number(minAmount);
  const maxAmountValue = maxAmount.trim() === "" ? null : Number(maxAmount);
  const visibleTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        if (
          searchTerm &&
          !t.note?.toLowerCase().includes(searchTerm) &&
          !t.category.name.toLowerCase().includes(searchTerm)
        ) {
          return false;
        }
        if (minAmountValue !== null && !Number.isNaN(minAmountValue) && t.amount < minAmountValue) return false;
        if (maxAmountValue !== null && !Number.isNaN(maxAmountValue) && t.amount > maxAmountValue) return false;
        return true;
      }),
    [transactions, searchTerm, minAmountValue, maxAmountValue],
  );

  function applyPreset(id: PresetId) {
    const r = presetRange(id);
    setFromDate(r.from);
    setToDate(r.to);
  }

  function handleTypeChange(value: CategoryType | "") {
    setTypeFilter(value);
    if (value && categoryFilter) {
      const selected = categories.find((c) => c.id === categoryFilter);
      if (selected && selected.type !== value) setCategoryFilter("");
    }
  }

  const fetchTransactions = useCallback(async () => {
    if (!accessToken) return;
    try {
      let from: string | undefined;
      let to: string | undefined;
      if (fromDate) {
        const { y, m, d } = parseDateInput(fromDate);
        from = new Date(y, m - 1, d).toISOString();
      }
      if (toDate) {
        const { y, m, d } = parseDateInput(toDate);
        to = new Date(y, m - 1, d + 1).toISOString();
      }
      const result = await listTransactions(
        {
          from,
          to,
          type: typeFilter || undefined,
          categoryId: categoryFilter || undefined,
        },
        accessToken,
      );
      setTransactions(result.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fromDate, toDate, typeFilter, categoryFilter]);

  useEffect(() => {
    if (!accessToken) return;
    listCategories(accessToken).then(setCategories).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      await fetchTransactions();
    })();
  }, [fetchTransactions]);

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id, accessToken);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setPendingDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Transactions</h1>
          {!isLoading && !error && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {visibleTransactions.length} transaction{visibleTransactions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link
          href="/transactions/new"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                activePreset === p.id
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by note or category"
            className={`${inputClass} w-full pl-9 pr-9`}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">From</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => { setFromDate(e.target.value); }}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">To</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => { setToDate(e.target.value); }}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => handleTypeChange(e.target.value as CategoryType | "")}
              className={inputClass}
            >
              <option value="">All types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="SAVING">Saving</option>
              <option value="INVESTMENT">Investment</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); }}
              className={inputClass}
            >
              <option value="">All categories</option>
              {visibleCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {typeFilter ? cat.name : `${cat.name} (${TYPE_SHORT[cat.type]})`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Min amount (₹)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Max amount (₹)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="Any"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : visibleTransactions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">No transactions match your filters.</p>
          <Link
            href="/transactions/new"
            className="mt-3 inline-block text-sm text-emerald-600 underline dark:text-emerald-400"
          >
            Add your first transaction
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {visibleTransactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg ${typeIconClass(tx.type)}`}
                  >
                    {typeIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {tx.category.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {formatDate(tx.date)}{tx.note ? ` · ${tx.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${typeAmountClass(tx.type)}`}
                  >
                    {formatAmount(tx.amount, tx.type)}
                  </span>
                </Link>
                <div className="flex items-center gap-2 ml-1">
                  <button
                    type="button"
                    onClick={() => setEditing(tx)}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(tx.id)}
                    disabled={deletingId === tx.id}
                    className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    {deletingId === tx.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 inline-block" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <EditTransactionSheet
          transaction={editing}
          onClose={closeEditSheet}
          onSaved={() => {
            setEditing(null);
            void fetchTransactions();
          }}
          onDeleted={() => {
            const id = editing.id;
            setEditing(null);
            setTransactions((prev) => prev.filter((t) => t.id !== id));
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete transaction"
        message="This transaction will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        isConfirming={deletingId !== null}
        onConfirm={() => {
          if (pendingDeleteId) void handleDelete(pendingDeleteId);
        }}
        onCancel={() => {
          if (deletingId === null) setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
