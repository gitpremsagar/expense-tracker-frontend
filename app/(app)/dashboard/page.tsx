"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { getMonthlyReport, listTransactions, listDebts, type MonthlyReport, type Transaction, type Debt } from "../../../lib/api";
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
        <Link href="/reports" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
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
                  <span className="w-10 text-right text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
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

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const month = currentMonth();
  const monthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  useEffect(() => {
    if (!accessToken) return;

    void (async () => {
      setIsLoading(true);
      try {
        const [rep, txResult, debtResult] = await Promise.all([
          getMonthlyReport(month, accessToken),
          listTransactions({ month, page: 1, limit: 5 }, accessToken),
          listDebts({ status: "ACTIVE", limit: 100 }, accessToken),
        ]);
        setReport(rep);
        setRecentTransactions(txResult.transactions);
        setDebts(debtResult.debts);
      } catch {
        // silently fail, show empty state
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accessToken, month]);

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
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopExpensesCard report={report} />
            <DebtsCard taken={debtTaken} given={debtGiven} />
          </div>
        </div>
      ) : null}

      {/* Recent transactions */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent Transactions</h2>
        <Link href="/transactions" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : recentTransactions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No transactions this month.</p>
          <Link href="/transactions/new" className="mt-2 inline-block text-sm text-emerald-600 underline dark:text-emerald-400">
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
                  {tx.type === "EXPENSE" ? "↓" : "↑"}
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
                      ? "text-emerald-600 dark:text-emerald-400"
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

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { href: "/transactions/new", label: "Add Transaction", emoji: "+" },
          { href: "/debts/new", label: "Add Debt", emoji: "💳" },
          { href: "/categories", label: "Categories", emoji: "🏷" },
          { href: "/reports", label: "Monthly Report", emoji: "📊" },
          { href: "/reports/annual", label: "Annual Report", emoji: "📅" },
          { href: "/debts", label: "All Debts", emoji: "📋" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-4 text-center hover:border-emerald-300 hover:bg-emerald-50 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/10"
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
