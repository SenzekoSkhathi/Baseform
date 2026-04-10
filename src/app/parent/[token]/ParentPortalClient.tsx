"use client";

import { GraduationCap, Clock, CheckCircle2, XCircle, AlertCircle, FileText, Eye } from "lucide-react";

type Application = {
  id: string;
  status: string;
  updatedAt: string;
  universityName: string;
  programmeName: string | null;
  closingDate: string | null;
};

type Props = {
  firstName: string;
  gradeYear: string | null;
  school: string | null;
  fieldOfInterest: string | null;
  aps: number;
  rating: string;
  applications: Application[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  planning:    { label: "Planning",     color: "bg-gray-50 text-gray-600 border-gray-100",      icon: <FileText size={13} /> },
  in_progress: { label: "In Progress",  color: "bg-blue-50 text-blue-700 border-blue-100",      icon: <AlertCircle size={13} /> },
  submitted:   { label: "Submitted",    color: "bg-purple-50 text-purple-700 border-purple-100", icon: <CheckCircle2 size={13} /> },
  accepted:    { label: "Accepted",     color: "bg-green-50 text-green-700 border-green-100",   icon: <CheckCircle2 size={13} /> },
  rejected:    { label: "Rejected",     color: "bg-red-50 text-red-700 border-red-100",         icon: <XCircle size={13} /> },
  waitlisted:  { label: "Waitlisted",   color: "bg-amber-50 text-amber-700 border-amber-100",   icon: <Clock size={13} /> },
};

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(iso: string | null): string {
  if (!iso) return "No deadline";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export default function ParentPortalClient({
  firstName,
  gradeYear,
  school,
  fieldOfInterest,
  aps,
  rating,
  applications,
}: Props) {
  const submitted = applications.filter((a) => ["submitted", "accepted", "rejected", "waitlisted"].includes(a.status));
  const pending = applications.filter((a) => ["planning", "in_progress"].includes(a.status));

  const upcomingDeadlines = applications
    .filter((a) => a.closingDate)
    .map((a) => ({ ...a, days: daysLeft(a.closingDate) }))
    .filter((a) => a.days !== null && a.days >= 0)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
    .slice(0, 3);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_10%_5%,rgba(251,146,60,0.14),transparent_62%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 rounded-3xl border border-orange-100 bg-white/95 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-600">
              <Eye size={10} />
              Guardian View · Read Only
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{firstName}&apos;s Progress</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
            {gradeYear && <span>{gradeYear}</span>}
            {gradeYear && school && <span>·</span>}
            {school && <span>{school}</span>}
            {fieldOfInterest && <span>· {fieldOfInterest}</span>}
          </div>
        </div>

        {/* APS card */}
        <div className="mb-4 rounded-3xl border border-orange-100 bg-white/95 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white">
              <div className="text-center">
                <p className="text-xl font-black leading-none">{aps}</p>
                <p className="text-[9px] font-medium text-orange-200">APS</p>
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-gray-900">{rating}</p>
              <p className="text-xs text-gray-500">Score out of 42 · Best 6 subjects, excl. Life Orientation</p>
              <div className="mt-2 flex gap-3 text-xs">
                <span className="font-semibold text-green-700">{submitted.length} submitted</span>
                <span className="font-semibold text-gray-400">{pending.length} in progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="mb-4 rounded-3xl border border-amber-100 bg-amber-50/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={15} className="text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800">Upcoming deadlines</h2>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-white p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.universityName}</p>
                    <p className="text-xs text-gray-500">{formatDate(a.closingDate)}</p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${(a.days ?? 99) <= 7 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    {a.days === 0 ? "Today" : `${a.days}d left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applications list */}
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap size={16} className="text-orange-500" />
            <h2 className="text-base font-bold text-gray-900">Applications</h2>
            <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
              {applications.length}
            </span>
          </div>

          {applications.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No applications added yet.</p>
          ) : (
            <div className="space-y-2">
              {applications.map((a) => {
                const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.planning;
                const days = daysLeft(a.closingDate);
                return (
                  <div key={a.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">{a.universityName}</p>
                        {a.programmeName && (
                          <p className="text-xs text-gray-500">{a.programmeName}</p>
                        )}
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>
                    {a.closingDate && (
                      <p className="mt-2 text-[11px] text-gray-400">
                        Deadline: {formatDate(a.closingDate)}
                        {days !== null && days >= 0 && (
                          <span className={`ml-1.5 font-semibold ${days <= 7 ? "text-red-500" : "text-gray-500"}`}>
                            ({days === 0 ? "today" : `${days}d left`})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by Baseform · SA university application management
        </p>
      </div>
    </main>
  );
}
