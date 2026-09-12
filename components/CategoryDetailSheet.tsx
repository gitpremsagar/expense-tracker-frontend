"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import {
  listTransactions,
  type CategoryBreakdownItem,
  type CategoryType,
  type Transaction,
} from "../lib/api";

export type ReportPeriod =
  | { kind: "month"; month: string }
  | { kind: "year"; year: number };

const TYPE_LABEL: Record<CategoryType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  SAVING: "Saving",
  INVESTMENT: "Investment",
};

function typeBadgeClass(type: CategoryType) {
  switch (type) {
    case "INCOME":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "EXPENSE":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "SAVING":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "INVESTMENT":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatAmount(amount: number, type: CategoryType) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
  return type === "INCOME" ? `+${formatted}` : `-${formatted}`;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function periodLabel(period: ReportPeriod) {
  if (period.kind === "year") return String(period.year);
  const [year, mon] = period.month.split("-");
  return new Date(parseInt(year!), parseInt(mon!) - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

async function listAllTransactions(
  params: { month?: string; year?: number; categoryId: string; type: CategoryType },
  accessToken: string,
): Promise<Transaction[]> {
  const limit = 100;
  const transactions: Transaction[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await listTransactions({ ...params, page, limit }, accessToken);
    transactions.push(...result.transactions);
    totalPages = result.pagination.totalPages;
    page += 1;
  }

  return transactions;
}

type SortKey = "date" | "amount";
type SortDirection = "asc" | "desc";

function sortTransactions(transactions: Transaction[], key: SortKey, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;
  return [...transactions].sort((a, b) => {
    if (key === "amount") return (a.amount - b.amount) * factor;
    return (new Date(a.date).getTime() - new Date(b.date).getTime()) * factor;
  });
}

export function CategoryDetailSheet({
  item,
  period,
  onClose,
}: {
  item: CategoryBreakdownItem;
  period: ReportPeriod;
  onClose: () => void;
}) {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listAllTransactions(
          {
            categoryId: item.id,
            type: item.type,
            ...(period.kind === "month" ? { month: period.month } : { year: period.year }),
          },
          accessToken,
        );
        if (!cancelled) setTransactions(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load transactions");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, item.id, item.type, period.kind, period.kind === "month" ? period.month : period.year]);

  const average = transactions.length > 0 ? item.total / transactions.length : 0;
  const sortedTransactions = useMemo(
    () => sortTransactions(transactions, sortKey, sortDirection),
    [transactions, sortKey, sortDirection],
  );

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("desc");
  }

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
        aria-labelledby="category-sheet-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {periodLabel(period)}
            </p>
            <h2 id="category-sheet-title" className="mt-1 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {item.name}
            </h2>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeClass(item.type)}`}>
              {TYPE_LABEL[item.type]}
            </span>
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

        <div className="grid grid-cols-3 gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total</p>
            <p className={`mt-0.5 text-sm font-semibold tabular-nums ${typeAmountClass(item.type)}`}>
              {formatCurrency(item.total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Share</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
              {item.percentage}%
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Average</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
              {isLoading ? "—" : formatCurrency(average)}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-zinc-200 animate-pulse dark:bg-zinc-800" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No transactions in this period.</p>
          ) : (
            <ul className="space-y-3">
              <li className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
                </p>
                <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
                  {(
                    [
                      { key: "date" as const, label: "Date" },
                      { key: "amount" as const, label: "Amount" },
                    ]
                  ).map((option) => {
                    const active = sortKey === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleSort(option.key)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "bg-emerald-500 text-white"
                            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {option.label}
                        {active ? (sortDirection === "asc" ? "↑" : "↓") : null}
                      </button>
                    );
                  })}
                </div>
              </li>
              {sortedTransactions.map((tx) => (
                <li key={tx.id}>
                  <article className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Date & time
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {formatDateTime(tx.date)}
                        </p>
                      </div>
                      <p className={`shrink-0 text-sm font-semibold tabular-nums ${typeAmountClass(tx.type)}`}>
                        {formatAmount(tx.amount, tx.type)}
                      </p>
                    </div>
                    <dl className="mt-3 space-y-2">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Note
                        </dt>
                        <dd className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                          {tx.note?.trim() ? tx.note : "—"}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="mt-3 inline-flex text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      Open transaction
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
