"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts } from "echarts/core";
import type { CategoryBreakdownItem, CategoryType } from "../lib/api";
import { CategoryDetailSheet, type ReportPeriod } from "./CategoryDetailSheet";
import { AddTransactionSheet } from "./AddTransactionSheet";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

export function StatCard({
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

function useIsDarkMode() {
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

export function ReportSummaryCards({
  totalIncome,
  totalExpense,
  totalSaving,
  totalInvestment,
  netBalance,
}: {
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  totalInvestment: number;
  netBalance: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        label="Total Income"
        value={formatCurrency(totalIncome)}
        colorClass="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        label="Total Expense"
        value={formatCurrency(totalExpense)}
        colorClass="text-red-600 dark:text-red-400"
      />
      <StatCard
        label="Total Savings"
        value={formatCurrency(totalSaving)}
        colorClass="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="Total Investments"
        value={formatCurrency(totalInvestment)}
        colorClass="text-purple-600 dark:text-purple-400"
      />
      <StatCard
        label="Net Balance"
        value={`${netBalance >= 0 ? "+" : "-"}${formatCurrency(netBalance)}`}
        sub={netBalance >= 0 ? "Surplus" : "Deficit"}
        colorClass={
          netBalance >= 0
            ? "text-blue-600 dark:text-blue-400"
            : "text-red-600 dark:text-red-400"
        }
      />
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
