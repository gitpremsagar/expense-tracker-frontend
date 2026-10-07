"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../lib/auth-context";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listCategoryGroups,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  type Category,
  type CategoryGroup,
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

const INPUT_CLASS =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

const SELECT_CLASS =
  "rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none ring-emerald-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

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

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`h-4 w-4 animate-spin rounded-full border-2 inline-block ${
        light ? "border-white/30 border-t-white" : "border-zinc-300 border-t-zinc-600"
      }`}
    />
  );
}

export default function CategoriesPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [activeType, setActiveType] = useState<CategoryType>("EXPENSE");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [categoryData, groupData] = await Promise.all([
        listCategories(accessToken),
        listCategoryGroups(accessToken),
      ]);
      setCategories(categoryData);
      setGroups(groupData);
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
      await fetchData();
    })();
  }, [fetchData]);

  function changeType(type: CategoryType) {
    setActiveType(type);
    setNewGroupId("");
    setEditingId(null);
    setEditingGroupId(null);
  }

  const filtered = categories.filter((c) => c.type === activeType);
  const typeGroups = groups.filter((g) => g.type === activeType);
  const sections: { id: string | null; name: string; items: Category[] }[] = [
    ...typeGroups.map((g) => ({
      id: g.id,
      name: g.name,
      items: filtered.filter((c) => c.groupId === g.id),
    })),
    {
      id: null,
      name: "Ungrouped",
      items: filtered.filter((c) => !c.groupId || !typeGroups.some((g) => g.id === c.groupId)),
    },
  ].filter((s) => s.id !== null || s.items.length > 0 || typeGroups.length === 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newName.trim()) return;
    setIsCreating(true);
    setActionError(null);
    try {
      const cat = await createCategory(
        { name: newName.trim(), type: activeType, groupId: newGroupId || null },
        accessToken,
      );
      setCategories((prev) => [...prev, cat]);
      setNewName("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!accessToken || !editName.trim()) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const updated = await updateCategory(id, { name: editName.trim() }, accessToken);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMove(id: string, groupId: string) {
    if (!accessToken) return;
    setMovingId(id);
    setActionError(null);
    try {
      const updated = await updateCategory(id, { groupId: groupId || null }, accessToken);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to move category");
    } finally {
      setMovingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteCategory(id, accessToken);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newGroupName.trim()) return;
    setIsCreatingGroup(true);
    setActionError(null);
    try {
      const group = await createCategoryGroup({ name: newGroupName.trim(), type: activeType }, accessToken);
      setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
      setNewGroupName("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  }

  async function handleUpdateGroup(id: string) {
    if (!accessToken || !editGroupName.trim()) return;
    setActionError(null);
    try {
      const updated = await updateCategoryGroup(id, { name: editGroupName.trim() }, accessToken);
      setGroups((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updated } : g)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingGroupId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to rename group");
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!accessToken) return;
    setDeletingGroupId(id);
    setActionError(null);
    try {
      await deleteCategoryGroup(id, accessToken);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setCategories((prev) => prev.map((c) => (c.groupId === id ? { ...c, groupId: null } : c)));
      if (newGroupId === id) setNewGroupId("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setDeletingGroupId(null);
    }
  }

  function renderCategoryRow(cat: Category) {
    return (
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
            <span className="flex-1 min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {cat.name}
            </span>
            {typeGroups.length > 0 ? (
              <select
                value={cat.groupId ?? ""}
                onChange={(e) => void handleMove(cat.id, e.target.value)}
                disabled={movingId === cat.id}
                className={`${SELECT_CLASS} max-w-[9rem] disabled:opacity-50`}
                title="Move to group"
              >
                <option value="">No group</option>
                {typeGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setEditingId(cat.id);
                setEditName(cat.name);
              }}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              title="Rename"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(cat.id)}
              disabled={deletingId === cat.id}
              className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
              title="Delete"
            >
              {deletingId === cat.id ? <Spinner /> : <TrashIcon />}
            </button>
          </>
        )}
      </li>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">Categories</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Organize your transactions by creating custom income, expense, saving, and investment categories.
        Put related categories into groups to see totals per group in reports.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["EXPENSE", "INCOME", "SAVING", "INVESTMENT"] as CategoryType[]).map((t) => (
          <CategoryTypeTab
            key={t}
            active={activeType === t}
            type={t}
            onClick={() => changeType(t)}
          />
        ))}
      </div>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          {TYPE_LABEL[activeType]} groups
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          e.g. &quot;Household&quot; for Grocery, Milk, Eggs.
        </p>

        <form onSubmit={handleCreateGroup} className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="New group name…"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            maxLength={50}
            required
            className={`flex-1 ${INPUT_CLASS}`}
          />
          <button
            type="submit"
            disabled={isCreatingGroup || !newGroupName.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
          >
            {isCreatingGroup ? <Spinner /> : <PlusIcon />}
            Add group
          </button>
        </form>

        {typeGroups.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {typeGroups.map((g) => {
              const count = filtered.filter((c) => c.groupId === g.id).length;
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {editingGroupId === g.id ? (
                    <>
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        maxLength={50}
                        autoFocus
                        className="w-32 rounded border border-zinc-300 px-1.5 py-0.5 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleUpdateGroup(g.id);
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleUpdateGroup(g.id)}
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{g.name}</span>
                      <span className="text-xs text-zinc-400">{count}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroupId(g.id);
                          setEditGroupName(g.name);
                        }}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Rename group"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteGroup(g.id)}
                        disabled={deletingGroupId === g.id}
                        className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40"
                        title="Delete group (categories are kept)"
                      >
                        {deletingGroupId === g.id ? <Spinner /> : <TrashIcon />}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">No groups yet.</p>
        )}
      </section>

      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          placeholder={`New ${activeType.toLowerCase()} category name…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={50}
          required
          className={`flex-1 min-w-[12rem] ${INPUT_CLASS}`}
        />
        {typeGroups.length > 0 ? (
          <select
            value={newGroupId}
            onChange={(e) => setNewGroupId(e.target.value)}
            className={INPUT_CLASS}
            title="Group"
          >
            <option value="">No group</option>
            {typeGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="submit"
          disabled={isCreating || !newName.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isCreating ? <Spinner light /> : <PlusIcon />}
          Add
        </button>
      </form>

      {actionError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>
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
      ) : typeGroups.length === 0 ? (
        <ul className="space-y-2">{filtered.map(renderCategoryRow)}</ul>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id ?? "ungrouped"}>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {section.name}
                <span className="font-normal normal-case text-zinc-400">
                  {section.items.length} {section.items.length === 1 ? "category" : "categories"}
                </span>
              </h3>
              {section.items.length > 0 ? (
                <ul className="space-y-2">{section.items.map(renderCategoryRow)}</ul>
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                  No categories in this group yet. Use the dropdown on a category to move it here.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
