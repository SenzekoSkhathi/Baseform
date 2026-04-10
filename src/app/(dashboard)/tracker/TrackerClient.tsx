"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  Plus,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { getUniversityLogo } from "@/lib/dashboard/universityLogos";

type Application = Record<string, any>;
type GoalCategory = "Applications" | "Documents" | "Exams" | "Funding" | "Personal";

type Goal = {
  id: string;
  title: string;
  category: GoalCategory;
  notes: string;
  targetDate: string | null;
  points: number;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
};

type GoalDraft = {
  title: string;
  category: GoalCategory;
  notes: string;
  targetDate: string | null;
};

const STORAGE_KEY = "bf_tracker_goals_v1";

const CATEGORY_POINTS: Record<GoalCategory, number> = {
  Applications: 20,
  Documents: 15,
  Exams: 25,
  Funding: 20,
  Personal: 10,
};

const CATEGORY_STYLES: Record<GoalCategory, string> = {
  Applications: "bg-orange-50 text-orange-700 border-orange-200",
  Documents: "bg-sky-50 text-sky-700 border-sky-200",
  Exams: "bg-violet-50 text-violet-700 border-violet-200",
  Funding: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Personal: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-600" },
  submitted: { label: "Submitted", className: "bg-purple-50 text-purple-600" },
  accepted: { label: "Accepted", className: "bg-green-50 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-600" },
  waitlisted: { label: "Waitlisted", className: "bg-amber-50 text-amber-700" },
};

const ABBR_COLORS: Record<string, string> = {
  UWC: "bg-teal-600",
  SU: "bg-red-700",
  UP: "bg-blue-800",
  NWU: "bg-yellow-600",
  CPUT: "bg-blue-600",
  UCT: "bg-sky-700",
  WITS: "bg-blue-700",
  UJ: "bg-orange-600",
  DUT: "bg-green-700",
  TUT: "bg-rose-600",
};

function getStatus(app: Application) {
  const raw = (app.status ?? "planning").toLowerCase();
  return STATUS_STYLES[raw] ?? { label: raw, className: "bg-gray-100 text-gray-600" };
}

function levelFromXp(xp: number) {
  if (xp >= 280) return { level: 5, title: "Application Legend" };
  if (xp >= 190) return { level: 4, title: "Deadline Master" };
  if (xp >= 120) return { level: 3, title: "Momentum Builder" };
  if (xp >= 60) return { level: 2, title: "Focused Applicant" };
  return { level: 1, title: "Starter" };
}

function isOverdue(targetDate: string | null, completed: boolean) {
  if (!targetDate || completed) return false;
  const due = new Date(targetDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

function formatTargetDate(targetDate: string | null) {
  if (!targetDate) return "No due date";
  const parsed = new Date(targetDate);
  if (Number.isNaN(parsed.getTime())) return targetDate;
  return parsed.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildGoalsFromApplication(app: Application): GoalDraft[] {
  const uni = app.universities;
  const faculty = app.faculties;
  const programmeName = faculty?.name ?? "Selected programme";
  const universityName = uni?.name ?? "Selected university";
  const status = (app.status ?? "planning").toLowerCase();
  const closingDate = uni?.closing_date ?? null;

  const goals: GoalDraft[] = [
    {
      title: `Complete checklist for ${programmeName}`,
      category: "Applications",
      notes: `${universityName} application planning and readiness steps.`,
      targetDate: closingDate,
    },
    {
      title: `Prepare documents for ${programmeName}`,
      category: "Documents",
      notes: `Collect certified copies, supporting documents, and upload proofs for ${universityName}.`,
      targetDate: closingDate,
    },
  ];

  if (status === "planning" || status === "in_progress") {
    goals.push({
      title: `Submit application for ${programmeName}`,
      category: "Applications",
      notes: `Finalize and submit before deadline at ${universityName}.`,
      targetDate: closingDate,
    });
  }

  goals.push({
    title: `Track response for ${programmeName}`,
    category: "Personal",
    notes: `Current application status: ${status.replace(/_/g, " ")}.`,
    targetDate: null,
  });

  return goals;
}

export default function TrackerClient({ applications }: { applications: Application[] }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("Applications");
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [appGoalFeedback, setAppGoalFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setIsHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Goal[];
      if (Array.isArray(parsed)) setGoals(parsed);
    } catch {
      // Ignore malformed local storage and start clean.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals, isHydrated]);

  const progress = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((goal) => goal.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const xp = goals.filter((goal) => goal.completed).reduce((sum, goal) => sum + goal.points, 0);
    const overdue = goals.filter((goal) => isOverdue(goal.targetDate, goal.completed)).length;
    const streak = Math.min(completed, 7);
    const level = levelFromXp(xp);
    return { total, completed, percentage, xp, overdue, streak, level };
  }, [goals]);

  const achievements = useMemo(
    () => [
      { title: "First Step", unlocked: goals.length >= 1, hint: "Create your first goal" },
      { title: "On The Board", unlocked: goals.some((goal) => goal.completed), hint: "Complete one goal" },
      {
        title: "Halfway There",
        unlocked: progress.total > 0 && progress.percentage >= 50,
        hint: "Reach 50% completion",
      },
      {
        title: "Application Legend",
        unlocked: progress.percentage === 100 && progress.total >= 5,
        hint: "Complete all goals",
      },
    ],
    [goals, progress.percentage, progress.total]
  );

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      if (a.targetDate && !b.targetDate) return -1;
      if (!a.targetDate && b.targetDate) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [goals]);

  const starterGoals = useMemo(
    () => [
      { title: "Create your master document checklist", category: "Documents" as const },
      { title: "Prepare certified copies of ID and results", category: "Documents" as const },
      { title: "Submit at least one university application", category: "Applications" as const },
      { title: "Identify 2 bursaries you can apply for", category: "Funding" as const },
      { title: "Book and prepare for required admission tests", category: "Exams" as const },
    ],
    []
  );

  const addGoal = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      category,
      notes: notes.trim(),
      targetDate: targetDate || null,
      points: CATEGORY_POINTS[category],
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    setGoals((current) => [newGoal, ...current]);
    setTitle("");
    setCategory("Applications");
    setNotes("");
    setTargetDate("");
  };

  const toggleGoal = (goalId: string) => {
    setGoals((current) =>
      current.map((goal) => {
        if (goal.id !== goalId) return goal;
        const nextCompleted = !goal.completed;
        return {
          ...goal,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null,
        };
      })
    );
  };

  const removeGoal = (goalId: string) => {
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
  };

  const addQuickGoal = (goal: { title: string; category: GoalCategory }) => {
    setGoals((current) => {
      if (current.some((item) => item.title.toLowerCase() === goal.title.toLowerCase())) return current;
      return [
        {
          id: crypto.randomUUID(),
          title: goal.title,
          category: goal.category,
          notes: "",
          targetDate: null,
          points: CATEGORY_POINTS[goal.category],
          completed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
        ...current,
      ];
    });
  };

  const addGoalsFromApplication = (app: Application) => {
    const drafts = buildGoalsFromApplication(app);
    let addedCount = 0;

    setGoals((current) => {
      const existingTitles = new Set(current.map((goal) => goal.title.trim().toLowerCase()));
      const newGoals: Goal[] = [];

      for (const draft of drafts) {
        const key = draft.title.trim().toLowerCase();
        if (existingTitles.has(key)) continue;

        existingTitles.add(key);
        addedCount += 1;

        newGoals.push({
          id: crypto.randomUUID(),
          title: draft.title,
          category: draft.category,
          notes: draft.notes,
          targetDate: draft.targetDate,
          points: CATEGORY_POINTS[draft.category],
          completed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
        });
      }

      return newGoals.length > 0 ? [...newGoals, ...current] : current;
    });

    if (addedCount > 0) {
      setAppGoalFeedback(`${addedCount} goal${addedCount === 1 ? "" : "s"} added from this application.`);
    } else {
      setAppGoalFeedback("All suggested goals for this application are already in your path.");
    }
  };

  return (
    <div className="overflow-x-hidden">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 sm:px-5">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Progress</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">
          Build your goal path and track achievements manually
        </p>
      </div>

      <div className="px-4 pt-4 pb-6 sm:px-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard
            icon={<Target size={16} className="text-orange-500" />}
            label="Completion"
            value={`${progress.percentage}%`}
            caption={`${progress.completed}/${progress.total} goals`}
          />
          <StatCard
            icon={<Flame size={16} className="text-amber-500" />}
            label="XP"
            value={progress.xp.toString()}
            caption={`Level ${progress.level.level}: ${progress.level.title}`}
          />
          <StatCard
            icon={<CalendarClock size={16} className="text-red-500" />}
            label="Overdue"
            value={progress.overdue.toString()}
            caption="Goals that need attention"
          />
          <StatCard
            icon={<CheckCircle2 size={16} className="text-emerald-500" />}
            label="Streak"
            value={`${progress.streak} day${progress.streak === 1 ? "" : "s"}`}
            caption="Consistency bonus"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-orange-100 bg-linear-to-br from-orange-50 to-white p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Build Your Goal Path</p>
              <p className="text-xs text-gray-500">Create goals first, then mark each step complete.</p>
            </div>
            <div className="inline-flex w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-500">
              Manual Tracker
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Goal title (e.g., Submit UCT application)"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as GoalCategory)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            >
              {Object.keys(CATEGORY_POINTS).map((value) => (
                <option key={value} value={value}>
                  {value} ({CATEGORY_POINTS[value as GoalCategory]} XP)
                </option>
              ))}
            </select>

            <input
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              type="date"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />

            <button
              type="button"
              onClick={addGoal}
              disabled={!title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
            >
              <Plus size={14} />
              Add Goal
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Optional note (what this goal needs)"
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />

          <div className="mt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Quick starter goals</p>
            <div className="flex flex-wrap gap-2">
              {starterGoals.map((goal) => (
                <button
                  key={goal.title}
                  type="button"
                  onClick={() => addQuickGoal(goal)}
                  className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50"
                >
                  + {goal.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900">Your Achievement Path</p>
                <p className="text-xs text-gray-500">Complete each step to move forward.</p>
              </div>
              <div className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                {progress.completed}/{progress.total} done
              </div>
            </div>

            {!isHydrated ? (
              <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
            ) : sortedGoals.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
                <ClipboardList size={28} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-bold text-gray-700">No goals yet</p>
                <p className="mt-1 text-xs text-gray-500">Start by creating your first milestone above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedGoals.map((goal, index) => (
                  <GoalPathCard
                    key={goal.id}
                    goal={goal}
                    isLast={index === sortedGoals.length - 1}
                    onToggle={() => toggleGoal(goal.id)}
                    onRemove={() => removeGoal(goal.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <p className="text-sm font-bold text-gray-900">Achievements</p>
              </div>

              <div className="space-y-2">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.title}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      achievement.unlocked
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    <p className="font-semibold">{achievement.title}</p>
                    <p className="text-xs">{achievement.unlocked ? "Unlocked" : achievement.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-orange-500" />
                <p className="text-sm font-bold text-gray-900">Applications Context</p>
              </div>

              {appGoalFeedback && (
                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {appGoalFeedback}
                </div>
              )}

              {applications.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Add universities and programmes in Dashboard Detail to connect your goals to real applications.
                </p>
              ) : (
                <div className="space-y-2">
                  {applications.slice(0, 4).map((app, index) => (
                    <ApplicationChip
                      key={app.id ?? index}
                      app={app}
                      onAddGoals={() => addGoalsFromApplication(app)}
                    />
                  ))}
                  {applications.length > 4 && (
                    <p className="text-[11px] text-gray-400">+{applications.length - 4} more applications</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{caption}</p>
    </div>
  );
}

function GoalPathCard({
  goal,
  isLast,
  onToggle,
  onRemove,
}: {
  goal: Goal;
  isLast: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const overdue = isOverdue(goal.targetDate, goal.completed);

  return (
    <div className="relative pl-8">
      {!isLast && (
        <div
          className={`absolute left-3.75 top-8 h-[calc(100%-4px)] w-0.5 ${goal.completed ? "bg-emerald-300" : "bg-gray-200"}`}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
          goal.completed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-gray-300 bg-white text-gray-400 hover:border-orange-400"
        }`}
      >
        <CheckCircle2 size={16} />
      </button>

      <div
        className={`rounded-xl border p-3 ${
          goal.completed
            ? "border-emerald-200 bg-emerald-50"
            : overdue
              ? "border-red-200 bg-red-50"
              : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug text-gray-900">{goal.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${CATEGORY_STYLES[goal.category]}`}>
                {goal.category}
              </span>
              <span className="text-[11px] text-gray-500">{goal.points} XP</span>
              <span className={`text-[11px] ${overdue ? "font-semibold text-red-500" : "text-gray-400"}`}>
                Due: {formatTargetDate(goal.targetDate)}
              </span>
            </div>

            {goal.notes && <p className="mt-2 text-xs text-gray-500">{goal.notes}</p>}
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-semibold text-gray-400 hover:text-red-500"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationChip({ app, onAddGoals }: { app: Application; onAddGoals: () => void }) {
  const status = getStatus(app);
  const uni = app.universities;
  const faculty = app.faculties;
  const abbr = uni?.abbreviation ?? "UNI";
  const logoUrl = getUniversityLogo(abbr, uni?.logo_url);
  const color = ABBR_COLORS[abbr] ?? "bg-gray-600";
  const universityName = uni?.name ?? "University";
  const programmeName = faculty?.name ?? "Programme";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-start">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={abbr}
          className="h-9 w-9 shrink-0 rounded-lg border border-gray-100 bg-white p-1 object-contain"
        />
      ) : (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <span className="text-[9px] font-black text-white">{abbr}</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-snug text-gray-900">{programmeName}</p>
            <p className="mt-0.5 truncate text-[11px] text-gray-500">{universityName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
              {status.label}
            </span>
            <button
              type="button"
              onClick={onAddGoals}
              className="rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-bold text-orange-600 hover:bg-orange-50"
            >
              Add goals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
