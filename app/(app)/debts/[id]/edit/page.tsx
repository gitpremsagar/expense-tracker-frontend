"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useAuth } from "../../../../../lib/auth-context";
import { getDebt, type Debt } from "../../../../../lib/api";
import DebtForm from "../../../../../components/DebtForm";

export default function EditDebtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) return;
    void (async () => {
      setIsLoading(true);
      try {
        const d = await getDebt(id, accessToken);
        setDebt(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load debt");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accessToken, id]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Edit Debt</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Update the debt details.</p>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : debt ? (
          <DebtForm debt={debt} />
        ) : null}
      </div>
    </div>
  );
}
