"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../lib/auth-context";
import {
  getDebt,
  deleteDebt,
  type Debt,
  type DebtType,
  type DebtStatus,
} from "../../../../lib/api";
import ConfirmDialog from "../../../../components/ConfirmDialog";

const TYPE_LABEL: Record<DebtType, string> = {
  TAKEN: "Debt Taken",
  GIVEN: "Debt Given",
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  ACTIVE: "Active",
  SETTLED: "Settled",
};

function typeBadgeClass(type: DebtType) {
  return type === "GIVEN"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

function statusBadgeClass(status: DebtStatus) {
  return status === "ACTIVE"
    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
}

function typeAmountClass(type: DebtType) {
  return type === "GIVEN"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const router = useRouter();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!accessToken || !id) return;
    void (async () => {
      setIsLoading(true);
      try {
        const d = await getDebt(id, accessToken);
        setDebt(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load debt");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accessToken, id]);

  async function handleDelete() {
    if (!accessToken || !debt) return;
    setIsDeleting(true);
    try {
      await deleteDebt(debt.id, accessToken);
      router.push("/debts");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete debt");
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/debts"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Debts
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Debt Details</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">View the full details of this debt.</p>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : debt ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Amount</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${typeAmountClass(debt.type)}`}>
                {formatAmount(debt.amount)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Type</p>
              <span
                className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeClass(debt.type)}`}
              >
                {TYPE_LABEL[debt.type]}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {debt.type === "TAKEN" ? "Lender Name" : "Borrower Name"}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {debt.partyName}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</p>
              <span
                className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(debt.status)}`}
              >
                {STATUS_LABEL[debt.status]}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Date & Time
              </p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">{formatDateTime(debt.date)}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Description</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {debt.description?.trim() ? debt.description : "—"}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href={`/debts/${debt.id}/edit`}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete debt"
        message="This debt will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        isConfirming={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isDeleting) setConfirmOpen(false);
        }}
      />
    </div>
  );
}
