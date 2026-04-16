"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, MapPin, BookOpen, School, GraduationCap, ChevronLeft, Pencil, Check, X, Trash2, AlertTriangle, Phone, Users, Zap, RefreshCw, Unlink, Share2 } from "lucide-react";
import UpgradeGate from "@/components/UpgradeGate";
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
  userId: string;
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

function formatTierName(tier?: string | null): string {
  const value = String(tier ?? "free").trim().toLowerCase();
  if (value === "free") return "Free";
  if (value === "essential") return "Essential";
  if (value === "pro") return "Pro";
  if (value === "ultra") return "Ultra";
  if (value === "admin") return "Admin";
  if (value === "disabled") return "Disabled";
  return "Free";
}

function ShareButton({
  aps,
  rating,
  fullName,
  grade,
  school,
  subjects,
  province,
  fieldOfInterest,
}: {
  aps: number;
  rating: string;
  fullName: string;
  grade: string;
  school: string;
  subjects: string[];
  province: string;
  fieldOfInterest: string;
}) {
  const [state, setState] = useState<"idle" | "loading">("idle");
  const supabase = createClient();

  // Pre-generate the image blob on mount so the first click doesn't have to wait.
  // navigator.share() requires a user gesture — any long await before it causes iOS Safari
  // to discard the gesture and silently block the share sheet.
  // By starting the fetch here, the promise is settled (or nearly so) by the time
  // the user taps the button, so the await in handleShare is near-instant.
  const blobPromiseRef = useRef<Promise<Blob | null> | null>(null);

  useEffect(() => {
    async function prefetch() {
      let universitiesQualified = 0;
      let programmesQualified = 0;
      let fundingAvailable = 0;

      try {
        let programmesQuery = supabase
          .from("faculties")
          .select("id, university_id", { count: "exact" })
          .lte("aps_minimum", aps);

        if (fieldOfInterest && fieldOfInterest !== "Not sure yet") {
          programmesQuery = programmesQuery.eq("field_of_study", fieldOfInterest);
        }

        const { data: qualifyingFaculties, count: programmesCount } = await programmesQuery;
        programmesQualified = programmesCount ?? 0;
        universitiesQualified = new Set(
          (qualifyingFaculties ?? []).map((f) => f.university_id)
        ).size;

        let bursariesQuery = supabase
          .from("bursaries")
          .select("id", { count: "exact" })
          .lte("minimum_aps", aps)
          .eq("is_active", true);

        if (province) {
          bursariesQuery = bursariesQuery.or(
            `provinces_eligible.cs.{"${province}"},provinces_eligible.cs.{"All"}`
          );
        }

        const { count: bursariesCount } = await bursariesQuery;
        fundingAvailable = bursariesCount ?? 0;
      } catch {
        // Stats are best-effort — missing counts still produce a valid card.
      }

      const params = new URLSearchParams({
        aps: String(aps),
        rating,
        fullName,
        grade,
        school,
        subjects: subjects.slice(0, 12).join("|"),
        universities: String(universitiesQualified),
        programmes: String(programmesQualified),
        funding: String(fundingAvailable),
      });

      const res = await fetch(`/api/share/card-image?${params}`);
      return res.ok ? res.blob() : null;
    }

    blobPromiseRef.current = prefetch().catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — props are stable for a profile session

  async function handleShare() {
    setState("loading");
    try {
      // Await the pre-generated blob. If mount prefetch already finished this
      // resolves in <1ms, preserving the iOS gesture context.
      const blob = await (blobPromiseRef.current ?? Promise.resolve(null));

      if (!blob) {
        setState("idle");
        return;
      }

      const filename = `${(fullName || "student").trim().replace(/\s+/g, "-").toLowerCase()}-aps-card.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "My APS Card - Baseform",
          text: `I calculated my APS on Baseform. Calculate yours here: ${window.location.origin}`,
          files: [file],
        });
      } else if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "My APS Card - Baseform",
          text: `I calculated my APS on Baseform. Calculate yours here: ${window.location.origin}`,
        });
      } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      setState("idle");
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
      {state === "loading" ? (
        <>
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-700 border-t-transparent" />
          Sharing…
        </>
      ) : (
        <>
          <Share2 size={12} />
          Share APS card
        </>
      )}
    </button>
  );
}

type ReferralInfo = {
  code: string;
  referralUrl: string;
  pending: number;
  unlocked: boolean;
  balance: number;
  windowDaysLeft: number | null;
  referralCount: number;
  unlockAt: number;
};

function InviteFriendCard() {
  const [info,    setInfo]    = useState<ReferralInfo | null>(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral")
      .then(r => r.json())
      .then((d: ReferralInfo) => setInfo(d))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function handleShare() {
    if (!info?.referralUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: "Join me on Baseform",
        text: "I'm using Baseform to track my university applications. Sign up with my link:",
        url: info.referralUrl,
      }).catch(() => undefined);
    } else {
      // Fallback to clipboard on browsers without Web Share API
      await navigator.clipboard.writeText(info.referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const pct = info ? Math.min(100, Math.round((info.pending / info.unlockAt) * 100)) : 0;

  return (
    <div className="mt-5 rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500">
            <Users size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Invite a Friend</p>
            <p className="text-[11px] text-gray-400">Earn 15 credits per sign-up</p>
          </div>
        </div>
        {info?.unlocked && (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            Unlocked
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-8 rounded-xl bg-gray-100 animate-pulse" />
      ) : info ? (
        <>
          {/* Referral link row */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
            <p className="flex-1 truncate text-xs text-gray-500">{info.referralUrl}</p>
            <button
              type="button"
              onClick={handleShare}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-600 transition-colors"
            >
              {copied ? <Check size={11} /> : <Share2 size={11} />}
              {copied ? "Copied!" : "Share"}
            </button>
          </div>

          {/* Progress or unlocked balance */}
          {info.unlocked ? (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-700">BaseBot access active</p>
                <p className="text-xs font-black text-emerald-700">{info.balance} credits left</p>
              </div>
              <p className="mt-1 text-[11px] text-emerald-600">
                Every new referral adds 15 credits directly to your balance.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1.5">
                <span>{info.pending}/{info.unlockAt} credits earned</span>
                {info.windowDaysLeft !== null ? (
                  <span className={info.windowDaysLeft <= 7 ? "text-amber-600" : "text-gray-400"}>
                    {info.windowDaysLeft}d left in window
                  </span>
                ) : info.pending > 0 ? (
                  <span className="text-red-500">Window expired</span>
                ) : null}
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                {info.referralCount === 0
                  ? "Share your link — get 15 credits for every friend who signs up."
                  : `${info.referralCount} friend${info.referralCount !== 1 ? "s" : ""} joined so far. Reach 120 credits within 30 days to unlock BaseBot.`}
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default function ProfileClient({ profile, aps, subjects, email, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const autoConnectTriggeredRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const profileIsEmpty = !profile?.full_name?.trim();
  const [isEditing, setIsEditing] = useState(profileIsEmpty);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Marks editing state
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const [editMarks, setEditMarks] = useState<{ subjectName: string; mark: number }[]>(subjects);
  const [marksSaving, setMarksSaving] = useState(false);
  const [marksError, setMarksError] = useState<string | null>(null);
  const [marksSuccess, setMarksSuccess] = useState(false);
  const [displaySubjects, setDisplaySubjects] = useState(subjects);
  const [displayAps, setDisplayAps] = useState(aps);
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
  const isFreePlan = String(displayProfile?.tier ?? "free").trim().toLowerCase() === "free";
  const isLoginEmailGmail = email.trim().toLowerCase().endsWith("@gmail.com");
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
    has_connection?: boolean;
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
  const [showGmailConnectReminder, setShowGmailConnectReminder] = useState(false);

  const gmailAutoRedirectSeenKey = `bf_gmail_autoredirect_seen_${userId}`;

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
      const mail = searchParams.get("mail");
      if (mail === "error") {
        setGmailBanner({ type: "warning", message: "Gmail connected, but we could not send the confirmation email." });
      } else if (mail === "skipped") {
        setGmailBanner({ type: "warning", message: "Gmail connected. Confirmation email is not configured yet." });
      } else {
        setGmailBanner({ type: "success", message: "Gmail connected successfully. Inbox tracking is now active." });
      }
      void refreshGmailStatus();
      router.replace("/profile");
    } else if (result === "error") {
      setGmailBanner({ type: "error", message: "Could not connect Gmail. Please try again." });
      router.replace("/profile");
    } else if (result === "locked") {
      setGmailBanner({ type: "warning", message: "Connect Gmail is available on paid plans only." });
      router.replace("/profile");
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (gmailStatus && !gmailStatus.connected && gmailStatus.inactive) {
      setGmailBanner({ type: "warning", message: "Your Gmail connection expired — reconnect to keep tracking." });
    }
  }, [gmailStatus]);

  useEffect(() => {
    if (autoConnectTriggeredRef.current) return;
    if (!isLoginEmailGmail) return;
    if (isFreePlan) return;
    if (gmailStatus === null) return;
    if (gmailStatus.connected) return;
    if (gmailStatus.has_connection) return;
    if (searchParams.get("gmail")) return;

    const autoRedirectAlreadySeen = window.localStorage.getItem(gmailAutoRedirectSeenKey) === "1";
    if (autoRedirectAlreadySeen) {
      setShowGmailConnectReminder(true);
      return;
    }

    window.localStorage.setItem(gmailAutoRedirectSeenKey, "1");

    autoConnectTriggeredRef.current = true;

    const timer = window.setTimeout(() => {
      void handleConnectGmail();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [gmailAutoRedirectSeenKey, gmailStatus, isFreePlan, isLoginEmailGmail, searchParams]);

  useEffect(() => {
    if (!isLoginEmailGmail || gmailStatus === null || isFreePlan) {
      setShowGmailConnectReminder(false);
      return;
    }
    if (autoConnectTriggeredRef.current) {
      setShowGmailConnectReminder(false);
      return;
    }
    if (gmailStatus.connected || gmailStatus.has_connection || gmailStatus.inactive) {
      setShowGmailConnectReminder(false);
      return;
    }
    if (searchParams.get("gmail")) {
      setShowGmailConnectReminder(false);
      return;
    }

    const autoRedirectAlreadySeen = window.localStorage.getItem(gmailAutoRedirectSeenKey) === "1";
    setShowGmailConnectReminder(autoRedirectAlreadySeen);
  }, [gmailAutoRedirectSeenKey, gmailStatus, isFreePlan, isLoginEmailGmail, searchParams]);

  async function handleConnectGmail() {
    if (isFreePlan) {
      setGmailBanner({ type: "warning", message: "Connect Gmail is available on paid plans. Upgrade to continue." });
      return;
    }

    setGmailLoading(true);
    setShowGmailConnectReminder(false);
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
    if (isFreePlan) {
      setGmailBanner({ type: "warning", message: "Email tracking is available on paid plans. Upgrade to continue." });
      return;
    }

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

  const connectButtonLabel = isLoginEmailGmail ? "Connect this Gmail" : "Connect Gmail";
  const reconnectButtonLabel = isLoginEmailGmail ? "Reconnect this Gmail" : "Reconnect Gmail";

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

  async function handleSaveMarks() {
    if (marksSaving) return;
    setMarksSaving(true);
    setMarksError(null);
    setMarksSuccess(false);

    const res = await fetch("/api/student-subjects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjects: editMarks.map((s) => ({ subject_name: s.subjectName, mark: s.mark })),
      }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMarksError(json.error ?? "Failed to save marks. Please try again.");
      setMarksSaving(false);
      return;
    }

    // Recalculate APS locally from updated marks
    const { calculateAPS, markToApsPoint } = await import("@/lib/aps/calculator");
    const newAps = calculateAPS(editMarks.map((s) => ({ name: s.subjectName, mark: s.mark })));
    const withPoints = editMarks.map((s) => ({ ...s, apsPoints: markToApsPoint(s.mark) }));

    setDisplaySubjects(withPoints);
    setDisplayAps(newAps);
    setMarksSuccess(true);
    setIsEditingMarks(false);
    setMarksSaving(false);
    router.refresh();
  }

  // Exclude Life Orientation for APS display — only show counted subjects
  const scoredSubjects = displaySubjects
    .filter(s => !s.subjectName.toLowerCase().includes("life orientation"))
    .sort((a, b) => b.apsPoints - a.apsPoints)
    .slice(0, 6);

  const loSubject = displaySubjects.find(s => s.subjectName.toLowerCase().includes("life orientation"));

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
                {gmailStatus?.connected && gmailStatus.email_address ? (
                  <p className="mt-1 truncate text-xs font-semibold text-green-600">
                    Connected Gmail: {gmailStatus.email_address}
                  </p>
                ) : null}
                <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold capitalize text-orange-600">
                  {formatTierName(displayProfile?.tier)} Plan
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

          {/* Share APS card */}
          <div className="mt-4 flex flex-wrap gap-2">
            <ShareButton
              aps={aps}
              rating={rating}
              fullName={displayProfile?.full_name || ""}
              grade={displayProfile?.grade_year || ""}
              school={displayProfile?.school_name || ""}
              subjects={subjects.map((subject) => subject.subjectName)}
              province={displayProfile?.province || ""}
              fieldOfInterest={displayProfile?.field_of_interest || ""}
            />
          </div>

          <InviteFriendCard />

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

          {showGmailConnectReminder && (
            <div
              className="mt-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between"
              role="status"
              aria-live="polite"
            >
              <p>
                We noticed you have not connected Gmail yet. Connect it to track application updates from your inbox.
              </p>
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={gmailLoading}
                className="inline-flex items-center justify-center rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                {gmailLoading ? "Redirecting..." : "Connect Gmail"}
              </button>
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

              {isFreePlan ? (
                <UpgradeGate
                  variant="card"
                  icon={<Mail size={18} className="text-orange-500" />}
                  feature="Email Tracker"
                  description="Upgrade to automatically track application status updates straight from your Gmail inbox."
                  bullets={[
                    "Auto-detect acceptance and rejection emails",
                    "Keep application statuses up to date hands-free",
                    "Get notified when an institution replies",
                  ]}
                />
              ) : gmailStatus === null ? (
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
                    {gmailLoading ? "Redirecting..." : reconnectButtonLabel}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isLoginEmailGmail ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
                      <p className="font-semibold">Your main account is a Gmail address.</p>
                      <p className="mt-1 text-[11px] text-blue-700">
                        Connect this mailbox to Baseform so we can scan it for application updates and send you reminders.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700">
                      <p className="font-semibold">Connect Gmail to turn on inbox tracking.</p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        We only scan the mailbox you connect here.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={gmailLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Zap size={14} />
                    {gmailLoading ? "Redirecting..." : connectButtonLabel}
                  </button>
                </div>
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
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-100">
                {displayProfile?.grade_year === "Grade 11" ? "Projected APS" : "Total APS"}
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-6xl font-black leading-none">{displayAps}</p>
                  <p className="mt-2 text-sm font-semibold text-orange-100">{apsRating(displayAps)}</p>
                </div>
                <div className="text-right text-xs font-medium text-orange-100">
                  <p>Best 6 subjects</p>
                  <p>excluding Life Orientation</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
                <p className="text-sm font-bold text-gray-900">
                  {displayProfile?.grade_year === "Grade 11" ? "Interim Marks" : "Subjects"}
                </p>
                {!isEditingMarks ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditMarks(displaySubjects);
                      setMarksError(null);
                      setMarksSuccess(false);
                      setIsEditingMarks(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Pencil size={12} />
                    Update marks
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingMarks(false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <X size={12} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMarks}
                      disabled={marksSaving}
                      className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      <Check size={12} />
                      {marksSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>

              {isEditingMarks ? (
                <div className="divide-y divide-gray-50">
                  {editMarks.map((s, i) => (
                    <div key={s.subjectName} className="flex items-center justify-between px-5 py-3 gap-3">
                      <p className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800">{s.subjectName}</p>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.mark || ""}
                        onChange={(e) =>
                          setEditMarks((prev) =>
                            prev.map((x, idx) => idx === i ? { ...x, mark: Number(e.target.value) } : x)
                          )
                        }
                        className="w-20 rounded-xl border border-gray-200 px-3 py-1.5 text-center text-sm font-bold text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  ))}
                  {marksError && (
                    <p className="px-5 py-3 text-xs text-red-500">{marksError}</p>
                  )}
                </div>
              ) : (
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
              )}

              {marksSuccess && !isEditingMarks && (
                <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-2.5">
                  <p className="text-xs font-semibold text-emerald-700">Marks updated — projected APS recalculated.</p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-orange-100 bg-orange-50 px-5 py-3">
                <p className="text-sm font-bold text-orange-700">Total APS</p>
                <p className="text-lg font-black text-orange-500">{displayAps}</p>
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
