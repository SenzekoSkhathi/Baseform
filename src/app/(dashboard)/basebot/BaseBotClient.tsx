"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MessageAttachment {
  name: string;
  mimeType: string;
  size: number;
  /** Object URL for in-session preview only — not persisted to localStorage. */
  previewUrl?: string;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot" | "system";
  timestamp: Date;
  attachments?: MessageAttachment[];
}

interface ChatThread {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  messages: Message[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildThread(id: string, msgs: Message[], existing?: ChatThread): ChatThread {
  const first = msgs.find((m) => m.sender === "user");
  const last = [...msgs].reverse().find((m) => m.sender !== "system");
  const titleSrc = first?.text ?? "New chat";
  const previewSrc = last?.text ?? titleSrc;
  return {
    id,
    title: titleSrc.length > 40 ? titleSrc.slice(0, 39) + "…" : titleSrc,
    preview: previewSrc.length > 80 ? previewSrc.slice(0, 79) + "…" : previewSrc,
    updatedAt: last?.timestamp ?? existing?.updatedAt ?? new Date(),
    messages: msgs,
  };
}

function relativeTime(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STORAGE_KEY = "basebot-threads-v1";

async function fetchThreadsFromDB(): Promise<ChatThread[]> {
  try {
    const res = await fetch("/api/basebot/threads");
    if (!res.ok) return [];
    const rows = await res.json() as Array<{
      id: string; title: string; preview: string; updated_at: string;
      messages: Array<{ id: string; text: string; sender: "user" | "bot" | "system"; timestamp: string }>;
    }>;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      preview: r.preview,
      updatedAt: new Date(r.updated_at),
      messages: r.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch {
    return [];
  }
}

async function saveThreadToDB(thread: ChatThread): Promise<void> {
  try {
    await fetch("/api/basebot/threads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: thread.id,
        title: thread.title,
        preview: thread.preview,
        messages: thread.messages,
        updated_at: thread.updatedAt.toISOString(),
      }),
    });
  } catch {
    // Silent — localStorage already has the data as fallback
  }
}

// ── Simple markdown renderer ──────────────────────────────────────────────────

function normalizeResponseText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/```(?:markdown|md|text)?\n?/gi, "")
    .replace(/```/g, "")
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/\$([^$\n]+)\$/g, "$1")
    .replace(/\{([A-Za-z0-9 _\-]{1,60})\}/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g);
  return parts.map((part, i) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-gray-700">
          {part.slice(1, -1)}
        </span>
      );
    }

    return part;
  });
}

function splitTableRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function MessageContent({ text }: { text: string }) {
  const cleaned = normalizeResponseText(text);
  const lines = cleaned.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i++;
      continue;
    }

    // Markdown table: header row + separator row + body rows
    if (isTableRow(raw) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(raw);
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }

      blocks.push(
        <div key={`tbl-${i}`} className="my-3 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-sm sm:text-[15px]">
            <thead className="bg-orange-50">
              <tr>
                {header.map((cell, c) => (
                  <th
                    key={c}
                    className="border-b border-gray-200 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-orange-700 sm:text-[11px]"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className={r % 2 === 1 ? "bg-gray-50/60" : "bg-white"}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border-t border-gray-100 px-3 py-2 align-top leading-6 text-gray-800"
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Bullet list
    if (/^[-*•]\s/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s/, "").trim());
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm leading-7 text-gray-800 sm:text-[15px]">
              <span className="mt-1.5 shrink-0 text-orange-500">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s/, "").trim());
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm leading-7 text-gray-800 sm:text-[15px]">
              <span className="shrink-0 font-semibold text-orange-600">{j + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Heading
    if (/^#{1,3}\s/.test(line)) {
      if (blocks.length > 0) {
        blocks.push(
          <div key={`sep-h-${i}`} className="my-3 h-px w-full bg-gray-100" />,
        );
      }

      blocks.push(
        <p key={`h-${i}`} className="my-2 text-sm font-bold leading-7 text-gray-900 sm:text-[15px]">
          {renderInline(line.replace(/^#{1,3}\s/, ""))}
        </p>,
      );
      i++;
      continue;
    }

    // Markdown-style bold section title on a single line.
    if (/^\*\*[^*]+\*\*:?$/.test(line) || /^__[^_]+__:?$/.test(line)) {
      if (blocks.length > 0) {
        blocks.push(
          <div key={`sep-bh-${i}`} className="my-3 h-px w-full bg-gray-100" />,
        );
      }

      blocks.push(
        <p key={`bh-${i}`} className="my-2 text-sm font-bold leading-7 text-gray-900 sm:text-[15px]">
          {renderInline(line.replace(/:$/, ""))}
        </p>,
      );
      i++;
      continue;
    }

    // Paragraph
    blocks.push(
      <p key={`p-${i}`} className="text-sm leading-7 text-gray-800 sm:text-[15px]">
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return <div className="space-y-1.5">{blocks}</div>;
}

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "What is an APS score and how is it calculated?",
  "Which universities accept an APS of 28 for engineering?",
  "How do I apply for a NSFAS bursary?",
  "What documents do I need for a university application?",
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M12 7H2M7.5 2.5L12 7l-4.5 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PaperclipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10.5 5L5.5 10a2 2 0 1 0 2.83 2.83l5-5a3.5 3.5 0 1 0-4.95-4.95l-5 5a5 5 0 1 0 7.07 7.07L13 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.pdf,image/png,image/jpeg,image/gif,image/webp,application/pdf";
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_MAX_COUNT = 4;
const ATTACHMENT_ALLOWED_MIMES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf",
]);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Bot avatar ────────────────────────────────────────────────────────────────

const BotAvatar = ({ size = "sm" }: { size?: "sm" | "md" | "lg" }) => {
  const dim = size === "lg" ? "w-16 h-16" : size === "md" ? "w-8 h-8" : "w-7 h-7";
  const imgSize = size === "lg" ? 32 : size === "md" ? 18 : 14;
  const radius = size === "lg" ? "rounded-2xl" : "rounded-xl";
  return (
    <div className={`${dim} ${radius} bg-orange-500 flex items-center justify-center shrink-0`}>
      <Image src="/icon.svg" alt="BaseBot" width={imgSize} height={imgSize} />
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  threads: ChatThread[];
  currentId: string;
  search: string;
  collapsed: boolean;
  onSearch: (q: string) => void;
  onSelect: (t: ChatThread) => void;
  onNew: () => void;
  onToggleCollapse: () => void;
  onClose: () => void;
}

function Sidebar({
  threads,
  currentId,
  search,
  collapsed,
  onSearch,
  onSelect,
  onNew,
  onToggleCollapse,
  onClose,
}: SidebarProps) {
  const filtered = threads.filter((t) => {
    if (!search.trim()) return true;
    return (
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.preview.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`h-14 flex items-center border-b border-gray-100 shrink-0 ${collapsed ? "px-2 justify-center" : "px-4 justify-between"}`}>
        <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? "hidden" : ""}`}>
          <BotAvatar size="sm" />
          <span className="font-bold text-gray-900 text-sm">BaseBot</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <MenuIcon />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors md:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
      {/* Search */}
      <div className="px-3 py-2.5 border-b border-gray-50 shrink-0">
        <input
          type="text"
          placeholder="Search chats…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-400 outline-none focus:ring-1 focus:ring-orange-200 transition-shadow"
        />
      </div>

        </>
      )}
      {/* Thread list */}
      {!collapsed && <div className="flex-1 overflow-y-auto py-2 px-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-10">
            {threads.length === 0 ? "No chats yet" : "No results"}
          </p>
        ) : (
          filtered.map((thread) => {
            const active = thread.id === currentId;
            return (
              <button
                key={thread.id}
                onClick={() => onSelect(thread)}
                className={[
                  "w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition-colors",
                  active
                    ? "bg-orange-50 border border-orange-100"
                    : "hover:bg-gray-50 border border-transparent",
                ].join(" ")}
              >
                <p
                  className={[
                    "text-xs font-semibold truncate",
                    active ? "text-orange-600" : "text-gray-800",
                  ].join(" ")}
                >
                  {thread.title}
                </p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{thread.preview}</p>
                <p className="text-[9px] text-gray-300 mt-0.5">{relativeTime(thread.updatedAt)}</p>
              </button>
            );
          })
        )}
      </div>}

      {/* Footer */}
      {!collapsed && <div className="border-t border-gray-100 px-2 py-3 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-xs text-gray-400 font-medium"
        >
          <BackIcon />
          Back to Home
        </Link>
      </div>}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  firstName,
  onPrompt,
}: {
  firstName: string;
  onPrompt: (p: string) => void;
}) {
  return (
    <div className="flex h-full w-full max-w-3xl mx-auto flex-col items-center justify-center gap-5 px-3 text-center sm:px-4">
      <div className="flex items-center gap-2.5">
        <BotAvatar size="md" />
        <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-lg">Hi {firstName}, how can I help you today?</h2>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-2 sm:grid sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPrompt(prompt)}
            className="flex min-h-12 items-center rounded-2xl border border-gray-100 bg-white px-3 py-2.5 text-left text-xs text-gray-700 transition-all hover:border-orange-200 hover:bg-orange-50/40 sm:text-sm"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

const THINKING_PHRASES = [
  "Thinking",
  "Gathering information",
  "Checking the facts",
  "Piecing it together",
  "Looking into that",
  "Crunching the numbers",
  "Pulling up sources",
  "Working on it",
  "Reading up on that",
  "Connecting the dots",
] as const;

function pickRandomPhrase(exclude?: string): string {
  if (THINKING_PHRASES.length <= 1) return THINKING_PHRASES[0];
  let next = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
  while (next === exclude) {
    next = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
  }
  return next;
}

function BotThinkingIndicator() {
  const [phrase, setPhrase] = useState<string>(() => pickRandomPhrase());

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhrase((prev) => pickRandomPhrase(prev));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex w-full gap-3 justify-start" aria-live="polite" aria-busy="true">
      {/* Logo with spinning ring */}
      <div className="relative h-8 w-8 shrink-0">
        <div className="absolute inset-0 rounded-xl border-2 border-orange-200 border-t-orange-500 animate-spin" />
        <div className="absolute inset-0.75 rounded-lg bg-orange-500 flex items-center justify-center">
          <Image src="/icon.svg" alt="BaseBot" width={14} height={14} />
        </div>
      </div>

      {/* Rotating phrase */}
      <div className="min-w-0 flex-1 px-1 py-1 flex items-center">
        <span
          key={phrase}
          className="text-sm font-medium text-gray-500 animate-[fade-in_300ms_ease-out] sm:text-[15px]"
        >
          {phrase}
          <span className="inline-block ml-0.5 animate-pulse">…</span>
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// ── Memory types ──────────────────────────────────────────────────────────────

interface MemoryFact {
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  goal: "Goals",
  applications: "Applications",
  personal: "Personal",
  academic: "Academic",
  bursaries: "Bursaries",
  general: "General",
};

// ── Memory icon ───────────────────────────────────────────────────────────────

const MemoryIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path
      d="M7.5 1.5C5.015 1.5 3 3.515 3 6c0 1.18.455 2.254 1.2 3.055L4 13h7l-.2-3.945A4.478 4.478 0 0 0 12 6c0-2.485-2.015-4.5-4.5-4.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path d="M5.5 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5.5 6h4M7.5 4v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

// ── Memory panel ──────────────────────────────────────────────────────────────

function MemoryPanel({
  memories,
  onDelete,
  onClose,
}: {
  memories: MemoryFact[];
  onDelete: (key: string) => void;
  onClose: () => void;
}) {
  const grouped = memories.reduce<Record<string, MemoryFact[]>>((acc, m) => {
    const cat = m.category ?? "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-orange-500">
              <MemoryIcon />
            </span>
            <span className="text-sm font-bold text-gray-900">What BaseBot Remembers</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] px-4 py-3 space-y-4">
          {memories.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nothing remembered yet. Start chatting and BaseBot will learn about you.
            </p>
          ) : (
            Object.entries(grouped).map(([cat, facts]) => (
              <div key={cat}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  {CATEGORY_LABELS[cat] ?? cat}
                </p>
                <div className="space-y-1.5">
                  {facts.map((f) => (
                    <div
                      key={f.key}
                      className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 capitalize">
                          {f.key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-800 font-medium leading-snug">{f.value}</p>
                      </div>
                      <button
                        onClick={() => onDelete(f.key)}
                        className="shrink-0 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                        title="Forget this"
                      >
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-50">
          <p className="text-[10px] text-gray-300 text-center">
            BaseBot learns from your conversations to give better advice.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Profile = { full_name: string | null; field_of_interest: string | null } | null;

export default function BaseBotClient({ profile }: { profile: Profile }) {
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>(() => makeId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep mobile scroll contained inside the chat list.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Load memories
  useEffect(() => {
    fetch("/api/basebot/memory")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: MemoryFact[]) => setMemories(data))
      .catch(() => {});
  }, []);

  // Load threads: DB first, fallback to localStorage
  useEffect(() => {
    async function load() {
      // Try DB first
      const dbThreads = await fetchThreadsFromDB();
      if (dbThreads.length > 0) {
        setThreads(dbThreads);
        // Sync DB threads into localStorage so they're available offline
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dbThreads));
        return;
      }
      // Fallback: localStorage (works offline or when DB is slow)
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Array<{
          id: string; title: string; preview: string; updatedAt: string;
          messages: Array<{ id: string; text: string; sender: "user" | "bot" | "system"; timestamp: string }>;
        }>;
        setThreads(
          parsed.map((t) => ({
            ...t,
            updatedAt: new Date(t.updatedAt),
            messages: t.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
          })),
        );
      } catch {
        // ignore parse errors
      }
    }
    void load();
  }, []);

  // Persist threads to localStorage (always) + DB (best-effort)
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    }
  }, [threads]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const saveThread = (threadId: string, msgs: Message[]) => {
    const thread = buildThread(threadId, msgs, threads.find((t) => t.id === threadId));
    setThreads((prev) => [thread, ...prev.filter((t) => t.id !== threadId)]);
    void saveThreadToDB(thread);
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if ((!content && pendingFiles.length === 0) || isLoading) return;

    setApiError(null);

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const filesToSend = pendingFiles;
    setPendingFiles([]);

    const messageAttachments: MessageAttachment[] = filesToSend.map((file) => ({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));

    const userMsg: Message = {
      id: makeId(),
      text: content || "(attachment only)",
      sender: "user",
      timestamp: new Date(),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    saveThread(currentThreadId, withUser);
    setIsLoading(true);

    try {
      // Convert files to base64 (strip the "data:...;base64," prefix)
      const attachmentPayloads = await Promise.all(
        filesToSend.map(async (file) => {
          const buf = await file.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          const type: "image" | "document" = file.type.startsWith("image/") ? "image" : "document";
          return { type, mediaType: file.type, data: base64, name: file.name };
        }),
      );

      // Build history from existing messages (exclude system messages)
      const history = messages
        .filter((m) => m.sender !== "system")
        .map((m) => ({
          role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));

      const res = await fetch("/api/basebot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content || "Please review the attached file(s).",
          history,
          attachments: attachmentPayloads,
        }),
      });

      const data = (await res.json()) as { response?: string; error?: string };
      if (!res.ok || !data.response) {
        throw new Error(data.error || "We could not reach BaseBot right now.");
      }

      const botMsg: Message = { id: makeId(), text: data.response, sender: "bot", timestamp: new Date() };
      const withBot = [...withUser, botMsg];
      setMessages(withBot);
      saveThread(currentThreadId, withBot);

      // Refresh memories in background after each exchange (extraction runs server-side)
      setTimeout(() => {
        fetch("/api/basebot/memory")
          .then((r) => (r.ok ? r.json() : null))
          .then((data: MemoryFact[] | null) => { if (data) setMemories(data); })
          .catch(() => {});
      }, 2000);
    } catch (error) {
      const fallback = "Something went wrong. Please try again.";
      const message = error instanceof Error && error.message ? error.message : fallback;
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentThreadId(makeId());
    setMessages([]);
    setInput("");
    setIsSidebarOpen(false);
    setSearchQuery("");
  };

  const handleSelectThread = (thread: ChatThread) => {
    setCurrentThreadId(thread.id);
    setMessages(thread.messages);
    setIsSidebarOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleDeleteMemory = async (key: string) => {
    setMemories((prev) => prev.filter((m) => m.key !== key));
    await fetch(`/api/basebot/memory?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      if (!ATTACHMENT_ALLOWED_MIMES.has(file.type)) {
        rejected.push(`${file.name} (unsupported type)`);
        continue;
      }
      if (file.size > ATTACHMENT_MAX_BYTES) {
        rejected.push(`${file.name} (over 5 MB)`);
        continue;
      }
      accepted.push(file);
    }

    setPendingFiles((prev) => {
      const combined = [...prev, ...accepted];
      if (combined.length > ATTACHMENT_MAX_COUNT) {
        rejected.push(`only the first ${ATTACHMENT_MAX_COUNT} attachments are sent`);
      }
      return combined.slice(0, ATTACHMENT_MAX_COUNT);
    });

    if (rejected.length > 0) {
      setApiError(`Skipped: ${rejected.join(", ")}.`);
    } else {
      setApiError(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-dvh overflow-hidden overscroll-none bg-gray-50">
      {/* Memory panel */}
      {showMemoryPanel && (
        <MemoryPanel
          memories={memories}
          onDelete={handleDeleteMemory}
          onClose={() => setShowMemoryPanel(false)}
        />
      )}

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={[
          "fixed md:relative inset-y-0 left-0 z-30 w-64 bg-white overflow-hidden transition-[transform,width,opacity,border-color] duration-300 md:translate-x-0",
          isSidebarCollapsed
            ? "md:w-14 md:opacity-100 md:border-r md:border-gray-100"
            : "md:w-64 md:opacity-100 md:border-r md:border-gray-100",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <Sidebar
          threads={threads}
          currentId={currentThreadId}
          search={searchQuery}
          collapsed={isSidebarCollapsed}
          onSearch={setSearchQuery}
          onSelect={handleSelectThread}
          onNew={handleNewChat}
          onToggleCollapse={() => {
            if (window.innerWidth < 768) {
              setIsSidebarOpen((v) => !v);
              return;
            }
            setIsSidebarCollapsed((v) => !v);
          }}
          onClose={() => setIsSidebarOpen(false)}
        />
      </aside>

      {/* ── Main chat ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors"
            >
              <MenuIcon />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMemoryPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-orange-500 rounded-xl text-xs font-medium transition-colors"
              title="What BaseBot remembers about you"
            >
              <MemoryIcon />
              <span className="hidden sm:inline">Memory</span>
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-xs font-semibold transition-colors"
            >
              New chat
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {messages.length === 0 ? (
            <EmptyState firstName={firstName} onPrompt={(p) => void handleSend(p)} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {apiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              {messages.map((msg) => {
                if (msg.sender === "bot") {
                  return (
                    <div key={msg.id} className="flex w-full items-start gap-3 justify-start">
                      <BotAvatar size="sm" />
                      <div className="min-w-0 flex-1 py-1 text-left text-gray-800">
                        <MessageContent text={msg.text} />
                      </div>
                    </div>
                  );
                }

                if (msg.sender === "system") {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-sm rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
                        <MessageContent text={msg.text} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-500 px-4 py-3 text-white space-y-2">
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.attachments.map((att, i) => (
                            <div
                              key={`${msg.id}-att-${i}`}
                              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 text-[11px]"
                            >
                              {att.previewUrl && att.mimeType.startsWith("image/") ? (
                                <Image
                                  src={att.previewUrl}
                                  alt={att.name}
                                  width={36}
                                  height={36}
                                  className="rounded-md object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-base leading-none">📎</span>
                              )}
                              <div className="min-w-0">
                                <p className="truncate max-w-35 font-medium">{att.name}</p>
                                <p className="text-white/70 text-[10px]">{formatFileSize(att.size)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}

              {isLoading && <BotThinkingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-100 bg-white px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pendingFiles.map((file, i) => (
                  <div
                    key={`pending-${i}-${file.name}`}
                    className="flex items-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-2 py-1 text-xs"
                  >
                    <span className="text-sm leading-none">{file.type.startsWith("image/") ? "🖼️" : "📄"}</span>
                    <span className="truncate max-w-40 font-medium text-gray-800">{file.name}</span>
                    <span className="text-[10px] text-gray-500">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-orange-100 hover:text-orange-600"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all px-4 py-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                multiple
                onChange={handleFilesSelected}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={isLoading || pendingFiles.length >= ATTACHMENT_MAX_COUNT}
                title={pendingFiles.length >= ATTACHMENT_MAX_COUNT ? "Attachment limit reached" : "Attach images or PDFs"}
                className="w-8 h-8 rounded-xl text-gray-400 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0 mb-0.5"
              >
                <PaperclipIcon />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about universities, bursaries, APS scores…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none leading-relaxed"
                style={{ minHeight: "24px", maxHeight: "128px" }}
              />
              <button
                onClick={() => void handleSend()}
                disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
                className="w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 flex items-center justify-center transition-colors shrink-0 mb-0.5"
              >
                <SendIcon />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-300 mt-2">
              BaseBot can make mistakes — verify important info with your school or university.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
