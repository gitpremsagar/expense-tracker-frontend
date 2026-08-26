"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../lib/auth-context";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CategoryType,
} from "../../../lib/api";

const TYPE_LABEL: Record<CategoryType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  SAVING: "Saving",
  INVESTMENT: "Investment",
};

const TYPE_ACTIVE_CLASS: Record<CategoryType, string> = {
  INCOME: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  EXPENSE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SAVING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  INVESTMENT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function CategoryTypeTab({
  active,
  type,
  onClick,
}: {
  active: boolean;
  type: CategoryType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
        active ? TYPE_ACTIVE_CLASS[type] : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
      }`}
    >
      {TYPE_LABEL[type]}
    </button>
  );
}

function CategoryBadge({ type }: { type: CategoryType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_ACTIVE_CLASS[type]}`}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

export default function CategoriesPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeType, setActiveType] = useState<CategoryType>("EXPENSE");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await listCategories(accessToken);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      await fetchCategories();
    })();
  }, [fetchCategories]);

  const filtered = categories.filter((c) => c.type === activeType);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const cat = await createCategory({ name: newName.trim(), type: activeType }, accessToken);
      setCategories((prev) => [...prev, cat]);
      setNewName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!accessToken || !editName.trim()) return;
    setIsSaving(true);
    try {
      const updated = await updateCategory(id, { name: editName.trim() }, accessToken);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteCategory(id, accessToken);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Categories</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Organize your transactions by creating custom income, expense, saving, and investment categories.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["EXPENSE", "INCOME", "SAVING", "INVESTMENT"] as CategoryType[]).map((t) => (
          <CategoryTypeTab
            key={t}
            active={activeType === t}
            type={t}
            onClick={() => setActiveType(t)}
          />
        ))}
      </div>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder={`New ${activeType.toLowerCase()} category name…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={50}
          required
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={isCreating || !newName.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isCreating ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          Add
        </button>
      </form>

      {createError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{createError}</p>
      )}
      {deleteError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No {activeType.toLowerCase()} categories yet. Add one above.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {editingId === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={50}
                    className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleUpdate(cat.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleUpdate(cat.id)}
                    disabled={isSaving}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <CategoryBadge type={cat.type} />
                  <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditName(cat.name);
                    }}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    title="Rename"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(cat.id)}
                    disabled={deletingId === cat.id}
                    className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    {deletingId === cat.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 inline-block" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
