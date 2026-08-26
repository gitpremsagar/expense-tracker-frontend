"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import { getMonthlyReport, listTransactions, type MonthlyReport, type Transaction } from "../../../lib/api";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "blue" | "purple";
  icon: React.ReactNode;
}) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`inline-flex items-center justify-center rounded-xl p-2 mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const month = currentMonth();
  const monthLabel = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });

  useEffect(() => {
    if (!accessToken) return;

    void (async () => {
      setIsLoading(true);
      try {
        const [rep, txResult] = await Promise.all([
          getMonthlyReport(month, accessToken),
          listTransactions({ month, page: 1, limit: 5 }, accessToken),
        ]);
        setReport(rep);
        setRecentTransactions(txResult.transactions);
      } catch {
        // silently fail, show empty state
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accessToken, month]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Income"
            value={formatCurrency(report.totalIncome)}
            color="green"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            }
          />
          <StatCard
            label="Total Expense"
            value={formatCurrency(report.totalExpense)}
            color="red"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            }
          />
          <StatCard
            label="Total Savings"
            value={formatCurrency(report.totalSaving)}
            color="blue"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            }
          />
          <StatCard
            label="Total Investments"
            value={formatCurrency(report.totalInvestment)}
            color="purple"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatCard
            label="Net Balance"
            value={`${report.netBalance >= 0 ? "+" : ""}${formatCurrency(report.netBalance)}`}
            color={report.netBalance >= 0 ? "blue" : "red"}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
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
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/transactions/new", label: "Add Transaction", emoji: "+" },
          { href: "/categories", label: "Categories", emoji: "🏷" },
          { href: "/reports", label: "Monthly Report", emoji: "📊" },
          { href: "/transactions", label: "All Transactions", emoji: "📋" },
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
