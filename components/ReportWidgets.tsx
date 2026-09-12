"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategoryBreakdownItem } from "../lib/api";
import { CategoryDetailSheet, type ReportPeriod } from "./CategoryDetailSheet";

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

export function CategoryBreakdown({
  items,
  title,
  color,
  onSelect,
}: {
  items: CategoryBreakdownItem[];
  title: string;
  color: string;
  onSelect: (item: CategoryBreakdownItem) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">No data</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="w-full rounded-lg px-1 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
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
              </button>
            </li>
          ))}
        </ul>
      )}
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
}: {
  items: CategoryBreakdownItem[];
  period: ReportPeriod;
}) {
  const [selected, setSelected] = useState<CategoryBreakdownItem | null>(null);
  const incomeCategories = items.filter((c) => c.type === "INCOME");
  const expenseCategories = items.filter((c) => c.type === "EXPENSE");
  const savingCategories = items.filter((c) => c.type === "SAVING");
  const investmentCategories = items.filter((c) => c.type === "INVESTMENT");

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <CategoryBreakdown items={incomeCategories} title="Income by Category" color="bg-emerald-500" onSelect={setSelected} />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <CategoryBreakdown items={expenseCategories} title="Expenses by Category" color="bg-red-400" onSelect={setSelected} />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <CategoryBreakdown items={savingCategories} title="Savings by Category" color="bg-blue-500" onSelect={setSelected} />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <CategoryBreakdown items={investmentCategories} title="Investments by Category" color="bg-purple-500" onSelect={setSelected} />
        </div>
      </div>
      {selected ? (
        <CategoryDetailSheet item={selected} period={period} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
