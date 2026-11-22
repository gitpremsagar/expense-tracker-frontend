import Link from "next/link";
import { Logo } from "../../components/Logo";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/" className="inline-flex">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Privacy policy</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Last updated: November 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">What we store</h2>
          <p className="mt-2">
            We store the account details you provide (name and email), the transactions, categories,
            budgets and debts you enter, and the technical records needed to keep you signed in.
            We do not ask for bank credentials and we do not connect to your bank.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">How it is used</h2>
          <p className="mt-2">
            Your data is used only to provide the tracker: showing balances, reports, budgets and
            debt progress. We do not sell your data or use it for advertising.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your controls</h2>
          <p className="mt-2">
            You can update your name/email, change your password, sign out of all devices, and
            permanently delete your account and all of its data from Settings. You can export your
            transactions as CSV from the Transactions page.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Questions</h2>
          <p className="mt-2">
            For privacy requests, contact the account owner at the email address used to create
            your account.
          </p>
        </section>
      </div>
    </main>
  );
}
