"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white mb-6">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Expense Tracker</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-center max-w-xs">
        Track your income and expenses, and get monthly reports.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="flex h-11 w-full items-center justify-center rounded-full border border-zinc-300 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
