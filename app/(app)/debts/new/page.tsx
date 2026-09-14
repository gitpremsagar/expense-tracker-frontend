import DebtForm from "../../../../components/DebtForm";

export default function NewDebtPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Add Debt</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Record a debt you've taken from or given to someone.
      </p>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <DebtForm />
      </div>
    </div>
  );
}
