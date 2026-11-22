import type { CategoryType } from "../../lib/api";

export const TYPE_LABEL: Record<CategoryType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  SAVING: "Saving",
  INVESTMENT: "Investment",
};

export const TYPE_BADGE: Record<CategoryType, string> = {
  INCOME: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  EXPENSE: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  SAVING: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  INVESTMENT: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export function formatInr(amount: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
  }).format(amount);
}

export function formatShortDate(value: string): string {
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function confidenceLabel(value: number): string {
  if (value >= 0.85) return "High confidence";
  if (value >= 0.6) return "Check this";
  return "Low confidence";
}
