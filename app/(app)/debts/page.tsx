"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  listDebts,
  deleteDebt,
  type Debt,
  type DebtType,
  type DebtStatus,
  type DebtPagination,
} from "../../../lib/api";
import ConfirmDialog from "../../../components/ConfirmDialog";

const TYPE_LABEL: Record<DebtType, string> = {
  TAKEN: "Taken",
  GIVEN: "Given",
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  ACTIVE: "Active",
  SETTLED: "Settled",
};

function typeIconClass(type: DebtType) {
  return type === "GIVEN"
    ? "bg-emerald-100 dark:bg-emerald-900/30"
    : "bg-red-100 dark:bg-red-900/30";
}

function typeAmountClass(type: DebtType) {
  return type === "GIVEN"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

function typeIcon(type: DebtType) {
  return type === "GIVEN" ? "↑" : "↓";
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DebtsPage() {
  const { accessToken } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [pagination, setPagination] = useState<DebtPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<DebtType | "">("");
  const [statusFilter, setStatusFilter] = useState<DebtStatus | "">("");
  const [page, setPage] = useState(1);

  const fetchDebts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await listDebts(
        {
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        },
        accessToken,
      );
      setDebts(result.debts);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load debts");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, typeFilter, statusFilter, page]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      await fetchDebts();
    })();
  }, [fetchDebts]);

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setDeletingId(id);
    try {
      await deleteDebt(id, accessToken);
      setDebts((prev) => prev.filter((d) => d.id !== id));
      if (pagination) {
        setPagination({ ...pagination, total: pagination.total - 1 });
      }
      setPendingDeleteId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete debt");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Debts</h1>
          {pagination && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {pagination.total} debt{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link
          href="/debts/new"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as DebtType | ""); setPage(1); }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All types</option>
          <option value="TAKEN">Debt Taken</option>
          <option value="GIVEN">Debt Given</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as DebtStatus | ""); setPage(1); }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SETTLED">Settled</option>
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
      ) : debts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">No debts found.</p>
          <Link
            href="/debts/new"
            className="mt-3 inline-block text-sm text-emerald-600 underline dark:text-emerald-400"
          >
            Add your first debt
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {debts.map((debt) => (
              <li
                key={debt.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link
                  href={`/debts/${debt.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg ${typeIconClass(debt.type)}`}
                  >
                    {typeIcon(debt.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {debt.partyName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {TYPE_LABEL[debt.type]} · {formatDate(debt.date)} · {STATUS_LABEL[debt.status]}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-semibold tabular-nums ${typeAmountClass(debt.type)}`}
                    >
                      {formatAmount(debt.outstanding)}
                    </span>
                    {debt.paidAmount > 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {formatAmount(debt.paidAmount)} of {formatAmount(debt.amount)}{" "}
                        {debt.type === "TAKEN" ? "paid" : "received"}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 ml-1">
                  <Link
                    href={`/debts/${debt.id}/edit`}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(debt.id)}
                    disabled={deletingId === debt.id}
                    className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    {deletingId === debt.id ? (
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
        title="Delete debt"
        message="This debt will be permanently deleted. This cannot be undone."
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
