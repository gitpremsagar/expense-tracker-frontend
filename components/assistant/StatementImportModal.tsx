"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusTrap } from "../../lib/useFocusTrap";
import type { Category, CategoryType } from "../../lib/api";
import {
  commitStatementImport,
  discardStatementImport,
  getStatementImport,
  startStatementImport,
  type AssistantImportDetail,
  type AssistantImportRow,
  type AssistantImportSummary,
} from "../../lib/assistant";
import { formatShortDate, TYPE_LABEL } from "./format";

type EditableRow = {
  rowId: string;
  description: string;
  amount: string;
  date: string;
  categoryId: string;
  newCategoryName: string;
  newCategoryType: CategoryType;
  type: "EXPENSE" | "INCOME";
  status: AssistantImportRow["status"];
  confidence: number;
  include: boolean;
};

function toEditable(row: AssistantImportRow, categories: Category[]): EditableRow {
  const suggested = row.suggestedCategoryName
    ? categories.find(
        (category) => category.name.toLowerCase() === row.suggestedCategoryName?.toLowerCase(),
      )
    : undefined;

  return {
    rowId: row.id,
    description: row.description ?? "",
    amount: String(row.amount),
    date: row.date.slice(0, 10),
    categoryId: row.categoryId ?? suggested?.id ?? "",
    newCategoryName: "",
    newCategoryType: (row.categoryId
      ? categories.find((category) => category.id === row.categoryId)?.type
      : undefined) ?? (row.type === "INCOME" ? "INCOME" : "EXPENSE"),
    type: row.type,
    status: row.status,
    confidence: row.confidence,
    include: row.status !== "DUPLICATE" && row.confidence >= 0.6,
  };
}

const compactInput =
  "w-full min-w-0 rounded-md border border-zinc-300 px-1.5 py-1 text-xs text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

export function StatementImportModal({
  open,
  threadId,
  categories,
  accessToken,
  onClose,
  onCommitted,
}: {
  open: boolean;
  threadId: string | null;
  categories: Category[];
  accessToken: string;
  onClose: () => void;
  onCommitted: (result: { batchId: string; imported: number; undoUntil: string }) => void;
}) {
  const [summary, setSummary] = useState<AssistantImportSummary | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "review" | "duplicates">("all");
  const [bulkCategory, setBulkCategory] = useState("");

  const reset = useCallback(() => {
    setSummary(null);
    setRows([]);
    setError(null);
    setUploading(false);
    setLoadingRows(false);
    setCommitting(false);
    setFilter("all");
    setBulkCategory("");
  }, []);

  const handleClose = useCallback(() => {
    if (summary?.status === "PROCESSING") return;
    reset();
    onClose();
  }, [summary?.status, reset, onClose]);

  const containerRef = useFocusTrap(open, handleClose);

  const loadAllRows = useCallback(
    async (importId: string) => {
      setLoadingRows(true);
      try {
        const first = await getStatementImport(importId, accessToken, { page: 1, limit: 100 });
        const all = [...first.rows];
        for (let page = 2; page <= first.pagination.totalPages; page += 1) {
          const next = await getStatementImport(importId, accessToken, { page, limit: 100 });
          all.push(...next.rows);
        }
        setRows(all.map((row) => toEditable(row, categories)));
      } finally {
        setLoadingRows(false);
      }
    },
    [accessToken, categories],
  );

  useEffect(() => {
    if (!open || !summary || summary.status !== "PROCESSING") return;

    const timer = setInterval(async () => {
      try {
        const detail: AssistantImportDetail = await getStatementImport(summary.id, accessToken, {
          page: 1,
          limit: 1,
        });
        setSummary(detail.import);
        if (detail.import.status === "READY") {
          await loadAllRows(detail.import.id);
        }
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : "Could not check the import.");
      }
    }, 1_500);

    return () => clearInterval(timer);
  }, [open, summary, accessToken, loadAllRows]);

  async function handleFile(file: File) {
    if (!threadId) {
      setError("Start a conversation first, then upload the statement.");
      return;
    }

    setUploading(true);
    setError(null);
    setRows([]);
    try {
      const result = await startStatementImport({ file, threadId }, accessToken);
      setSummary(result);
      if (result.status === "READY") {
        await loadAllRows(result.id);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload that statement.");
    } finally {
      setUploading(false);
    }
  }

  const visibleRows = useMemo(() => {
    if (filter === "review") {
      return rows.filter(
        (row) =>
          row.status !== "DUPLICATE" &&
          (row.confidence < 0.6 || (!row.categoryId && !row.newCategoryName)),
      );
    }
    if (filter === "duplicates") return rows.filter((row) => row.status === "DUPLICATE");
    return rows;
  }, [rows, filter]);

  const selected = rows.filter((row) => row.include);
  const missingCategory = selected.find((row) => !row.categoryId && !row.newCategoryName.trim());

  function updateRow(rowId: string, patch: Partial<EditableRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.rowId !== rowId) return row;
        const next = { ...row, ...patch };
        if (patch.categoryId) {
          const category = categories.find((item) => item.id === patch.categoryId);
          if (category) next.type = category.type === "INCOME" ? "INCOME" : "EXPENSE";
        }
        return next;
      }),
    );
  }

  function selectAllNonDuplicates() {
    const visibleIds = new Set(visibleRows.map((row) => row.rowId));
    setRows((current) =>
      current.map((row) =>
        visibleIds.has(row.rowId)
          ? { ...row, include: row.status !== "DUPLICATE" && row.confidence >= 0.6 }
          : row,
      ),
    );
  }

  function clearSelection() {
    setRows((current) => current.map((row) => ({ ...row, include: false })));
  }

  function applyBulkCategory() {
    if (!bulkCategory) return;
    setRows((current) =>
      current.map((row) =>
        row.include
          ? {
              ...row,
              categoryId: bulkCategory,
              type:
                categories.find((category) => category.id === bulkCategory)?.type === "INCOME"
                  ? "INCOME"
                  : "EXPENSE",
            }
          : row,
      ),
    );
  }

  async function handleCommit() {
    if (!summary) return;
    if (missingCategory) {
      setError(
        `Choose a category for “${missingCategory.description || missingCategory.date}” before importing.`,
      );
      return;
    }
    if (selected.length === 0) {
      setError("Select at least one transaction.");
      return;
    }

    setCommitting(true);
    setError(null);
    try {
      const result = await commitStatementImport(
        summary.id,
        {
          clientRequestId: crypto.randomUUID(),
          rows: rows.map((row) => ({
            rowId: row.rowId,
            include: row.include,
            amount: Number(row.amount),
            ...(row.categoryId ? { categoryId: row.categoryId } : {}),
            ...(row.newCategoryName.trim()
              ? {
                  newCategoryName: row.newCategoryName.trim(),
                  newCategoryType: row.newCategoryType,
                }
              : {}),
            date: row.date,
            note: row.description,
          })),
        },
        accessToken,
      );
      onCommitted(result);
      handleClose();
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Could not import that statement.");
    } finally {
      setCommitting(false);
    }
  }

  async function handleDiscard() {
    if (!summary) return;
    try {
      await discardStatementImport(summary.id, accessToken);
    } catch {
      // If it is already gone, closing is still the right outcome.
    }
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close" onClick={handleClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="statement-import-title"
        tabIndex={-1}
        className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-6">
          <div>
            <h2 id="statement-import-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Import a bank statement
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              PDF, CSV or XLSX. Nothing is imported until you review and confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!summary ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <label className="flex w-full max-w-md cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-zinc-700 dark:bg-zinc-950/40 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/20">
              <svg className="h-10 w-10 text-emerald-700 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V4.5m0 0L7.5 9m4.5-4.5L16.5 9M4.5 19.5h15" />
              </svg>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {uploading ? "Uploading…" : "Choose a statement file"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                We read the pages, find the transactions, and flag duplicates. The original file is
                not stored.
              </span>
              <input
                type="file"
                accept=".pdf,.csv,.xlsx"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        ) : summary.status === "PROCESSING" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Reading your statement…</p>
            <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              This can take a little while for scanned PDFs. You can leave this open; the import
              keeps running.
            </p>
          </div>
        ) : summary.status === "FAILED" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">That statement could not be read</p>
            <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">
              {summary.error ?? "Try a clearer PDF, or upload a CSV export from your bank."}
            </p>
            <button
              type="button"
              onClick={() => {
                if (summary) void discardStatementImport(summary.id, accessToken).catch(() => {});
                reset();
              }}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Try another file
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-6">
              <div className="mr-auto min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {summary.filename}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {summary.rowCount} rows · {summary.duplicateCount} duplicates ·{" "}
                  {summary.pages ? `${summary.pages} pages` : summary.source}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {(["all", "review", "duplicates"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      filter === value
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {value === "all" ? "All" : value === "review" ? "Needs review" : "Duplicates"}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={selectAllNonDuplicates}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Select all non-duplicates
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950/40 sm:px-6">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Apply category to selected</span>
              <select
                value={bulkCategory}
                onChange={(event) => setBulkCategory(event.target.value)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">Choose…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({TYPE_LABEL[category.type]})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulkCategory}
                disabled={!bulkCategory || selected.length === 0}
                className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Apply
              </button>
              <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                {selected.length} selected
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {loadingRows ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600" />
                  Loading rows…
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                  Nothing in this view.
                </div>
              ) : (
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="w-10 px-2 py-2" />
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Description</th>
                      <th className="w-28 px-2 py-2">Amount</th>
                      <th className="w-28 px-2 py-2">Type</th>
                      <th className="w-56 px-2 py-2">Category</th>
                      <th className="w-24 px-2 py-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr
                        key={row.rowId}
                        className={`border-b border-zinc-100 text-xs dark:border-zinc-800 ${
                          row.status === "DUPLICATE"
                            ? "bg-red-50/50 dark:bg-red-950/10"
                            : row.confidence < 0.6
                              ? "bg-amber-50/50 dark:bg-amber-950/10"
                              : ""
                        }`}
                      >
                        <td className="px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={(event) => updateRow(row.rowId, { include: event.target.checked })}
                            aria-label={`Include ${row.description || "transaction"}`}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600"
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(event) => updateRow(row.rowId, { date: event.target.value })}
                            className={`${compactInput} w-32`}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            value={row.description}
                            maxLength={300}
                            onChange={(event) => updateRow(row.rowId, { description: event.target.value })}
                            className={compactInput}
                          />
                          {row.status === "DUPLICATE" && (
                            <span className="mt-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              Possible duplicate
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.amount}
                            onChange={(event) => updateRow(row.rowId, { amount: event.target.value })}
                            className={compactInput}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <select
                            value={row.type}
                            onChange={(event) =>
                              updateRow(row.rowId, { type: event.target.value as "EXPENSE" | "INCOME" })
                            }
                            className={compactInput}
                          >
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <select
                            value={row.categoryId || "__new__"}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === "__new__") {
                                updateRow(row.rowId, {
                                  categoryId: "",
                                  newCategoryName: row.newCategoryName || "",
                                });
                              } else {
                                updateRow(row.rowId, { categoryId: value, newCategoryName: "" });
                              }
                            }}
                            className={compactInput}
                          >
                            <option value="">Select…</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name} ({TYPE_LABEL[category.type]})
                              </option>
                            ))}
                            <option value="__new__">+ Create a new category</option>
                          </select>
                          {!row.categoryId && (
                            <div className="mt-1 flex gap-1">
                              <input
                                value={row.newCategoryName}
                                placeholder="New category name"
                                onChange={(event) =>
                                  updateRow(row.rowId, { newCategoryName: event.target.value })
                                }
                                className={compactInput}
                              />
                              <select
                                value={row.newCategoryType}
                                onChange={(event) =>
                                  updateRow(row.rowId, {
                                    newCategoryType: event.target.value as CategoryType,
                                  })
                                }
                                className={`${compactInput} w-28`}
                              >
                                {(["EXPENSE", "INCOME", "SAVING", "INVESTMENT"] as const).map((option) => (
                                  <option key={option} value={option}>
                                    {TYPE_LABEL[option]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <span
                            className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              row.confidence >= 0.85
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : row.confidence >= 0.6
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            }`}
                          >
                            {Math.round(row.confidence * 100)}%
                          </span>
                          <span className="mt-1 block text-[10px] text-zinc-400">
                            {formatShortDate(row.date)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {error && (
              <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-6">
              <p className="mr-auto text-xs text-zinc-500 dark:text-zinc-400">
                Import {selected.length} transaction{selected.length === 1 ? "" : "s"} ·{" "}
                {rows.length - selected.length} skipped
              </p>
              <button
                type="button"
                onClick={() => void handleDiscard()}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Discard import
              </button>
              <button
                type="button"
                onClick={() => void handleCommit()}
                disabled={committing || selected.length === 0 || loadingRows}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {committing ? "Importing…" : `Import ${selected.length}`}
              </button>
            </div>
          </>
        )}

        {error && !summary && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
