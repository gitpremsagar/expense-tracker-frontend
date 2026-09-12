"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  listTransactions,
  listCategories,
  deleteTransaction,
  type Transaction,
  type Category,
  type CategoryType,
  type TransactionPagination,
} from "../../../lib/api";
import ConfirmDialog from "../../../components/ConfirmDialog";

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

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function TransactionsPage() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<TransactionPagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [month, setMonth] = useState(currentMonth());
  const [typeFilter, setTypeFilter] = useState<CategoryType | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await listTransactions(
        {
          month,
          type: typeFilter || undefined,
          categoryId: categoryFilter || undefined,
          page,
          limit: 20,
        },
        accessToken,
      );
      setTransactions(result.transactions);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, month, typeFilter, categoryFilter, page]);

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
      if (pagination) {
        setPagination({ ...pagination, total: pagination.total - 1 });
      }
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
          {pagination && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {pagination.total} transaction{pagination.total !== 1 ? "s" : ""}
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
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3">
        <input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as CategoryType | ""); setPage(1); }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
          <option value="SAVING">Saving</option>
          <option value="INVESTMENT">Investment</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 col-span-2 sm:col-span-1"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({TYPE_SHORT[cat.type]})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">No transactions found for this period.</p>
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
            {transactions.map((tx) => (
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
                  <Link
                    href={`/transactions/${tx.id}/edit`}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Previous
              </button>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Next
              </button>
            </div>
          )}
        </>
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
