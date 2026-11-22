"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import { Logo } from "../components/Logo";

const features = [
  {
    title: "Know where it went",
    body: "Category and group breakdowns, daily cash flow and a clear monthly surplus or deficit.",
    icon: "📊",
  },
  {
    title: "Budgets that nudge",
    body: "Set a monthly limit, watch the bar fill, and get a warning before you overspend.",
    icon: "🎯",
  },
  {
    title: "Debts without the guesswork",
    body: "Track what you owe and what is owed to you, with every payment and the exact outstanding.",
    icon: "🤝",
  },
  {
    title: "Your money, your account",
    body: "No ads, no bank connection required. Reset your password, export your data, or delete your account anytime.",
    icon: "🔒",
  },
];

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo href="/" />
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-8 sm:pt-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Simple, private money tracking
            </p>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
              Every rupee, finally in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Money Tracker 365 keeps income, spending, savings, investments and debts together —
              with reports that answer “where did it go?” in seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="flex h-12 items-center justify-center rounded-full bg-emerald-700 px-7 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Create your free account
              </Link>
              <Link
                href="/login"
                className="flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-7 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                I already have an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
              Built for INR. No card required. Your data stays yours.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-emerald-200/40 blur-2xl dark:bg-emerald-900/20" />
            <div className="relative rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    This month
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    +₹48,351
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Surplus
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { label: "Income", value: "₹85,000", width: "100%", color: "bg-emerald-500" },
                  { label: "Expenses", value: "₹16,649", width: "20%", color: "bg-red-400" },
                  { label: "Savings", value: "₹5,000", width: "6%", color: "bg-blue-500" },
                  { label: "Investments", value: "₹10,000", width: "12%", color: "bg-purple-500" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">{row.label}</span>
                      <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {row.value}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: row.width }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                Budget check: <span className="font-semibold text-zinc-700 dark:text-zinc-200">₹21,000 left</span>{" "}
                across 4 categories this month.
              </div>
            </div>
          </div>
        </div>

        <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-2xl" aria-hidden="true">
                {feature.icon}
              </span>
              <h2 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {feature.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-zinc-500 sm:flex-row dark:text-zinc-500">
          <p>© {new Date().getFullYear()} Money Tracker 365</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
