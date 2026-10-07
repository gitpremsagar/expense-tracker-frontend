"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../../lib/auth-context";
import { getAnnualReport, type AnnualReport } from "../../../../lib/api";
import {
  CategoryBreakdownGrid,
  InsightsCard,
  MonthlyBreakdownTable,
  PeriodComparisonCard,
  ReportViewToggle,
  TrendChart,
  fillMonthlyBuckets,
} from "../../../../components/ReportWidgets";
import { MoneyFlowCard, NetBalanceBanner } from "../../../../components/MoneyFlow";

function currentYear() {
  return new Date().getFullYear();
}

export default function AnnualReportPage() {
  const { accessToken } = useAuth();
  const [year, setYear] = useState(currentYear());
  const [report, setReport] = useState<AnnualReport | null>(null);
  const [previousReport, setPreviousReport] = useState<AnnualReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [data, previousData] = await Promise.all([
        getAnnualReport(year, accessToken),
        getAnnualReport(year - 1, accessToken).catch(() => null),
      ]);
      setReport(data);
      setPreviousReport(previousData);
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

  const hasActivityIn = (r: AnnualReport | null) =>
    r?.monthlyTotals.some((m) => m.income + m.expense + m.saving + m.investment > 0) ?? false;

  const hasActivity = hasActivityIn(report);
  const previousHasData = hasActivityIn(previousReport);
  const buckets = report ? fillMonthlyBuckets(year, report.monthlyTotals) : [];
  const elapsedMonths = year === currentYear() ? new Date().getMonth() + 1 : 12;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
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
            label={String(year)}
            comparison={{
              previous: previousHasData && previousReport ? previousReport.netBalance : null,
              label: String(year - 1),
            }}
          />

          <MoneyFlowCard
            income={report.totalIncome}
            expense={report.totalExpense}
            saving={report.totalSaving}
            investment={report.totalInvestment}
            subtitle="How this year's income was used"
          />

          {hasActivity ? (
            <>
              <div className="space-y-6">
                <PeriodComparisonCard
                  current={report}
                  previous={previousHasData ? previousReport : null}
                  previousLabel={String(year - 1)}
                />
                <InsightsCard
                  mode="year"
                  totals={report}
                  categoryBreakdown={report.categoryBreakdown}
                  buckets={buckets}
                  elapsed={elapsedMonths}
                />
              </div>
              <TrendChart mode="year" buckets={buckets} elapsed={elapsedMonths} />
              <MonthlyBreakdownTable buckets={buckets} />
            </>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-10 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No transaction data for this year.</p>
            </div>
          )}

          <CategoryBreakdownGrid
            items={report.categoryBreakdown}
            period={{ kind: "year", year }}
            onTransactionCreated={() => void fetchReport()}
          />
        </div>
      ) : null}
    </div>
  );
}
