"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  changePasswordRequest,
  deleteAccountRequest,
  logoutAllRequest,
  updateProfileRequest,
} from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { useToast } from "../../../components/ToastProvider";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfileRequest({ name: name.trim(), email: email.trim() });
      await refreshUser();
      showToast("Profile updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update profile", {
        tone: "error",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("The new passwords do not match", { tone: "error" });
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePasswordRequest({ currentPassword, newPassword });
      await logout();
      showToast("Password changed. Please sign in again.", { tone: "success" });
      router.push("/login");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not change password", {
        tone: "error",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleLogoutAll() {
    setIsLoggingOutAll(true);
    try {
      await logoutAllRequest();
      await logout();
      showToast("Signed out on all devices");
      router.push("/login");
    } catch (error) {
      await logout();
      showToast(error instanceof Error ? error.message : "Could not sign out everywhere", {
        tone: "error",
      });
      router.push("/login");
    } finally {
      setIsLoggingOutAll(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteAccountRequest(deletePassword);
      await logout();
      showToast("Your account and data were deleted", { tone: "success" });
      router.push("/");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete account", {
        tone: "error",
      });
      setConfirmDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const canDelete = Boolean(deletePassword) && deleteEmail.trim().toLowerCase() === user?.email.toLowerCase();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Manage your account, password and data.
      </p>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Profile</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            This is the name and email shown in the app.
          </p>
          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Password</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Changing your password signs you out everywhere for safety.
          </p>
          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className={inputClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  className={inputClass}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isChangingPassword ? "Updating..." : "Change password"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Sessions</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Use this if you signed in on a shared or lost device.
          </p>
          <button
            type="button"
            onClick={() => void handleLogoutAll()}
            disabled={isLoggingOutAll}
            className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {isLoggingOutAll ? "Signing out..." : "Sign out of all devices"}
          </button>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <h2 className="text-base font-semibold text-red-800 dark:text-red-300">Danger zone</h2>
          <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
            Permanently delete your account, transactions, categories, budgets, debts and payments.
            This cannot be undone. Export your data first if you need it.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-red-800 dark:text-red-300">
              Password
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-red-800 dark:text-red-300">
              Type your email to confirm
              <input
                value={deleteEmail}
                onChange={(event) => setDeleteEmail(event.target.value)}
                placeholder={user?.email}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => setConfirmDeleteOpen(true)}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete my account
            </button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete your account?"
        message="All of your data will be permanently deleted. This cannot be undone."
        confirmLabel="Delete account"
        isConfirming={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isDeleting) setConfirmDeleteOpen(false);
        }}
      />
    </div>
  );
}
