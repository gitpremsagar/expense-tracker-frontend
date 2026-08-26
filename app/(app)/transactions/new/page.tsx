import TransactionForm from "../../../../components/TransactionForm";

export default function NewTransactionPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-lg">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Add Transaction</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Record a new income, expense, saving, or investment.
      </p>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <TransactionForm />
      </div>
    </div>
  );
}
