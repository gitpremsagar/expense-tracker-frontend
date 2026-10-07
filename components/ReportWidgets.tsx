"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts } from "echarts/core";
import {
  Bar as ChartBar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryBreakdownItem, CategoryType, DailyTotalItem, MonthlyTotalItem } from "../lib/api";
import { CategoryDetailSheet, type ReportPeriod } from "./CategoryDetailSheet";
import { AddTransactionSheet } from "./AddTransactionSheet";
import { Bar, cardClass, formatCurrency, formatSigned, signedColor } from "./MoneyFlow";

export { formatCurrency };

echarts.use([PieChart, TooltipComponent, CanvasRenderer]);

const SLICE_COLORS = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#17becf",
  "#bcbd22",
  "#7f7f7f",
];

function sliceColor(index: number) {
  return SLICE_COLORS[index % SLICE_COLORS.length] ?? SLICE_COLORS[0];
}

export function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDark;
}

function CategoryPie({
  items,
  onSelect,
}: {
  items: CategoryBreakdownItem[];
  onSelect: (item: CategoryBreakdownItem) => void;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);
  const onSelectRef = useRef(onSelect);
  const itemsRef = useRef(items);
  const isDark = useIsDarkMode();

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const chart = echarts.init(element);
    chartInstance.current = chart;

    const onClick = (params: { dataIndex?: number }) => {
      const item = params.dataIndex == null ? undefined : itemsRef.current[params.dataIndex];
      if (item) onSelectRef.current(item);
    };
    chart.on("click", onClick);

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart.off("click", onClick);
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart) return;

    const labelColor = isDark ? "#e4e4e7" : "#3f3f46";
    const lineColor = isDark ? "#71717a" : "#a1a1aa";

    chart.setOption({
      animationDuration: 400,
      tooltip: {
        trigger: "item",
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        borderColor: isDark ? "#3f3f46" : "#e4e4e7",
        textStyle: { color: labelColor, fontSize: 12 },
        formatter: (params: { dataIndex?: number; name?: string; percent?: number }) => {
          const item = params.dataIndex == null ? undefined : items[params.dataIndex];
          const amount = item ? formatCurrency(item.total) : "";
          return `${params.name ?? ""}<br/>${amount} (${params.percent ?? 0}%)`;
        },
      },
      series: [
        {
          type: "pie",
          radius: ["38%", "62%"],
          center: ["50%", "50%"],
          cursor: "pointer",
          minShowLabelAngle: 12,
          avoidLabelOverlap: true,
          itemStyle: { borderColor: isDark ? "#18181b" : "#ffffff", borderWidth: 2 },
          label: {
            color: labelColor,
            fontSize: 11,
            formatter: "{b} {d}%",
            overflow: "truncate",
            width: 140,
          },
          labelLine: {
            length: 8,
            length2: 10,
            smooth: true,
            lineStyle: { color: lineColor },
          },
          labelLayout: { hideOverlap: true },
          data: items.map((item, index) => ({
            name: item.name,
            value: item.total,
            itemStyle: { color: sliceColor(index) },
          })),
        },
      ],
    });
  }, [items, isDark]);

  return <div ref={chartRef} className="h-64 w-full" />;
}

export function CategoryBreakdown({
  items,
  title,
  color,
  type,
  addLabel,
  onSelect,
  onAdd,
}: {
  items: CategoryBreakdownItem[];
  title: string;
  color: string;
  type: CategoryType;
  addLabel: string;
  onSelect: (item: CategoryBreakdownItem) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="flex-1 text-sm text-zinc-400 dark:text-zinc-500">No data</p>
      ) : (
        <div className="flex-1">
          <CategoryPie items={items} onSelect={onSelect} />
          <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="w-full rounded-lg px-1 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="mr-2 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sliceColor(index) }}
                  />
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
              </button>
            </li>
          ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/10 dark:hover:text-emerald-400"
      >
        Add {addLabel}
      </button>
    </div>
  );
}

export function ReportViewToggle() {
  const pathname = usePathname();
  const isAnnual = pathname.startsWith("/reports/annual");

  const tabs = [
    { href: "/reports", label: "Monthly", active: !isAnnual },
    { href: "/reports/annual", label: "Annual", active: isAnnual },
  ];

  return (
    <div className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab.active
              ? "bg-emerald-500 text-white"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export type PeriodTotals = {
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  totalInvestment: number;
  netBalance: number;
};

export type TrendBucket = {
  label: string;
  fullLabel: string;
  income: number;
  expense: number;
  saving: number;
  investment: number;
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function daysInMonth(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year!, mon!, 0).getDate();
}

export function fillDailyBuckets(month: string, dailyTotals: DailyTotalItem[]): TrendBucket[] {
  const [, mon] = month.split("-").map(Number);
  const byDay = new Map(dailyTotals.map((d) => [parseInt(d.date.slice(8, 10), 10), d]));
  return Array.from({ length: daysInMonth(month) }, (_, i) => {
    const day = i + 1;
    const d = byDay.get(day);
    return {
      label: String(day),
      fullLabel: `${day} ${MONTH_SHORT[mon! - 1]}`,
      income: d?.income ?? 0,
      expense: d?.expense ?? 0,
      saving: d?.saving ?? 0,
      investment: d?.investment ?? 0,
    };
  });
}

export function fillMonthlyBuckets(year: number, monthlyTotals: MonthlyTotalItem[]): TrendBucket[] {
  const byMonth = new Map(monthlyTotals.map((m) => [parseInt(m.month.slice(5, 7), 10), m]));
  return MONTH_SHORT.map((name, i) => {
    const m = byMonth.get(i + 1);
    return {
      label: name,
      fullLabel: `${name} ${year}`,
      income: m?.income ?? 0,
      expense: m?.expense ?? 0,
      saving: m?.saving ?? 0,
      investment: m?.investment ?? 0,
    };
  });
}

function outflowOf(b: TrendBucket) {
  return b.expense + b.saving + b.investment;
}

type ChangeSense = "higherIsGood" | "higherIsBad" | "neutral";

function changeColor(change: number, sense: ChangeSense) {
  if (change === 0 || sense === "neutral") return "text-zinc-500 dark:text-zinc-400";
  const good = sense === "higherIsGood" ? change > 0 : change < 0;
  return good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}

export function PeriodComparisonCard({
  current,
  previous,
  previousLabel,
}: {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  previousLabel: string;
}) {
  const rows: { label: string; key: keyof PeriodTotals; sense: ChangeSense; signed?: boolean }[] = [
    { label: "Income", key: "totalIncome", sense: "higherIsGood" },
    { label: "Expense", key: "totalExpense", sense: "higherIsBad" },
    { label: "Savings", key: "totalSaving", sense: "neutral" },
    { label: "Investments", key: "totalInvestment", sense: "neutral" },
    { label: "Net balance", key: "netBalance", sense: "higherIsGood", signed: true },
  ];

  return (
    <div className={cardClass}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Compared to {previousLabel}</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">How each total moved since the previous period</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 text-right font-medium">This period</th>
              <th className="pb-2 text-right font-medium">Previous</th>
              <th className="pb-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row) => {
              const cur = current[row.key];
              const prev = previous ? previous[row.key] : null;
              const change = prev == null ? null : cur - prev;
              const pct = prev == null || prev === 0 || change == null ? null : (change / Math.abs(prev)) * 100;
              return (
                <tr key={row.key}>
                  <td className="py-2 text-zinc-700 dark:text-zinc-300">{row.label}</td>
                  <td
                    className={`py-2 text-right font-semibold tabular-nums ${
                      row.signed ? signedColor(cur) : "text-zinc-900 dark:text-zinc-50"
                    }`}
                  >
                    {row.signed ? formatSigned(cur) : formatCurrency(cur)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                    {prev == null ? "—" : row.signed ? formatSigned(prev) : formatCurrency(prev)}
                  </td>
                  <td className={`py-2 text-right tabular-nums ${change == null ? "text-zinc-400" : changeColor(change, row.sense)}`}>
                    {change == null ? (
                      "—"
                    ) : change === 0 ? (
                      "No change"
                    ) : (
                      <>
                        {change > 0 ? "▲" : "▼"} {formatCurrency(change)}
                        {pct != null && <span className="ml-1 text-xs">({Math.abs(pct).toFixed(0)}%)</span>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InsightTile({
  label,
  value,
  detail,
  valueClass = "text-zinc-900 dark:text-zinc-50",
}: {
  label: string;
  value: string;
  detail?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums truncate ${valueClass}`}>{value}</p>
      {detail && <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{detail}</p>}
    </div>
  );
}

export function InsightsCard({
  mode,
  totals,
  categoryBreakdown,
  buckets,
  elapsed,
  projectDays,
}: {
  mode: "month" | "year";
  totals: PeriodTotals;
  categoryBreakdown: CategoryBreakdownItem[];
  buckets: TrendBucket[];
  elapsed: number;
  projectDays?: number;
}) {
  const { totalIncome: income, totalExpense: expense } = totals;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null;
  const expenseRatio = income > 0 ? (expense / income) * 100 : null;
  const unit = mode === "month" ? "day" : "month";

  const topCategory = categoryBreakdown
    .filter((c) => c.type === "EXPENSE")
    .reduce<CategoryBreakdownItem | null>((best, c) => (!best || c.total > best.total ? c : best), null);

  const peak = buckets.reduce<TrendBucket | null>(
    (best, b) => (b.expense > 0 && (!best || b.expense > best.expense) ? b : best),
    null,
  );

  const activeBuckets = buckets.filter((b) => b.income + outflowOf(b) > 0);
  const spendDays = buckets.slice(0, elapsed).filter((b) => b.expense > 0).length;
  const deficitMonths = activeBuckets.filter((b) => b.income - outflowOf(b) < 0).length;
  const avgDivisor = mode === "year" ? activeBuckets.length : elapsed;
  const avgSpend = avgDivisor > 0 ? expense / avgDivisor : 0;

  return (
    <div className={cardClass}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Key insights</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Quick read on your spending habits</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <InsightTile
          label="Savings rate"
          value={savingsRate == null ? "—" : `${savingsRate.toFixed(0)}%`}
          detail="Income left after expenses"
          valueClass={savingsRate == null ? undefined : signedColor(savingsRate)}
        />
        <InsightTile
          label="Expense to income"
          value={expenseRatio == null ? "—" : `${expenseRatio.toFixed(0)}%`}
          detail={expenseRatio != null && expenseRatio > 100 ? "Spending exceeds income" : "Share of income spent"}
          valueClass={
            expenseRatio != null && expenseRatio > 100 ? "text-red-600 dark:text-red-400" : undefined
          }
        />
        <InsightTile
          label={mode === "month" ? "Average daily spend" : "Average monthly spend"}
          value={formatCurrency(avgSpend)}
          detail={`Over ${avgDivisor} ${mode === "year" ? "active " : ""}${unit}${avgDivisor === 1 ? "" : "s"}`}
        />
        <InsightTile
          label="Biggest expense"
          value={topCategory ? topCategory.name : "—"}
          detail={topCategory ? `${formatCurrency(topCategory.total)} · ${topCategory.percentage}% of expenses` : undefined}
        />
        <InsightTile
          label={`Highest-spending ${unit}`}
          value={peak ? peak.fullLabel : "—"}
          detail={peak ? formatCurrency(peak.expense) : undefined}
        />
        {mode === "month" ? (
          <InsightTile
            label="Days with spending"
            value={`${spendDays} / ${elapsed}`}
            detail={elapsed > 0 ? `${Math.round((spendDays / elapsed) * 100)}% of days` : undefined}
          />
        ) : (
          <InsightTile
            label="Months in deficit"
            value={`${deficitMonths} / ${activeBuckets.length}`}
            detail="Out of months with activity"
            valueClass={deficitMonths > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
          />
        )}
        {projectDays != null && (
          <InsightTile
            label="Projected month-end expense"
            value={formatCurrency(avgSpend * projectDays)}
            detail={`At the current pace over ${projectDays} days`}
            valueClass={
              avgSpend * projectDays > income ? "text-red-600 dark:text-red-400" : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

const SERIES_COLORS = {
  income: "#10b981",
  expense: "#f87171",
  saving: "#3b82f6",
  investment: "#a855f7",
};

function compactCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${abs}`;
}

export function TrendChart({
  mode,
  buckets,
  elapsed = buckets.length,
}: {
  mode: "month" | "year";
  buckets: TrendBucket[];
  elapsed?: number;
}) {
  const isDark = useIsDarkMode();
  const gridColor = isDark ? "#27272a" : "#e5e7eb";
  const axisColor = isDark ? "#a1a1aa" : "#52525b";

  let cumIncome = 0;
  let cumOutflow = 0;
  const data = buckets.map((b, i) => {
    cumIncome += b.income;
    cumOutflow += outflowOf(b);
    const isFuture = i >= elapsed;
    const isEmpty = b.income + outflowOf(b) === 0;
    return {
      label: b.label,
      fullLabel: b.fullLabel,
      Income: b.income,
      Expense: b.expense,
      Saving: b.saving,
      Investment: b.investment,
      "Cumulative income": isFuture ? null : +cumIncome.toFixed(2),
      "Cumulative outflow": isFuture ? null : +cumOutflow.toFixed(2),
      Net: isFuture || isEmpty ? null : +(b.income - outflowOf(b)).toFixed(2),
    };
  });

  const nets = data.map((d) => d.Net ?? 0);
  const maxNet = Math.max(...nets, 0);
  const minNet = Math.min(...nets, 0);
  const zeroOffset = maxNet - minNet > 0 ? maxNet / (maxNet - minNet) : 0.5;

  return (
    <div className={cardClass}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {mode === "month" ? "Daily cash flow" : "Monthly cash flow"}
      </h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        {mode === "month"
          ? "Bars show each day's money in and out. Lines show running totals, so you can see when spending overtook income."
          : "Income against outflow each month. The line shows net balance: green above zero, red below."}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          {mode === "year" && (
            <defs>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset={zeroOffset} stopColor="#10b981" />
                <stop offset={zeroOffset} stopColor="#ef4444" />
              </linearGradient>
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: axisColor }}
            stroke={gridColor}
            interval={mode === "month" ? "preserveStartEnd" : 0}
          />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} stroke={gridColor} width={56} tickFormatter={compactCurrency} />
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" ? (name === "Net" ? formatSigned(value) : formatCurrency(value)) : String(value),
              name,
            ]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
            contentStyle={{
              fontSize: 12,
              backgroundColor: isDark ? "#18181b" : "#ffffff",
              borderColor: isDark ? "#3f3f46" : "#e4e4e7",
              color: isDark ? "#e4e4e7" : "#3f3f46",
            }}
            cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ChartBar dataKey="Income" fill={SERIES_COLORS.income} radius={[3, 3, 0, 0]} />
          <ChartBar dataKey="Expense" stackId="out" fill={SERIES_COLORS.expense} />
          <ChartBar dataKey="Saving" stackId="out" fill={SERIES_COLORS.saving} />
          <ChartBar dataKey="Investment" stackId="out" fill={SERIES_COLORS.investment} radius={[3, 3, 0, 0]} />
          {mode === "month" ? (
            <>
              <Line type="monotone" dataKey="Cumulative income" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="Cumulative outflow"
                stroke="#f87171"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
              />
            </>
          ) : (
            <Line type="linear" dataKey="Net" stroke="url(#netGradient)" strokeWidth={2.5} dot={{ r: 3 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyBreakdownTable({ buckets }: { buckets: TrendBucket[] }) {
  const maxAbsNet = Math.max(...buckets.map((b) => Math.abs(b.income - outflowOf(b))), 0);

  return (
    <div className={cardClass}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Month by month</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Income, outflow and what was left each month</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="pb-2 font-medium">Month</th>
              <th className="pb-2 text-right font-medium">Income</th>
              <th className="pb-2 text-right font-medium">Outflow</th>
              <th className="pb-2 text-right font-medium">Net</th>
              <th className="pb-2 text-right font-medium">Savings rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {buckets.map((b) => {
              const outflow = outflowOf(b);
              const net = b.income - outflow;
              const isEmpty = b.income + outflow === 0;
              const rate = b.income > 0 ? ((b.income - b.expense) / b.income) * 100 : null;
              return (
                <tr key={b.label} className={isEmpty ? "opacity-40" : undefined}>
                  <td className="py-2 text-zinc-700 dark:text-zinc-300">{b.label}</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(b.income)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(outflow)}
                  </td>
                  <td className="py-2 text-right">
                    <span className={`font-semibold tabular-nums ${isEmpty ? "text-zinc-500" : signedColor(net)}`}>
                      {isEmpty ? "—" : formatSigned(net)}
                    </span>
                    {!isEmpty && (
                      <div className="ml-auto mt-1 flex h-1.5 w-24 justify-end overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <Bar
                          value={Math.abs(net)}
                          scale={maxAbsNet}
                          className={`rounded-full ${net < 0 ? "bg-red-500" : "bg-emerald-500"}`}
                        />
                      </div>
                    )}
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums ${
                      rate == null ? "text-zinc-400" : signedColor(rate)
                    }`}
                  >
                    {rate == null ? "—" : `${rate.toFixed(0)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CategoryBreakdownGrid({
  items,
  period,
  onTransactionCreated,
}: {
  items: CategoryBreakdownItem[];
  period: ReportPeriod;
  onTransactionCreated: () => void;
}) {
  const [selected, setSelected] = useState<CategoryBreakdownItem | null>(null);
  const [addType, setAddType] = useState<CategoryType | null>(null);
  const incomeCategories = items.filter((c) => c.type === "INCOME");
  const expenseCategories = items.filter((c) => c.type === "EXPENSE");
  const savingCategories = items.filter((c) => c.type === "SAVING");
  const investmentCategories = items.filter((c) => c.type === "INVESTMENT");

  const cards: {
    type: CategoryType;
    items: CategoryBreakdownItem[];
    title: string;
    color: string;
    addLabel: string;
  }[] = [
    { type: "INCOME", items: incomeCategories, title: "Income by Category", color: "bg-emerald-500", addLabel: "income" },
    { type: "EXPENSE", items: expenseCategories, title: "Expenses by Category", color: "bg-red-400", addLabel: "expense" },
    { type: "SAVING", items: savingCategories, title: "Savings by Category", color: "bg-blue-500", addLabel: "saving" },
    { type: "INVESTMENT", items: investmentCategories, title: "Investments by Category", color: "bg-purple-500", addLabel: "investment" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        {cards.map((card) => (
          <div key={card.type} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <CategoryBreakdown
              items={card.items}
              title={card.title}
              color={card.color}
              type={card.type}
              addLabel={card.addLabel}
              onSelect={setSelected}
              onAdd={() => setAddType(card.type)}
            />
          </div>
        ))}
      </div>
      {selected ? (
        <CategoryDetailSheet item={selected} period={period} onClose={() => setSelected(null)} />
      ) : null}
      {addType ? (
        <AddTransactionSheet
          type={addType}
          period={period}
          onClose={() => setAddType(null)}
          onCreated={onTransactionCreated}
        />
      ) : null}
    </>
  );
}
