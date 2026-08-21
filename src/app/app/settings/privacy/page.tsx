"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Unlink, Trash2, ShieldAlert, AlertTriangle } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();

  // Email disconnect state
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectDone, setDisconnectDone] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Delete account state
  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm" | "deleting">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function disconnectEmail() {
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/email/disconnect", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setDisconnectError(body.error ?? "Could not disconnect email.");
        return;
      }
      setDisconnectDone(true);
    } catch {
      setDisconnectError("Could not disconnect email.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function deleteAccount() {
    setDeletePhase("deleting");
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setDeleteError(body.error ?? "Could not delete your account.");
        setDeletePhase("confirm");
        return;
      }
      // Session is already signed out server-side; redirect to home
      router.replace("/");
    } catch {
      setDeleteError("Could not delete your account. Please try again.");
      setDeletePhase("confirm");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-orange-500" />
          <h1 className="text-lg font-black text-gray-900">Privacy</h1>
        </div>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage your connected accounts and personal data.
        </p>
      </div>

      {/* Connected accounts */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Connected accounts</h2>
        <p className="mt-0.5 text-xs text-gray-400 mb-4">
          Services connected to your Baseform account.
        </p>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
              <Mail size={16} className="text-gray-600" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Email integration</p>
              <p className="text-xs text-gray-400">
                {disconnectDone ? "Disconnected" : "Used to track application updates via email."}
              </p>
            </div>
          </div>
          {!disconnectDone ? (
            <button
              type="button"
              onClick={disconnectEmail}
              disabled={isDisconnecting}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Unlink size={12} />
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500">
              Disconnected
            </span>
          )}
        </div>
        {disconnectError && (
          <p className="mt-2 text-xs font-semibold text-red-600">{disconnectError}</p>
        )}
      </div>

      {/* Data & POPIA */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Your data</h2>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          Baseform stores your profile, subjects, and application records to personalise your experience.
          Under POPIA you have the right to access, correct, or delete your personal information at any time.
        </p>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"
        >
          Read our Privacy Policy →
        </a>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 size={15} className="text-red-500" />
          <h2 className="text-sm font-bold text-red-600">Danger zone</h2>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Permanently delete your account and all associated data — profile, subjects, applications, vault documents, and billing history.
          <strong className="text-gray-700"> This cannot be undone.</strong>
        </p>

        {deletePhase === "idle" && (
          <button
            type="button"
            onClick={() => setDeletePhase("confirm")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={14} />
            Delete my account
          </button>
        )}

        {deletePhase === "confirm" && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                Are you sure? This will permanently erase your account and all your data.
              </p>
            </div>
            {deleteError && (
              <p className="text-xs font-semibold text-red-600">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                onClick={() => { setDeletePhase("idle"); setDeleteError(null); }}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deletePhase === "deleting" && (
          <p className="mt-4 text-sm font-semibold text-red-500">Deleting your account…</p>
        )}
      </div>
    </div>
  );
}
