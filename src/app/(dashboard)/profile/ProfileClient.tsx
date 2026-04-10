"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, MapPin, BookOpen, School, GraduationCap, ChevronLeft, Pencil, Check, X, Trash2, AlertTriangle, Phone, Users, Zap, RefreshCw, Unlink, Share2, Copy, Send } from "lucide-react";
import { apsRating } from "@/lib/aps/calculator";
import { createClient } from "@/lib/supabase/client";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Sibling", "Other"];

const FIELDS = [
  "Engineering & Technology",
  "Health Sciences & Medicine",
  "Business & Commerce",
  "Law",
  "Education & Teaching",
  "Arts, Design & Humanities",
  "Natural Sciences",
  "Social Sciences",
  "Agriculture & Environmental",
  "IT & Computer Science",
  "Not sure yet",
];

type Subject = {
  subjectName: string;
  mark: number;
  apsPoints: number;
};

type Profile = {
  full_name: string;
  province: string | null;
  field_of_interest: string | null;
  tier: string;
  grade_year: string | null;
  school_name: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
  guardian_email: string | null;
  guardian_whatsapp_number: string | null;
} | null;

type Props = {
  profile: Profile;
  aps: number;
  subjects: Subject[];
  email: string;
};

function MarkBadge({ mark }: { mark: number }) {
  const color =
    mark >= 80 ? "bg-emerald-50 text-emerald-700" :
    mark >= 70 ? "bg-green-50 text-green-700" :
    mark >= 60 ? "bg-lime-50 text-lime-700" :
    mark >= 50 ? "bg-amber-50 text-amber-700" :
    mark >= 40 ? "bg-orange-50 text-orange-700" :
    "bg-red-50 text-red-600";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${color}`}>{mark}%</span>
  );
}

function ShareButton() {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  async function handleShare() {
    setState("loading");
    try {
      const res = await fetch("/api/share");
      if (!res.ok) throw new Error();
      const { token } = await res.json();
      const url = `${window.location.origin}/share/${token}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "My APS Card — Baseform", url }).catch(() => {});
        setState("idle");
      } else {
        await navigator.clipboard.writeText(url);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      }
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60"
    >
      {state === "copied" ? <Check size={12} className="text-green-600" /> : <Share2 size={12} />}
      {state === "copied" ? "Link copied!" : state === "loading" ? "Loading…" : "Share APS card"}
    </button>
  );
}

function InviteGuardianButton({ hasGuardianEmail }: { hasGuardianEmail: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "copied">("idle");
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  async function handleInvite() {
    setState("loading");
    try {
      const res = await fetch("/api/parent/invite", { method: "POST" });
      const data = await res.json();
      setPortalUrl(data.portalUrl ?? null);
      setState("done");
    } catch {
      setState("idle");
    }
  }

  async function copyPortalLink() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setState("copied");
    setTimeout(() => setState("done"), 2000);
  }

  if (state === "done" || state === "copied") {
    return (
      <button
        onClick={copyPortalLink}
        className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
      >
        {state === "copied" ? <Check size={12} /> : <Copy size={12} />}
        {state === "copied" ? "Portal link copied!" : hasGuardianEmail ? "Email sent · Copy link" : "Copy guardian link"}
      </button>
    );
  }

  return (
    <button
      onClick={handleInvite}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
    >
      <Send size={12} />
      {state === "loading" ? "Sending…" : "Invite guardian"}
    </button>
  );
}

export default function ProfileClient({ profile, aps, subjects, email }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const profileIsEmpty = !profile?.full_name?.trim();
  const [isEditing, setIsEditing] = useState(profileIsEmpty);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    full_name: profile?.full_name ?? "",
    school_name: profile?.school_name ?? "",
    province: profile?.province ?? "",
    field_of_interest: profile?.field_of_interest ?? "",
    guardian_name: profile?.guardian_name ?? "",
    guardian_phone: profile?.guardian_phone ?? "",
    guardian_relationship: profile?.guardian_relationship ?? "Parent",
    guardian_email: profile?.guardian_email ?? "",
    guardian_whatsapp_number: profile?.guardian_whatsapp_number ?? "",
  });
  const [displayProfile, setDisplayProfile] = useState(profile);

  const firstName = displayProfile?.full_name?.split(" ")[0] ?? "Student";
  const rating = apsRating(aps);

  async function handleSaveProfile() {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editValues.full_name.trim(),
        school_name: editValues.school_name.trim() || null,
        province: editValues.province || null,
        field_of_interest: editValues.field_of_interest || null,
        guardian_name: editValues.guardian_name.trim() || null,
        guardian_phone: editValues.guardian_phone.trim() || null,
        guardian_relationship: editValues.guardian_relationship || null,
        guardian_email: editValues.guardian_email.trim() || null,
        guardian_whatsapp_number: editValues.guardian_whatsapp_number.trim() || null,
      })
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

    if (error) {
      setSaveError("Could not save changes. Please try again.");
      setIsSaving(false);
      return;
    }

    setDisplayProfile((prev) =>
      prev
        ? {
            ...prev,
            full_name: editValues.full_name.trim(),
            school_name: editValues.school_name.trim() || null,
            province: editValues.province || null,
            field_of_interest: editValues.field_of_interest || null,
            guardian_name: editValues.guardian_name.trim() || null,
            guardian_phone: editValues.guardian_phone.trim() || null,
            guardian_relationship: editValues.guardian_relationship || null,
            guardian_email: editValues.guardian_email.trim() || null,
            guardian_whatsapp_number: editValues.guardian_whatsapp_number.trim() || null,
          }
        : prev
    );
    setIsSaving(false);
    setIsEditing(false);
    router.refresh();
  }

  function handleCancelEdit() {
    setEditValues({
      full_name: displayProfile?.full_name ?? "",
      school_name: displayProfile?.school_name ?? "",
      province: displayProfile?.province ?? "",
      field_of_interest: displayProfile?.field_of_interest ?? "",
      guardian_name: displayProfile?.guardian_name ?? "",
      guardian_phone: displayProfile?.guardian_phone ?? "",
      guardian_relationship: displayProfile?.guardian_relationship ?? "Parent",
      guardian_email: displayProfile?.guardian_email ?? "",
      guardian_whatsapp_number: displayProfile?.guardian_whatsapp_number ?? "",
    });
    setSaveError(null);
    setIsEditing(false);
  }

  // ── Gmail connection ────────────────────────────────────────────────────────
  const searchParams = useSearchParams();

  type GmailStatus = {
    connected: boolean;
    inactive?: boolean;
    email_address?: string;
    last_scanned_at?: string | null;
    connected_since?: string | null;
  };
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);

  const lastGmailScanLabel = gmailStatus?.last_scanned_at
    ? new Date(gmailStatus.last_scanned_at).toLocaleString("en-ZA", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const [gmailScanMsg, setGmailScanMsg] = useState<string | null>(null);
  const [gmailBanner, setGmailBanner] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  async function refreshGmailStatus() {
    try {
      const res = await fetch("/api/email/status", { cache: "no-store" });
      if (!res.ok) {
        setGmailStatus({ connected: false, inactive: false });
        return;
      }
      const data = (await res.json()) as GmailStatus;
      setGmailStatus(data);
    } catch {
      setGmailStatus({ connected: false, inactive: false });
    }
  }

  useEffect(() => {
    void refreshGmailStatus();
  }, []);

  // Show feedback after OAuth redirect
  useEffect(() => {
    const result = searchParams.get("gmail");
    if (result === "connected") {
      setGmailBanner({ type: "success", message: "Gmail connected successfully. Inbox tracking is now active." });
      void refreshGmailStatus();
      router.replace("/profile");
    } else if (result === "error") {
      setGmailBanner({ type: "error", message: "Could not connect Gmail. Please try again." });
      router.replace("/profile");
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (gmailStatus && !gmailStatus.connected && gmailStatus.inactive) {
      setGmailBanner({ type: "warning", message: "Your Gmail connection expired — reconnect to keep tracking." });
    }
  }, [gmailStatus]);

  async function handleConnectGmail() {
    setGmailLoading(true);
    try {
      const res = await fetch("/api/email/connect");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setGmailBanner({ type: "error", message: "Could not start Gmail connection." });
    } catch {
      setGmailBanner({ type: "error", message: "Could not start Gmail connection." });
    } finally {
      setGmailLoading(false);
    }
  }

  async function handleScanNow() {
    setGmailLoading(true);
    setGmailScanMsg(null);
    const res = await fetch("/api/email/scan", { method: "POST" });
    if (res.ok) {
      setGmailScanMsg("Scan started — statuses will update shortly.");
    } else {
      setGmailScanMsg("Could not start scan. Please try again.");
    }
    setGmailLoading(false);
  }

  async function handleDisconnectGmail() {
    setGmailLoading(true);
    const res = await fetch("/api/email/disconnect", { method: "DELETE" });
    if (res.ok) {
      setGmailStatus({ connected: false, inactive: false });
      setGmailScanMsg(null);
      setGmailBanner({ type: "success", message: "Gmail disconnected." });
    } else {
      setGmailBanner({ type: "error", message: "Could not disconnect Gmail. Please try again." });
    }
    setGmailLoading(false);
  }
  // ── End Gmail connection ─────────────────────────────────────────────────────

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteConfirmWord = "DELETE";

  async function handleDeleteAccount() {
    if (isDeleting || deleteConfirmInput !== deleteConfirmWord) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await fetch("/api/account/delete", { method: "DELETE" });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setDeleteError(json.error ?? "Could not delete account. Please try again.");
      setIsDeleting(false);
      return;
    }

    // Account deleted — redirect to landing
    router.replace("/");
  }

  // Exclude Life Orientation for APS display — only show counted subjects
  const scoredSubjects = subjects
    .filter(s => !s.subjectName.toLowerCase().includes("life orientation"))
    .sort((a, b) => b.apsPoints - a.apsPoints)
    .slice(0, 6);

  const loSubject = subjects.find(s => s.subjectName.toLowerCase().includes("life orientation"));

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutError("Could not log out right now. Please try again.");
      setIsLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_10%_8%,rgba(251,146,60,0.16),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_38%_at_92%_16%,rgba(56,189,248,0.10),transparent_72%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-6 md:px-6 md:pt-8">
        <header className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-[0_16px_45px_rgba(249,115,22,0.12)] md:p-6">
          <button
            onClick={handleBack}
            className="mb-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            aria-label="Go back"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Student profile</p>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-orange-500 flex items-center justify-center">
                <span className="text-2xl font-black text-white">{firstName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
                  {displayProfile?.full_name ?? "-"}
                </h1>
                <p className="mt-0.5 truncate text-sm text-gray-500">{email}</p>
                <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold capitalize text-orange-600">
                  {displayProfile?.tier ?? "Free"} Plan
                </span>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-right sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-500">APS</p>
              <p className="text-2xl font-black leading-none text-orange-600">{aps}</p>
              <p className="mt-1 text-xs font-semibold text-orange-500">{rating}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
              Grade: <span className="font-semibold text-gray-800">{displayProfile?.grade_year ?? "-"}</span>
            </span>
            <span className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
              Province: <span className="font-semibold text-gray-800">{displayProfile?.province ?? "-"}</span>
            </span>
            <span className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
              Focus: <span className="font-semibold text-gray-800">{displayProfile?.field_of_interest ?? "-"}</span>
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700 sm:hidden">
            <span className="font-bold">APS {aps}</span> · {rating}
          </div>

          {/* Share APS card + Invite guardian */}
          <div className="mt-4 flex flex-wrap gap-2">
            <ShareButton />
            <InviteGuardianButton hasGuardianEmail={!!displayProfile?.guardian_email} />
          </div>

          {gmailBanner && (
            <div
              className={[
                "mt-4 rounded-2xl border px-4 py-3 text-sm",
                gmailBanner.type === "success" && "border-green-100 bg-green-50 text-green-700",
                gmailBanner.type === "error" && "border-red-100 bg-red-50 text-red-700",
                gmailBanner.type === "warning" && "border-amber-100 bg-amber-50 text-amber-700",
              ].filter(Boolean).join(" ")}
              role="status"
              aria-live="polite"
            >
              {gmailBanner.message}
            </div>
          )}
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-12">
          <section className="order-2 min-w-0 space-y-5 lg:order-1 lg:col-span-4">
            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">Personal Details</h2>

              {isEditing ? (
                <div className="mt-3 space-y-3">
                  {profileIsEmpty && (
                    <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5 text-xs text-orange-700">
                      Complete your profile so we can personalise your experience.
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-500">Full name</label>
                    <input
                      type="text"
                      value={editValues.full_name}
                      onChange={(e) => setEditValues((v) => ({ ...v, full_name: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">School name</label>
                    <input
                      type="text"
                      value={editValues.school_name}
                      onChange={(e) => setEditValues((v) => ({ ...v, school_name: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                      placeholder="School name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Province</label>
                    <select
                      value={editValues.province}
                      onChange={(e) => setEditValues((v) => ({ ...v, province: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                    >
                      <option value="">Select province</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Field of interest</label>
                    <select
                      value={editValues.field_of_interest}
                      onChange={(e) => setEditValues((v) => ({ ...v, field_of_interest: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                    >
                      <option value="">Select field</option>
                      {FIELDS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Parent / Guardian</p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Guardian full name</label>
                        <input
                          type="text"
                          value={editValues.guardian_name}
                          onChange={(e) => setEditValues((v) => ({ ...v, guardian_name: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                          placeholder="e.g. Nomsa Dlamini"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Relationship</label>
                        <select
                          value={editValues.guardian_relationship}
                          onChange={(e) => setEditValues((v) => ({ ...v, guardian_relationship: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                        >
                          {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Phone number</label>
                        <input
                          type="tel"
                          value={editValues.guardian_phone}
                          onChange={(e) => setEditValues((v) => ({ ...v, guardian_phone: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                          placeholder="e.g. 082 555 1234"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">WhatsApp number <span className="text-gray-400 font-normal">(if different)</span></label>
                        <input
                          type="tel"
                          value={editValues.guardian_whatsapp_number}
                          onChange={(e) => setEditValues((v) => ({ ...v, guardian_whatsapp_number: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                          placeholder="e.g. 082 555 1234"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                          type="email"
                          value={editValues.guardian_email}
                          onChange={(e) => setEditValues((v) => ({ ...v, guardian_email: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                          placeholder="parent@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  {saveError && (
                    <p className="text-xs text-red-500">{saveError}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSaving || !editValues.full_name.trim()}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check size={14} />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-3 divide-y divide-gray-100">
                    <InfoRow icon={<School size={16} />} label="School" value={displayProfile?.school_name} />
                    <InfoRow icon={<GraduationCap size={16} />} label="Grade" value={displayProfile?.grade_year} />
                    <InfoRow icon={<MapPin size={16} />} label="Province" value={displayProfile?.province} />
                    <InfoRow icon={<BookOpen size={16} />} label="Field of interest" value={displayProfile?.field_of_interest} />
                    <InfoRow icon={<Mail size={16} />} label="Email" value={email} />
                  </div>

                  {displayProfile?.guardian_name && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Parent / Guardian</p>
                      <div className="divide-y divide-gray-100">
                        <InfoRow icon={<Users size={16} />} label="Name" value={`${displayProfile.guardian_name} (${displayProfile.guardian_relationship ?? "Guardian"})`} />
                        <InfoRow icon={<Phone size={16} />} label="Phone" value={displayProfile.guardian_phone} />
                        {displayProfile.guardian_email && (
                          <InfoRow icon={<Mail size={16} />} label="Email" value={displayProfile.guardian_email} />
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Gmail connection card */}
            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                  <Mail size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Email Tracker</p>
                  <p className="text-[11px] text-gray-400">Auto-update statuses from your inbox</p>
                </div>
                {gmailStatus?.connected && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                )}
                {gmailStatus && !gmailStatus.connected && gmailStatus.inactive && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Expired
                  </span>
                )}
              </div>

              {gmailStatus === null ? (
                <div className="h-8 animate-pulse rounded-xl bg-gray-100" />
              ) : gmailStatus.connected ? (
                <div className="space-y-2">
                  <p className="truncate text-xs text-gray-500">{gmailStatus.email_address}</p>
                  {gmailStatus.last_scanned_at && (
                    <p className="text-[11px] text-gray-400">
                      Last scanned: {new Date(gmailStatus.last_scanned_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleScanNow}
                      disabled={gmailLoading}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <RefreshCw size={12} className={gmailLoading ? "animate-spin" : ""} />
                      Scan now
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGmail}
                      disabled={gmailLoading}
                      className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-400 hover:border-red-200 hover:text-red-500 disabled:opacity-60"
                    >
                      <Unlink size={12} />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : gmailStatus.inactive ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <p className="font-semibold">Your Gmail connection expired — reconnect to keep tracking.</p>
                    {gmailStatus.email_address && (
                      <p className="mt-1 truncate text-[11px] text-amber-700">Last connected: {gmailStatus.email_address}</p>
                    )}
                    <p className="mt-1 text-[11px] text-amber-700">
                      {lastGmailScanLabel
                        ? `Tracking last ran on ${lastGmailScanLabel}. Reconnect to resume automatic status updates.`
                        : "Tracking is paused until you reconnect Gmail."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={gmailLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Zap size={14} />
                    {gmailLoading ? "Redirecting..." : "Reconnect Gmail"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={gmailLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Zap size={14} />
                  {gmailLoading ? "Redirecting..." : "Connect Gmail"}
                </button>
              )}

              {gmailScanMsg && (
                <p className="mt-2 text-[11px] text-gray-500">{gmailScanMsg}</p>
              )}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
              {logoutError && (
                <p className="mt-2 text-center text-xs text-red-500">{logoutError}</p>
              )}
              <button
                type="button"
                onClick={() => { setShowDeleteModal(true); setDeleteConfirmInput(""); setDeleteError(null); }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
                Delete account
              </button>
            </div>
          </section>

          <section className="order-1 min-w-0 space-y-5 lg:order-2 lg:col-span-8">
            <div className="rounded-3xl bg-orange-500 p-5 text-white shadow-[0_16px_40px_rgba(249,115,22,0.35)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-100">Total APS</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-6xl font-black leading-none">{aps}</p>
                  <p className="mt-2 text-sm font-semibold text-orange-100">{rating}</p>
                </div>
                <div className="text-right text-xs font-medium text-orange-100">
                  <p>Best 6 subjects</p>
                  <p>excluding Life Orientation</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-5 py-3.5">
                <p className="text-sm font-bold text-gray-900">Subjects</p>
              </div>

              <div className="divide-y divide-gray-50">
                {scoredSubjects.map((s) => (
                  <div key={s.subjectName} className="flex items-center justify-between px-5 py-3">
                    <p className="flex-1 min-w-0 truncate pr-3 text-sm font-medium text-gray-800">
                      {s.subjectName}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <MarkBadge mark={s.mark} />
                      <span className="w-4 text-right text-xs font-black text-orange-500">{s.apsPoints}</span>
                      <span className="text-[10px] font-medium text-gray-400">pts</span>
                    </div>
                  </div>
                ))}

                {loSubject && (
                  <div className="flex items-center justify-between bg-gray-50/60 px-5 py-3">
                    <p className="flex-1 min-w-0 truncate pr-3 text-sm font-medium text-gray-400 line-through">
                      {loSubject.subjectName}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <MarkBadge mark={loSubject.mark} />
                      <span className="text-[10px] font-medium text-gray-400">excluded</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-orange-100 bg-orange-50 px-5 py-3">
                <p className="text-sm font-bold text-orange-700">Total APS</p>
                <p className="text-lg font-black text-orange-500">{aps}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900">Delete your account?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This permanently deletes your profile, subjects, applications, bursary tracking, and uploaded documents. <span className="font-semibold text-gray-700">This cannot be undone.</span>
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-xs font-medium text-gray-500">
                Type <span className="font-bold text-gray-700">{deleteConfirmWord}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteConfirmWord}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                autoFocus
              />
            </div>

            {deleteError && (
              <p className="mt-3 text-xs text-red-500">{deleteError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmInput !== deleteConfirmWord}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={14} />
                {isDeleting ? "Deleting..." : "Delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="w-22 shrink-0 text-xs font-medium text-gray-400 sm:w-26">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
        {value ?? "-"}
      </span>
    </div>
  );
}
