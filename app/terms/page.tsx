import Link from "next/link";
import { Logo } from "../../components/Logo";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/" className="inline-flex">
        <Logo />
      </Link>
      <h1 className="mt-8 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Terms of use</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Last updated: November 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Personal record keeping</h2>
          <p className="mt-2">
            Money Tracker 365 is a personal record-keeping tool. It is not a bank, lender, investment
            adviser or tax adviser. Decisions you make with the information shown here are your own.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Accuracy</h2>
          <p className="mt-2">
            Reports are calculated from what you enter. Double-check entries before relying on them
            for a loan, tax or investment decision. Always keep your own backups of important records.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your account</h2>
          <p className="mt-2">
            Keep your password private. You are responsible for activity in your account. If you
            believe it has been compromised, change the password and sign out of all devices.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Availability</h2>
          <p className="mt-2">
            We aim to keep the service available, but it may be interrupted for maintenance or by
            events outside our control. The service is provided as-is.
          </p>
        </section>
      </div>
    </main>
  );
}
