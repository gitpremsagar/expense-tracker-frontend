"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import {
  addStarterCategories,
  getMonthlyReport,
  listBudgets,
  listCategories,
  listDebts,
  listTransactions,
  type BudgetSummary,
  type BudgetsResult,
  type Debt,
  type MonthlyReport,
  type Transaction,
} from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";
import {
  Bar,
  DebtsCard,
  MoneyFlowCard,
  NetBalanceBanner,
  cardClass,
  formatCurrency,
} from "../../../components/MoneyFlow";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TopExpensesCard({ report }: { report: MonthlyReport }) {
  const expenses = report.categoryBreakdown
    .filter((c) => c.type === "EXPENSE")
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Where your money went</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Top expense categories</p>
        </div>
        <Link href="/reports" className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
          View report
        </Link>
      </div>
      {expenses.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No expenses this month.</p>
      ) : (
        <ul className="space-y-3">
          {expenses.map((item) => (
            <li key={item.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="truncate mr-2 text-zinc-700 dark:text-zinc-300">{item.name}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(item.total)}
                  </span>
                  <span className="w-10 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {item.percentage}%
                  </span>
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Bar value={item.total} scale={report.totalExpense} className="rounded-full bg-red-400" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BudgetCard({ summary }: { summary: BudgetSummary | null }) {
  if (!summary || summary.totalBudget == null) {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Monthly budget</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Not set for this month</p>
          </div>
          <Link href="/budgets" className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
            Set budget
          </Link>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          A monthly limit turns the report into a decision: how much is safe to spend next?
        </p>
      </div>
    );
  }

  const percentage = summary.percentage ?? 0;
  const width = Math.min(100, Math.max(0, percentage));
  const barClass = summary.overBudget
    ? "bg-red-500"
    : percentage >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Monthly budget</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatCurrency(summary.totalSpent)} of {formatCurrency(summary.totalBudget)}
          </p>
        </div>
        <Link href="/budgets" className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
          Manage
        </Link>
      </div>
      <p
        className={`text-2xl font-bold tabular-nums ${
          summary.overBudget ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {summary.overBudget
          ? `${formatCurrency(Math.abs(summary.remaining ?? 0))} over`
          : `${formatCurrency(summary.remaining ?? 0)} left`}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{percentage}% used</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function OnboardingCard({
  categoriesCount,
  totalTransactions,
  onAddStarters,
  isAddingStarters,
}: {
  categoriesCount: number;
  totalTransactions: number;
  onAddStarters: () => void;
  isAddingStarters: boolean;
}) {
  if (totalTransactions > 0) return null;

  const steps = [
    {
      title: "Add your categories",
      body:
        categoriesCount > 0
          ? `${categoriesCount} categories ready — edit them anytime.`
          : "Start with sensible categories for food, rent, salary and savings.",
      done: categoriesCount > 0,
      action:
        categoriesCount === 0 ? (
          <button
            type="button"
            onClick={onAddStarters}
            disabled={isAddingStarters}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isAddingStarters ? "Adding..." : "Add starter categories"}
          </button>
        ) : (
          <Link href="/categories" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Review categories
          </Link>
        ),
    },
    {
      title: "Record your first transaction",
      body: "Add one expense or income and the dashboard comes to life.",
      done: false,
      action: (
        <Link
          href="/transactions/new"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          Add transaction
        </Link>
      ),
    },
    {
      title: "Set a monthly budget",
      body: "Optional, but it makes the reports much more useful.",
      done: false,
      action: (
        <Link href="/budgets" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
          Set a budget
        </Link>
      ),
    },
  ];

  return (
    <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
        Welcome to Money Tracker 365
      </h2>
      <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
        Three small steps and your money picture is ready.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done
                  ? "bg-emerald-700 text-white"
                  : "bg-white text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800"
              }`}
              aria-hidden="true"
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{step.title}</p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70">{step.body}</p>
            </div>
            <div className="shrink-0 pt-0.5">{step.action}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Could not load this section";
}

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const { showToast } = useToast();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [budgets, setBudgets] = useState<BudgetsResult | null>(null);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingStarters, setIsAddingStarters] = useState(false);

  const month = currentMonth();
  const monthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  const loadDashboard = useCallback(async () => {
    if (!accessToken) return;

    const results = await Promise.allSettled([
      getMonthlyReport(month, accessToken),
      listTransactions({ page: 1, limit: 5 }, accessToken),
      listDebts({ status: "ACTIVE", limit: 100 }, accessToken),
      listBudgets(month, accessToken),
      listCategories(accessToken),
      listTransactions({ page: 1, limit: 1 }, accessToken),
    ]);

    const [reportResult, txResult, debtResult, budgetResult, categoryResult, countResult] = results;
    const failures: string[] = [];

    if (reportResult.status === "fulfilled") setReport(reportResult.value);
    else failures.push(errorMessage(reportResult.reason));

    if (txResult.status === "fulfilled") setRecentTransactions(txResult.value.transactions);
    else failures.push(errorMessage(txResult.reason));

    if (debtResult.status === "fulfilled") setDebts(debtResult.value.debts);
    else failures.push(errorMessage(debtResult.reason));

    if (budgetResult.status === "fulfilled") setBudgets(budgetResult.value);
    else failures.push(errorMessage(budgetResult.reason));

    if (categoryResult.status === "fulfilled") setCategoriesCount(categoryResult.value.length);
    else failures.push(errorMessage(categoryResult.reason));

    if (countResult.status === "fulfilled") {
      setTotalTransactions(countResult.value.pagination.total);
    } else {
      failures.push(errorMessage(countResult.reason));
    }

    setError(failures.length > 0 ? failures[0] ?? "Some data could not load" : null);
    setIsLoading(false);
  }, [accessToken, month]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) await loadDashboard();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  async function handleAddStarters() {
    if (!accessToken) return;
    setIsAddingStarters(true);
    try {
      const result = await addStarterCategories(accessToken);
      showToast(
        result.created > 0
          ? `Added ${result.created} starter categories`
          : "You already have categories",
      );
      await loadDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add starter categories", {
        tone: "error",
      });
    } finally {
      setIsAddingStarters(false);
    }
  }

  const debtTaken = debts.filter((d) => d.type === "TAKEN").reduce((sum, d) => sum + d.outstanding, 0);
  const debtGiven = debts.filter((d) => d.type === "GIVEN").reduce((sum, d) => sum + d.outstanding, 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Hello, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{monthLabel} summary</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <Link
            href="/transactions/new"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="flex-1">Some data could not load. {error}</span>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              void loadDashboard();
            }}
            className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && (
        <OnboardingCard
          categoriesCount={categoriesCount}
          totalTransactions={totalTransactions}
          onAddStarters={() => void handleAddStarters()}
          isAddingStarters={isAddingStarters}
        />
      )}

      {isLoading ? (
        <div className="space-y-4 mb-8">
          <div className="h-32 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : report ? (
        <div className="space-y-4 mb-8">
          <NetBalanceBanner netBalance={report.netBalance} label={monthLabel} />
          <MoneyFlowCard
            income={report.totalIncome}
            expense={report.totalExpense}
            saving={report.totalSaving}
            investment={report.totalInvestment}
            debtRepayment={report.totalDebtRepayment}
            debtRecovery={report.totalDebtRecovery}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopExpensesCard report={report} />
            <BudgetCard summary={budgets?.summary ?? null} />
          </div>
          <DebtsCard taken={debtTaken} given={debtGiven} />
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent Transactions</h2>
        <Link href="/transactions" className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error && recentTransactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Recent transactions could not load.
        </div>
      ) : recentTransactions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No transactions yet.</p>
          <Link href="/transactions/new" className="mt-2 inline-block text-sm text-emerald-700 underline dark:text-emerald-400">
            Add one
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {recentTransactions.map((tx) => (
            <li key={tx.id}>
              <Link
                href={`/transactions/${tx.id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-base ${
                    tx.type === "INCOME"
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : tx.type === "EXPENSE"
                        ? "bg-red-100 dark:bg-red-900/30"
                        : tx.type === "SAVING"
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-purple-100 dark:bg-purple-900/30"
                  }`}
                >
                  {tx.type === "EXPENSE" ? "↓" : tx.type === "INCOME" ? "↑" : tx.type === "SAVING" ? "🏦" : "📈"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {tx.category.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(tx.date)}</p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    tx.type === "INCOME"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : tx.type === "EXPENSE"
                        ? "text-red-600 dark:text-red-400"
                        : tx.type === "SAVING"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-purple-600 dark:text-purple-400"
                  }`}
                >
                  {tx.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { href: "/transactions/new", label: "Add Transaction", emoji: "+" },
          { href: "/budgets", label: "Budgets", emoji: "🎯" },
          { href: "/debts/new", label: "Add Debt", emoji: "💳" },
          { href: "/categories", label: "Categories", emoji: "🏷" },
          { href: "/reports/annual", label: "Annual Report", emoji: "📅" },
          { href: "/settings", label: "Settings", emoji: "⚙️" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-4 text-center hover:border-emerald-300 hover:bg-emerald-50 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/10"
          >
            <span className="text-xl" aria-hidden="true">{item.emoji}</span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
