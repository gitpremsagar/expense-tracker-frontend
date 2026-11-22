"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  deleteBudget,
  listBudgets,
  listCategories,
  upsertBudget,
  type BudgetItem,
  type BudgetsResult,
  type Category,
} from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";
import { formatCurrency } from "../../../components/MoneyFlow";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year!, mon! - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function navigateMonth(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year!, mon! - 1, 1);
  date.setMonth(date.getMonth() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

function progressClass(percentage: number) {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function BudgetRow({
  item,
  onSaved,
}: {
  item: BudgetItem;
  onSaved: () => void;
}) {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(item.amount));
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!accessToken) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("Enter a budget greater than zero", { tone: "error" });
      return;
    }
    setIsSaving(true);
    try {
      await upsertBudget({ month: item.month, scope: item.scope, amount: parsed }, accessToken);
      showToast("Budget updated");
      setEditing(false);
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save budget", { tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      await deleteBudget(item.id, accessToken);
      showToast("Budget removed");
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not remove budget", { tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  const width = Math.min(100, Math.max(0, item.percentage));

  return (
    <li className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {item.categoryName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatCurrency(item.spent)} spent of {formatCurrency(item.amount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold tabular-nums ${
              item.overBudget
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {item.overBudget
              ? `${formatCurrency(Math.abs(item.remaining))} over`
              : `${formatCurrency(item.remaining)} left`}
          </span>
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={isSaving}
            className="text-xs font-medium text-zinc-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${progressClass(item.percentage)}`} style={{ width: `${width}%` }} />
      </div>

      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">₹</span>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={`${inputClass} w-40`}
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </li>
  );
}

export default function BudgetsPage() {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<BudgetsResult | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalAmount, setTotalAmount] = useState("");
  const [isSavingTotal, setIsSavingTotal] = useState(false);

  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [budgets, cats] = await Promise.all([
        listBudgets(month, accessToken),
        listCategories(accessToken, "EXPENSE"),
      ]);
      setData(budgets);
      setCategories(cats);
      setTotalAmount(budgets.summary.totalBudget ? String(budgets.summary.totalBudget) : "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load budgets");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, month]);

  useEffect(() => {
    // Defer one microtask so the fetch (and its state updates) runs outside
    // the synchronous effect body.
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const budgetedScopes = useMemo(
    () => new Set((data?.budgets ?? []).map((budget) => budget.scope)),
    [data],
  );
  const availableCategories = categories.filter((category) => !budgetedScopes.has(category.id));

  async function saveTotal() {
    if (!accessToken) return;
    const parsed = Number(totalAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("Enter a monthly budget greater than zero", { tone: "error" });
      return;
    }
    setIsSavingTotal(true);
    try {
      await upsertBudget({ month, scope: "TOTAL", amount: parsed }, accessToken);
      showToast("Monthly budget saved");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save budget", { tone: "error" });
    } finally {
      setIsSavingTotal(false);
    }
  }

  async function addCategoryBudget() {
    if (!accessToken || !newCategoryId) {
      showToast("Choose a category first", { tone: "error" });
      return;
    }
    const parsed = Number(newAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("Enter a budget greater than zero", { tone: "error" });
      return;
    }
    setIsAdding(true);
    try {
      await upsertBudget({ month, scope: newCategoryId, amount: parsed }, accessToken);
      showToast("Category budget added");
      setNewCategoryId("");
      setNewAmount("");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add budget", { tone: "error" });
    } finally {
      setIsAdding(false);
    }
  }

  function changeMonth(next: string) {
    setIsLoading(true);
    setMonth(next);
  }

  const summary = data?.summary;
  const summaryPercentage = summary?.percentage ?? 0;
  const isCurrent = month === currentMonth();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Budgets</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Set a spending limit and see how the month is tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(navigateMonth(month, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            ‹
          </button>
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(event) => event.target.value && changeMonth(event.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={() => changeMonth(navigateMonth(month, 1))}
            disabled={isCurrent}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{monthLabel(month)}</p>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
          <button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">
            Retry
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Monthly budget</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  A limit for all expenses combined.
                </p>
              </div>
              {summary?.totalBudget != null && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    summary.overBudget
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : summaryPercentage >= 80
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  }`}
                >
                  {summary.overBudget
                    ? "Over budget"
                    : summaryPercentage >= 80
                      ? "Getting close"
                      : "On track"}
                </span>
              )}
            </div>

            {summary?.totalBudget != null ? (
              <div className="mt-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(summary.totalSpent)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      of {formatCurrency(summary.totalBudget)} ·{" "}
                      {summary.overBudget
                        ? `${formatCurrency(Math.abs(summary.remaining ?? 0))} over`
                        : `${formatCurrency(summary.remaining ?? 0)} left`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                    {summaryPercentage}%
                  </p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${progressClass(summaryPercentage)}`}
                    style={{ width: `${Math.min(100, Math.max(0, summaryPercentage))}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                No monthly budget yet. Set one below to start tracking.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Monthly limit
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-zinc-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={totalAmount}
                    onChange={(event) => setTotalAmount(event.target.value)}
                    placeholder="e.g. 30000"
                    className={`${inputClass} w-40`}
                  />
                </div>
              </label>
              <button
                type="button"
                onClick={() => void saveTotal()}
                disabled={isSavingTotal}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {isSavingTotal ? "Saving..." : summary?.totalBudget != null ? "Update" : "Set budget"}
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Category budgets</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Optional limits for the categories that matter most.
                </p>
              </div>
              <Link href="/categories" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
                Manage categories
              </Link>
            </div>

            {data?.budgets.length === 0 ? (
              <div className="mt-3 rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No category budgets yet.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {data?.budgets.map((item) => (
                  <BudgetRow key={item.id} item={item} onSaved={() => void load()} />
                ))}
              </ul>
            )}

            {availableCategories.length > 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Add a category budget</p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <select
                    value={newCategoryId}
                    onChange={(event) => setNewCategoryId(event.target.value)}
                    className={inputClass}
                    aria-label="Category"
                  >
                    <option value="">Choose category…</option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={newAmount}
                      onChange={(event) => setNewAmount(event.target.value)}
                      placeholder="Amount"
                      className={`${inputClass} w-32`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void addCategoryBudget()}
                    disabled={isAdding}
                    className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                  >
                    {isAdding ? "Adding..." : "Add budget"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
