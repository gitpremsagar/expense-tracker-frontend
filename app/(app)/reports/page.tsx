"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../lib/auth-context";
import { getMonthlyReport, listDebts, type MonthlyReport, type Debt } from "../../../lib/api";
import {
  BreakdownSection,
  InsightsCard,
  PeriodComparisonCard,
  ReportViewToggle,
  TrendChart,
  daysInMonth,
  fillDailyBuckets,
} from "../../../components/ReportWidgets";
import { DebtsCard, MoneyFlowCard, NetBalanceBanner } from "../../../components/MoneyFlow";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

export default function ReportsPage() {
  const { accessToken } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [previousReport, setPreviousReport] = useState<MonthlyReport | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [reportData, previousData, debtData] = await Promise.all([
        getMonthlyReport(month, accessToken),
        getMonthlyReport(navigateMonth(month, -1), accessToken).catch(() => null),
        listDebts({ status: "ACTIVE", limit: 100 }, accessToken),
      ]);
      setReport(reportData);
      setPreviousReport(previousData);
      setDebts(debtData.debts);
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

  const buckets = report ? fillDailyBuckets(month, report.dailyTotals) : [];
  const hasActivity = (report?.dailyTotals.length ?? 0) > 0;
  const isCurrentMonth = month === currentMonth();
  const elapsedDays = isCurrentMonth ? new Date().getDate() : daysInMonth(month);
  const previousMonth = navigateMonth(month, -1);
  const previousHasData = previousReport != null && previousReport.dailyTotals.length > 0;
  const debtsTaken = debts.filter((d) => d.type === "TAKEN");
  const debtsGiven = debts.filter((d) => d.type === "GIVEN");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <ReportViewToggle />
      </div>

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
          <div className="h-36 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : report ? (
        <div className="space-y-6">
          <NetBalanceBanner
            netBalance={report.netBalance}
            label={monthLabel(month)}
            comparison={{
              previous: previousHasData ? previousReport.netBalance : null,
              label: monthLabel(previousMonth),
            }}
          />

          <MoneyFlowCard
            income={report.totalIncome}
            expense={report.totalExpense}
            saving={report.totalSaving}
            investment={report.totalInvestment}
          />

          {hasActivity ? (
            <>
              <div className="space-y-6">
                <PeriodComparisonCard
                  current={report}
                  previous={previousHasData ? previousReport : null}
                  previousLabel={monthLabel(previousMonth)}
                />
                <InsightsCard
                  mode="month"
                  totals={report}
                  categoryBreakdown={report.categoryBreakdown}
                  buckets={buckets}
                  elapsed={elapsedDays}
                  projectDays={isCurrentMonth ? daysInMonth(month) : undefined}
                />
              </div>
              <TrendChart mode="month" buckets={buckets} elapsed={elapsedDays} />
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No transaction data for this month.</p>
            </div>
          )}

          <BreakdownSection
            categories={report.categoryBreakdown}
            groups={report.groupBreakdown}
            period={{ kind: "month", month }}
            onTransactionCreated={() => void fetchReport()}
          />

          <DebtsCard
            taken={debtsTaken.reduce((sum, d) => sum + d.outstanding, 0)}
            given={debtsGiven.reduce((sum, d) => sum + d.outstanding, 0)}
            subtitle={`${debtsTaken.length} taken · ${debtsGiven.length} given (active)`}
          />
        </div>
      ) : null}
    </div>
  );
}
