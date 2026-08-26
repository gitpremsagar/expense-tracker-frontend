"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../../../lib/auth-context";
import { getMonthlyReport, type MonthlyReport, type CategoryBreakdownItem } from "../../../lib/api";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function monthLabel(month: string) {
  const [year, mon] = month.split("-");
  return new Date(parseInt(year!), parseInt(mon!) - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function navigateMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(year!, mon! - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function StatCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string;
  value: string;
  sub?: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function CategoryBreakdown({ items, title, color }: { items: CategoryBreakdownItem[]; title: string; color: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No data</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate flex-1 mr-2">
                  {item.name}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 tabular-nums">
                  {formatCurrency(item.total)}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2 w-10 text-right tabular-nums">
                  {item.percentage}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { accessToken } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getMonthlyReport(month, accessToken);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, month]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      await fetchReport();
    })();
  }, [fetchReport]);

  const incomeCategories = report?.categoryBreakdown.filter((c) => c.type === "INCOME") ?? [];
  const expenseCategories = report?.categoryBreakdown.filter((c) => c.type === "EXPENSE") ?? [];
  const savingCategories = report?.categoryBreakdown.filter((c) => c.type === "SAVING") ?? [];
  const investmentCategories = report?.categoryBreakdown.filter((c) => c.type === "INVESTMENT") ?? [];

  const chartData =
    report?.dailyTotals.map((d) => ({
      date: d.date.slice(8),
      Income: d.income,
      Expense: d.expense,
      Saving: d.saving,
      Investment: d.investment,
    })) ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl">
      {/* Header with month navigator */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMonth((m) => navigateMonth(m, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          title="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{monthLabel(month)}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly Report</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={() => setMonth((m) => navigateMonth(m, 1))}
          disabled={month >= currentMonth()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          title="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
          <div className="h-60 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : report ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Total Income"
              value={formatCurrency(report.totalIncome)}
              colorClass="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Total Expense"
              value={formatCurrency(report.totalExpense)}
              colorClass="text-red-600 dark:text-red-400"
            />
            <StatCard
              label="Total Savings"
              value={formatCurrency(report.totalSaving)}
              colorClass="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              label="Total Investments"
              value={formatCurrency(report.totalInvestment)}
              colorClass="text-purple-600 dark:text-purple-400"
            />
            <StatCard
              label="Net Balance"
              value={`${report.netBalance >= 0 ? "+" : "-"}${formatCurrency(report.netBalance)}`}
              sub={report.netBalance >= 0 ? "Surplus" : "Deficit"}
              colorClass={
                report.netBalance >= 0
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-red-600 dark:text-red-400"
              }
            />
          </div>

          {/* Daily trend chart */}
          {chartData.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Daily Trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(value) => [typeof value === "number" ? formatCurrency(value) : String(value), ""]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Expense" fill="#f87171" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Saving" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Investment" fill="#a855f7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No transaction data for this month.</p>
            </div>
          )}

          {/* Category breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <CategoryBreakdown
                items={incomeCategories}
                title="Income by Category"
                color="bg-emerald-500"
              />
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <CategoryBreakdown
                items={expenseCategories}
                title="Expenses by Category"
                color="bg-red-400"
              />
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <CategoryBreakdown
                items={savingCategories}
                title="Savings by Category"
                color="bg-blue-500"
              />
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <CategoryBreakdown
                items={investmentCategories}
                title="Investments by Category"
                color="bg-purple-500"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
