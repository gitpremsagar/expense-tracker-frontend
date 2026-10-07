import Link from "next/link";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function formatSigned(amount: number) {
  return `${amount < 0 ? "-" : "+"}${formatCurrency(amount)}`;
}

export function signedColor(amount: number) {
  return amount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
}

export function percentOf(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

export const cardClass = "rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

export function Bar({ value, scale, className }: { value: number; scale: number; className: string }) {
  if (value <= 0 || scale <= 0) return null;
  return <div className={`h-full ${className}`} style={{ width: `${Math.min((value / scale) * 100, 100)}%` }} />;
}

export function NetBalanceBanner({
  netBalance,
  label,
  comparison,
}: {
  netBalance: number;
  label: string;
  comparison?: { previous: number | null; label: string };
}) {
  const isNegative = netBalance < 0;
  const delta = comparison?.previous == null ? null : netBalance - comparison.previous;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        isNegative
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Net Balance · {label}
      </p>
      <p className={`mt-1 text-3xl font-bold tabular-nums sm:text-4xl ${signedColor(netBalance)}`}>
        {formatSigned(netBalance)}
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {isNegative
          ? `Deficit: you spent ${formatCurrency(netBalance)} more than you earned`
          : "Surplus: you kept more than you spent"}
      </p>
      {comparison && (
        <p className="mt-2 text-sm">
          {delta == null ? (
            <span className="text-zinc-500 dark:text-zinc-400">No data for {comparison.label}</span>
          ) : (
            <>
              <span className={`font-semibold tabular-nums ${signedColor(delta)}`}>
                {delta < 0 ? "▼" : "▲"} {formatCurrency(delta)}
              </span>{" "}
              <span className="text-zinc-500 dark:text-zinc-400">vs {comparison.label}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export function MoneyFlowCard({
  income,
  expense,
  saving,
  investment,
  subtitle = "How this month's income was used",
}: {
  income: number;
  expense: number;
  saving: number;
  investment: number;
  subtitle?: string;
}) {
  const outflow = expense + saving + investment;
  const scale = Math.max(income, outflow);
  const overspent = outflow - income;

  const legend = [
    { label: "Income", value: income, dot: "bg-emerald-500", pct: null },
    { label: "Expense", value: expense, dot: "bg-red-500", pct: percentOf(expense, income) },
    { label: "Savings", value: saving, dot: "bg-blue-500", pct: percentOf(saving, income) },
    { label: "Investments", value: investment, dot: "bg-purple-500", pct: percentOf(investment, income) },
  ];

  return (
    <div className={cardClass}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Money Flow</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{subtitle}</p>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Income</span>
            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(income)}
            </span>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Bar value={income} scale={scale} className="bg-emerald-500" />
            {overspent > 0 && (
              <Bar
                value={overspent}
                scale={scale}
                className="bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.35)_0,rgba(239,68,68,0.35)_4px,transparent_4px,transparent_8px)]"
              />
            )}
          </div>
          {overspent > 0 && (
            <p className="mt-1 text-right text-xs font-medium text-red-600 dark:text-red-400">
              Overspent by {formatCurrency(overspent)}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Outflow</span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{formatCurrency(outflow)}</span>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Bar value={expense} scale={scale} className="bg-red-500" />
            <Bar value={saving} scale={scale} className="bg-blue-500" />
            <Bar value={investment} scale={scale} className="bg-purple-500" />
          </div>
        </div>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {legend.map((item) => (
          <li key={item.label} className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
            <div className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</span>
            </div>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {formatCurrency(item.value)}
            </p>
            {item.pct && <p className="text-xs text-zinc-400 dark:text-zinc-500">{item.pct} of income</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DebtsCard({
  taken,
  given,
  subtitle = "Active outstanding amounts",
}: {
  taken: number;
  given: number;
  subtitle?: string;
}) {
  const scale = taken + given;
  const net = given - taken;

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Debts</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <Link href="/debts" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
          All debts
        </Link>
      </div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-zinc-600 dark:text-zinc-400">
          You owe{" "}
          <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">{formatCurrency(taken)}</span>
        </span>
        <span className="text-zinc-600 dark:text-zinc-400">
          Owed to you{" "}
          <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(given)}
          </span>
        </span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Bar value={taken} scale={scale} className="bg-red-500" />
        <Bar value={given} scale={scale} className="bg-emerald-500" />
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Net position:{" "}
        <span className={`font-semibold tabular-nums ${signedColor(net)}`}>{formatSigned(net)}</span>
      </p>
    </div>
  );
}
