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
import { useAuth } from "../../../../lib/auth-context";
import { getAnnualReport, type AnnualReport } from "../../../../lib/api";
import {
  CategoryBreakdownGrid,
  ReportSummaryCards,
  ReportViewToggle,
  formatCurrency,
} from "../../../../components/ReportWidgets";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function currentYear() {
  return new Date().getFullYear();
}

export default function AnnualReportPage() {
  const { accessToken } = useAuth();
  const [year, setYear] = useState(currentYear());
  const [report, setReport] = useState<AnnualReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getAnnualReport(year, accessToken);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, year]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      await fetchReport();
    })();
  }, [fetchReport]);

  const hasActivity =
    report?.monthlyTotals.some((m) => m.income + m.expense + m.saving + m.investment > 0) ?? false;

  const chartData =
    report?.monthlyTotals.map((m) => ({
      month: MONTH_LABELS[parseInt(m.month.slice(5), 10) - 1] ?? m.month,
      Income: m.income,
      Expense: m.expense,
      Saving: m.saving,
      Investment: m.investment,
    })) ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-4">
        <ReportViewToggle />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setYear((y) => y - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          title="Previous year"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{year}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Annual Report</p>
        </div>
        <input
          type="number"
          min={1970}
          max={currentYear()}
          value={year}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10);
            if (!Number.isNaN(next)) setYear(Math.min(next, currentYear()));
          }}
          className="w-24 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= currentYear()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          title="Next year"
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
          <ReportSummaryCards
            totalIncome={report.totalIncome}
            totalExpense={report.totalExpense}
            totalSaving={report.totalSaving}
            totalInvestment={report.totalInvestment}
            netBalance={report.netBalance}
          />

          {hasActivity ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Monthly Trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
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
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No transaction data for this year.</p>
            </div>
          )}

          <CategoryBreakdownGrid items={report.categoryBreakdown} period={{ kind: "year", year }} />
        </div>
      ) : null}
    </div>
  );
}
