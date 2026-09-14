"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDebt,
  updateDebt,
  deleteDebt,
  type Debt,
  type DebtType,
  type DebtStatus,
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import ConfirmDialog from "./ConfirmDialog";

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TYPE_LABEL: Record<DebtType, string> = {
  TAKEN: "Debt Taken",
  GIVEN: "Debt Given",
};

const STATUS_LABEL: Record<DebtStatus, string> = {
  ACTIVE: "Active",
  SETTLED: "Settled",
};

type Props = {
  debt?: Debt;
  defaultType?: DebtType;
  defaultDate?: Date;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function DebtForm({
  debt,
  defaultType,
  defaultDate,
  onSuccess,
  onCancel,
}: Props) {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<DebtType>(debt?.type ?? defaultType ?? "TAKEN");
  const [partyName, setPartyName] = useState(debt?.partyName ?? "");
  const [amount, setAmount] = useState(debt ? String(debt.amount) : "");
  const [description, setDescription] = useState(debt?.description ?? "");
  const [date, setDate] = useState(
    debt
      ? toLocalDatetimeValue(new Date(debt.date))
      : toLocalDatetimeValue(defaultDate ?? new Date()),
  );
  const [status, setStatus] = useState<DebtStatus>(debt?.status ?? "ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (!partyName.trim()) {
      setError("Please enter a party name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const isoDate = new Date(date).toISOString();

    try {
      if (debt) {
        await updateDebt(
          debt.id,
          {
            type,
            partyName: partyName.trim(),
            amount: parsedAmount,
            description: description.trim() || null,
            date: isoDate,
            status,
          },
          accessToken,
        );
      } else {
        await createDebt(
          {
            type,
            partyName: partyName.trim(),
            amount: parsedAmount,
            description: description.trim() || undefined,
            date: isoDate,
          },
          accessToken,
        );
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/debts");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !debt) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteDebt(debt.id, accessToken);
      router.push("/debts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete debt");
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
          {(["TAKEN", "GIVEN"] as DebtType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg py-2.5 text-sm font-medium transition-colors border ${
                type === t
                  ? t === "GIVEN"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-600 dark:text-emerald-400"
                    : "bg-red-50 border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Party Name */}
      <div>
        <label htmlFor="partyName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {type === "TAKEN" ? "Lender Name" : "Borrower Name"}
        </label>
        <input
          id="partyName"
          type="text"
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
          placeholder="Person or Bank name"
          required
          maxLength={200}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
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

      {/* Status (only show for edit) */}
      {debt && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as DebtStatus)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {(["ACTIVE", "SETTLED"] as DebtStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Description <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Add details about this debt..."
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
          {isSubmitting ? "Saving…" : debt ? "Update" : "Add Debt"}
        </button>
      </div>

      {debt ? (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting || isSubmitting}
          className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {isDeleting ? "Deleting…" : "Delete debt"}
        </button>
      ) : null}

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
    </form>
  );
}
