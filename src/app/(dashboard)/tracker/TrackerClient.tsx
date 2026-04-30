"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Send,
  Shield,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { getUniversityLogo } from "@/lib/dashboard/universityLogos";

// ── Types ─────────────────────────────────────────────────────────────────────

type Faculty = { id: string | number; name: string };
type University = { id: string | number; name: string; abbreviation: string; logo_url: string | null; closing_date: string | null };

type Application = {
  id: string;
  status: string;
  notes: string | null;
  checklist: string[];
  applied_at: string;
  faculties: Faculty | null;
  universities: University | null;
};

type UniGroup = {
  uniKey: string;
  uni: University;
  apps: Application[];
};

type ActivityRow = {
  id: string;
  application_id: string;
  note: string;
  created_at: string;
};

type SubjectMark = { name: string; mark: number | null };

// ── Subject improvement helpers ───────────────────────────────────────────────

// APS point bands (excluding LO at the call site).
function apsPoint(mark: number): number {
  if (mark >= 80) return 7;
  if (mark >= 70) return 6;
  if (mark >= 60) return 5;
  if (mark >= 50) return 4;
  if (mark >= 40) return 3;
  if (mark >= 30) return 2;
  return 1;
}

// Pick a *reasonable* next goal — the next milestone that's at most ~10 points
// above the current mark, so a 54% student sees 60% before being asked to chase 80%.
function nextGoal(mark: number): number {
  if (mark >= 95) return 100;
  if (mark >= 85) return 90;
  if (mark >= 80) return 85;
  if (mark >= 70) return 80;
  if (mark >= 60) return 70;
  if (mark >= 50) return 60;
  if (mark >= 40) return 50;
  if (mark >= 30) return 40;
  return 35;
}

function improvementTip(mark: number): string {
  if (mark >= 80) return "Maintain — keep doing past papers and teach a classmate to lock it in.";
  if (mark >= 70) return "You're close to a distinction. Drill application questions and tighten exam timing.";
  if (mark >= 60) return "Push from good to great — full marks on routine questions, then tackle harder ones.";
  if (mark >= 50) return "Pinpoint your 2 weakest topics and rework them with past papers and your teacher.";
  if (mark >= 40) return "Do past papers weekly. Rewrite every question you got wrong until you can solve it cold.";
  if (mark >= 30) return "Go back to fundamentals — work through every textbook example before attempting tests.";
  return "Speak to your teacher about extra support and start with the basic concepts of each chapter.";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { id: "id_doc",     label: "Certified copy of ID / birth certificate" },
  { id: "matric",     label: "Matric results / NSC certificate" },
  { id: "form",       label: "Application form completed" },
  { id: "motivation", label: "Motivation letter written" },
  { id: "fee",        label: "Application fee paid" },
  { id: "reference",  label: "Reference letter obtained" },
  { id: "residence",  label: "Proof of residence ready" },
] as const;

type ChecklistId = (typeof CHECKLIST_ITEMS)[number]["id"];

const STATUS_RAIL = ["planning", "in_progress", "submitted"] as const;
const OUTCOMES    = ["accepted", "rejected", "waitlisted"] as const;
type RailStatus    = (typeof STATUS_RAIL)[number];
type OutcomeStatus = (typeof OUTCOMES)[number];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  planning:    { label: "Planning",    color: "text-gray-600",   bg: "bg-gray-100"   },
  in_progress: { label: "In Progress", color: "text-blue-600",   bg: "bg-blue-50"    },
  submitted:   { label: "Submitted",   color: "text-purple-600", bg: "bg-purple-50"  },
  accepted:    { label: "Accepted",    color: "text-green-700",  bg: "bg-green-50"   },
  rejected:    { label: "Rejected",    color: "text-red-600",    bg: "bg-red-50"     },
  waitlisted:  { label: "Waitlisted",  color: "text-amber-700",  bg: "bg-amber-50"   },
};

const ABBR_COLORS: Record<string, string> = {
  UWC:"bg-teal-600", SU:"bg-red-700", UP:"bg-blue-800", NWU:"bg-yellow-600",
  CPUT:"bg-blue-600", UCT:"bg-sky-700", WITS:"bg-blue-700", UJ:"bg-orange-600",
  DUT:"bg-green-700", TUT:"bg-rose-600",
};

// ── XP + level ────────────────────────────────────────────────────────────────

const STATUS_XP: Record<string, number> = {
  planning: 10, in_progress: 30, submitted: 60,
  accepted: 100, rejected: 50, waitlisted: 50,
};
const CHECKLIST_XP = 15;
const ACTIVITY_XP  = 10;
const MAX_ACT_XP   = 30; // cap per app

function calcXp(apps: Application[], activity: Record<string, ActivityRow[]>): number {
  return apps.reduce((sum, app) => {
    const statusXp = STATUS_XP[app.status] ?? 10;
    const checkXp  = (app.checklist?.length ?? 0) * CHECKLIST_XP;
    const actCount = Math.min(activity[app.id]?.length ?? 0, MAX_ACT_XP / ACTIVITY_XP);
    return sum + statusXp + checkXp + actCount * ACTIVITY_XP;
  }, 0);
}

const LEVELS = [
  { min: 0,   max: 99,  level: 1, title: "Starter"            },
  { min: 100, max: 249, level: 2, title: "Focused Applicant"  },
  { min: 250, max: 499, level: 3, title: "Momentum Builder"   },
  { min: 500, max: 799, level: 4, title: "Deadline Master"    },
  { min: 800, max: Infinity, level: 5, title: "Application Legend" },
];

function levelFromXp(xp: number) {
  return LEVELS.find((l) => xp >= l.min && xp <= l.max) ?? LEVELS[0];
}

function xpProgressPct(xp: number): number {
  const lvl = levelFromXp(xp);
  if (lvl.level === 5) return 100;
  const range = lvl.max - lvl.min + 1;
  return Math.round(((xp - lvl.min) / range) * 100);
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrackerClient({
  applications: initialApplications,
  activityRows: initialActivityRows,
  subjects = [],
}: {
  applications: Application[];
  activityRows: ActivityRow[];
  subjects?: SubjectMark[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [activityRows, setActivityRows]  = useState(initialActivityRows);

  const activityByApp = useMemo(() => {
    const map: Record<string, ActivityRow[]> = {};
    for (const row of activityRows) {
      if (!map[row.application_id]) map[row.application_id] = [];
      map[row.application_id].push(row);
    }
    return map;
  }, [activityRows]);

  // Group applications by university
  const uniGroups = useMemo((): UniGroup[] => {
    const map = new Map<string, UniGroup>();
    for (const app of applications) {
      if (!app.universities) continue;
      const key = String(app.universities.id);
      if (!map.has(key)) map.set(key, { uniKey: key, uni: app.universities, apps: [] });
      map.get(key)!.apps.push(app);
    }
    return Array.from(map.values());
  }, [applications]);

  const xp       = useMemo(() => calcXp(applications, activityByApp), [applications, activityByApp]);
  const lvl      = useMemo(() => levelFromXp(xp), [xp]);
  const xpPct    = useMemo(() => xpProgressPct(xp), [xp]);
  const nextXp   = lvl.level < 5 ? lvl.max + 1 : lvl.max;
  const totalDone = useMemo(
    () => {
      const doneUnis = new Set(
        applications
          .filter(a => ["submitted","accepted","rejected","waitlisted"].includes(a.status))
          .map(a => String(a.universities?.id))
      );
      return doneUnis.size;
    },
    [applications]
  );

  const achievements = useMemo(() => [
    { id:"first",     icon:"🎯", title:"First Mission",      hint:"Add your first university",           unlocked: applications.length >= 1 },
    { id:"move",      icon:"⚡", title:"On The Move",         hint:"Update any application status",       unlocked: applications.some(a => a.status !== "planning") },
    { id:"docs",      icon:"📋", title:"Paperwork Done",      hint:"Complete checklist on one application", unlocked: applications.some(a => a.checklist?.length >= CHECKLIST_ITEMS.length) },
    { id:"submitted", icon:"📬", title:"Submitted!",          hint:"Submit at least one application",     unlocked: applications.some(a => a.status === "submitted" || a.status === "accepted") },
    { id:"allin",     icon:"🔥", title:"Going All In",        hint:"Have 3 active applications",          unlocked: applications.length >= 3 },
    { id:"accepted",  icon:"🏆", title:"Accepted!",           hint:"Receive an acceptance offer",         unlocked: applications.some(a => a.status === "accepted") },
  ], [applications]);

  function updateApp(id: string, patch: Partial<Application>) {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }

  function addActivity(appId: string, entry: ActivityRow) {
    setActivityRows(prev => [entry, ...prev]);
  }

  return (
    <div className="overflow-x-hidden">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Progress</h1>
            <p className="text-sm text-gray-400 mt-0.5">Your application roadmap</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white">
              <Zap size={11} /> Lv {lvl.level} · {lvl.title}
            </span>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1.5">
            <span className="flex items-center gap-1"><Flame size={11} className="text-amber-500" />{xp} XP</span>
            <span>Next level: {nextXp} XP</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-orange-400 to-orange-500 transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span><span className="font-black text-gray-900">{uniGroups.length}</span> universities</span>
          <span className="text-gray-200">|</span>
          <span><span className="font-black text-gray-900">{applications.length}</span> programmes</span>
          <span className="text-gray-200">|</span>
          <span><span className="font-black text-orange-500">{achievements.filter(a => a.unlocked).length}</span> / {achievements.length} badges</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-4 sm:px-5">

        {/* ── University cards ── */}
        {uniGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-sm font-bold text-gray-500">No missions yet</p>
            <p className="mt-1 text-xs text-gray-400">Add universities from the Dashboard to start tracking your roadmap.</p>
          </div>
        ) : (
          uniGroups.map((group) => {
            // Merge activity from all apps in the group, sorted newest first
            const groupActivity = group.apps
              .flatMap(a => activityByApp[a.id] ?? [])
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            // Shared checklist lives on the first app
            const firstApp = group.apps[0];
            return (
              <UniCard
                key={group.uniKey}
                group={group}
                activity={groupActivity}
                sharedChecklist={firstApp?.checklist ?? []}
                onUpdateApp={updateApp}
                onAddActivity={addActivity}
              />
            );
          })
        )}

        {/* ── Subject improvement targets ── */}
        <SubjectImprovementCard subjects={subjects} />

        {/* ── Achievements ── */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} className="text-amber-500" />
            <p className="text-sm font-bold text-gray-900">Badges</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={[
                  "rounded-xl border px-3 py-2.5",
                  a.unlocked
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-100 bg-gray-50 opacity-50",
                ].join(" ")}
              >
                <span className="text-lg">{a.icon}</span>
                <p className={`mt-1 text-xs font-bold ${a.unlocked ? "text-gray-900" : "text-gray-500"}`}>
                  {a.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {a.unlocked ? "Unlocked" : a.hint}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── UniCard ───────────────────────────────────────────────────────────────────

function UniCard({
  group,
  activity,
  sharedChecklist,
  onUpdateApp,
  onAddActivity,
}: {
  group: UniGroup;
  activity: ActivityRow[];
  sharedChecklist: string[];
  onUpdateApp: (id: string, patch: Partial<Application>) => void;
  onAddActivity: (appId: string, entry: ActivityRow) => void;
}) {
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [activityOpen,  setActivityOpen]  = useState(true);
  const [noteInput,     setNoteInput]     = useState("");
  const [saving,        setSaving]        = useState(false);

  const { uni, apps } = group;
  const abbr    = uni.abbreviation ?? "UNI";
  const logoUrl = getUniversityLogo(abbr, uni.logo_url ?? null);
  const color   = ABBR_COLORS[abbr] ?? "bg-gray-600";
  const days    = daysUntil(uni.closing_date ?? null);
  const checklist = sharedChecklist;
  const checkPct  = Math.round((checklist.length / CHECKLIST_ITEMS.length) * 100);

  async function setStatus(appId: string, status: string) {
    onUpdateApp(appId, { status });
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function toggleChecklist(itemId: string) {
    const next = checklist.includes(itemId)
      ? checklist.filter(i => i !== itemId)
      : [...checklist, itemId];
    // Sync checklist to all apps in this group
    apps.forEach(a => onUpdateApp(a.id, { checklist: next }));
    await Promise.all(apps.map(a =>
      fetch(`/api/applications/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: next }),
      })
    ));
  }

  async function submitNote() {
    const note = noteInput.trim();
    if (!note || saving) return;
    setSaving(true);
    try {
      const targetId = apps[0]?.id;
      if (!targetId) return;
      const res = await fetch(`/api/applications/${targetId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        const { entry } = await res.json() as { entry: ActivityRow };
        onAddActivity(targetId, entry);
        setNoteInput("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">

      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={abbr} className="h-10 w-10 shrink-0 rounded-xl border border-gray-100 bg-white p-1 object-contain" />
          ) : (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <span className="text-[9px] font-black text-white">{abbr}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-black text-gray-900 leading-snug">{uni.name}</p>
              {days !== null && (
                <span className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  days < 0   ? "bg-red-50 text-red-600"     :
                  days <= 14 ? "bg-amber-50 text-amber-700"  :
                               "bg-gray-100 text-gray-500",
                ].join(" ")}>
                  {days < 0 ? "Closed" : days === 0 ? "Today" : `${days}d left`}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{apps.length} programme{apps.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Programmes list */}
      <div className="border-b border-gray-50 px-4 py-3 space-y-2">
        {apps.map(app => {
          const isTerminal = ["accepted","rejected","waitlisted"].includes(app.status);
          const railIndex  = STATUS_RAIL.indexOf(app.status as RailStatus);
          return (
            <div key={app.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
              <p className="text-xs font-bold text-gray-700 mb-2">
                {app.faculties?.name ?? "Programme"}
              </p>

              {!isTerminal ? (
                <div className="flex items-center gap-1">
                  {STATUS_RAIL.map((s, i) => {
                    const active   = i <= railIndex;
                    const current  = i === railIndex;
                    const canClick = i <= railIndex + 1;
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <button
                          type="button"
                          onClick={() => canClick && setStatus(app.id, s)}
                          disabled={!canClick}
                          className={[
                            "flex-1 rounded-lg py-1 text-[10px] font-bold text-center transition-all",
                            current  ? "bg-orange-500 text-white shadow-sm shadow-orange-200" :
                            active   ? "bg-orange-100 text-orange-600" :
                                       "bg-white text-gray-400",
                            canClick && !current ? "hover:bg-orange-200 cursor-pointer" : "cursor-default",
                          ].join(" ")}
                        >
                          {STATUS_META[s].label}
                        </button>
                        {i < STATUS_RAIL.length - 1 && (
                          <div className={`h-0.5 w-2 shrink-0 ${active ? "bg-orange-300" : "bg-gray-200"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`rounded-lg px-3 py-1 text-center text-[10px] font-bold ${STATUS_META[app.status]?.bg} ${STATUS_META[app.status]?.color}`}>
                  {STATUS_META[app.status]?.label}
                </div>
              )}

              {app.status === "submitted" && (
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  <p className="text-[10px] text-gray-400 self-center mr-1">Outcome:</p>
                  {OUTCOMES.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setStatus(app.id, o)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${STATUS_META[o].bg} ${STATUS_META[o].color} border-current/20 hover:opacity-80`}
                    >
                      {STATUS_META[o].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Shared checklist */}
      <div className="border-b border-gray-50">
        <button
          type="button"
          onClick={() => setChecklistOpen(v => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-orange-500" />
            <span className="text-xs font-bold text-gray-700">Application Checklist</span>
            <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
              {checklist.length}/{CHECKLIST_ITEMS.length}
            </span>
            {checklist.length > 0 && (
              <div className="h-1 w-14 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${checkPct}%` }} />
              </div>
            )}
          </div>
          {checklistOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </button>

        {checklistOpen && (
          <div className="px-4 pb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {CHECKLIST_ITEMS.map(item => {
              const ticked = checklist.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleChecklist(item.id)}
                  className={[
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition-all",
                    ticked
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-orange-200 hover:bg-orange-50/50",
                  ].join(" ")}
                >
                  <CheckCircle2
                    size={14}
                    className={ticked ? "shrink-0 text-emerald-500" : "shrink-0 text-gray-300"}
                  />
                  <span className={`leading-snug ${ticked ? "line-through opacity-70" : ""}`}>
                    {item.label}
                  </span>
                  {ticked && (
                    <span className="ml-auto shrink-0 text-[9px] font-bold text-emerald-500">+{CHECKLIST_XP}xp</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity log */}
      <div>
        <button
          type="button"
          onClick={() => setActivityOpen(v => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <Star size={13} className="text-amber-500" />
            <span className="text-xs font-bold text-gray-700">Updates</span>
            {activity.length > 0 && (
              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                {activity.length}
              </span>
            )}
          </div>
          {activityOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </button>

        {activityOpen && (
          <div className="px-4 pb-4 space-y-2">
            <div className="flex gap-2">
              <input
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void submitNote(); }}
                placeholder="What did you do? (press Enter)"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                disabled={saving}
              />
              <button
                type="button"
                onClick={submitNote}
                disabled={!noteInput.trim() || saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                <Send size={13} />
              </button>
            </div>

            {activity.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-2">
                Log your first update above — each entry earns +{ACTIVITY_XP} XP
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {activity.map(entry => (
                  <div key={entry.id} className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 leading-snug">{entry.note}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(entry.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SubjectImprovementCard ────────────────────────────────────────────────────

function SubjectImprovementCard({ subjects }: { subjects: SubjectMark[] }) {
  const rows = subjects
    .filter((s) => typeof s.mark === "number" && Number.isFinite(s.mark))
    .map((s) => {
      const mark = Math.max(0, Math.min(100, Math.round(s.mark as number)));
      const isLO = /life\s*orientation/i.test(s.name);
      const goal = nextGoal(mark);
      return {
        name: s.name,
        mark,
        goal,
        gap: goal - mark,
        currentApsPoint: isLO ? null : apsPoint(mark),
        goalApsPoint: isLO ? null : apsPoint(goal),
        tip: improvementTip(mark),
        isLO,
      };
    })
    .sort((a, b) => a.mark - b.mark);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-500" />
          <p className="text-sm font-bold text-gray-900">Subject improvement targets</p>
        </div>
        <Link href="/profile" className="text-[11px] font-semibold text-orange-600 hover:text-orange-700">
          Edit marks
        </Link>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">
        Realistic next goals based on your current marks. Hit each one and the target moves up — one step at a time.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
          <p className="text-xs font-bold text-gray-600">No subject marks yet</p>
          <p className="mt-1 text-[11px] text-gray-400">
            Add your subjects and current marks on your profile to see improvement targets here.
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-orange-600"
          >
            Add subjects
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-gray-400">
                <th className="py-2 pr-3 font-semibold">Subject</th>
                <th className="py-2 pr-3 font-semibold">Now</th>
                <th className="py-2 pr-3 font-semibold">Next goal</th>
                <th className="py-2 pr-3 font-semibold">APS</th>
                <th className="py-2 font-semibold">How to get there</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const pct = Math.min(100, Math.round((r.mark / r.goal) * 100));
                return (
                  <tr key={r.name} className="align-top">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      {r.isLO && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Not counted toward APS</p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-bold text-gray-900">{r.mark}%</p>
                      <div className="mt-1 h-1 w-16 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-emerald-400 to-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-bold text-emerald-600">{r.goal}%</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">+{r.gap} pts</p>
                    </td>
                    <td className="py-3 pr-3">
                      {r.currentApsPoint === null ? (
                        <span className="text-gray-300">—</span>
                      ) : r.goalApsPoint && r.goalApsPoint > r.currentApsPoint ? (
                        <span className="font-semibold text-gray-700">
                          {r.currentApsPoint} <span className="text-gray-400">→</span>{" "}
                          <span className="text-emerald-600">{r.goalApsPoint}</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-700">{r.currentApsPoint}</span>
                      )}
                    </td>
                    <td className="py-3 text-[11px] leading-snug text-gray-600">{r.tip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
