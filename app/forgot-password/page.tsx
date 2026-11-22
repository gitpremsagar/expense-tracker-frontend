"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { forgotPasswordRequest } from "../../lib/api";
import { Logo } from "../../components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setDevResetUrl(null);
    try {
      const result = await forgotPasswordRequest(email);
      setMessage(result.message);
      if (result.devResetUrl) setDevResetUrl(result.devResetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request a reset link");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <Link href="/" className="mb-6 inline-flex">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Forgot password</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter the email you use for Money Tracker 365 and we&apos;ll send a reset link.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {message && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200">
              <p>{message}</p>
              {devResetUrl && (
                <p className="mt-2 break-all text-xs">
                  Development link:{" "}
                  <Link href={devResetUrl} className="font-semibold underline">
                    open reset page
                  </Link>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
