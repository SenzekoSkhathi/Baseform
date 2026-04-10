"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot" | "system";
  timestamp: Date;
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

// ── Simple markdown renderer ──────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

function MessageContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, "").trim());
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm">
              <span className="text-orange-400 shrink-0 mt-0.5">•</span>
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, "").trim());
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="space-y-1 my-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm">
              <span className="text-orange-500 font-semibold shrink-0">{j + 1}.</span>
              <span className="leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Heading
    if (/^#{1,3}\s/.test(line)) {
      blocks.push(
        <p key={`h-${i}`} className="font-bold text-sm my-1">
          {renderInline(line.replace(/^#{1,3}\s/, ""))}
        </p>,
      );
      i++;
      continue;
    }

    // Paragraph
    blocks.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
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
    <div className="flex h-full w-full max-w-3xl flex-col items-center justify-center gap-5 px-3 text-center sm:px-4">
      <div className="flex items-center gap-2.5">
        <BotAvatar size="md" />
        <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-lg">Hi {firstName}, How can I help you today?</h2>
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

function BotResponseSkeleton() {
  return (
    <div className="flex gap-3 justify-start" aria-live="polite" aria-busy="true">
      <BotAvatar size="sm" />
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 min-w-55">
        <div className="space-y-2">
          <div className="h-3 w-44 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-56 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-40 rounded bg-gray-100 animate-pulse" />
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        title: string;
        preview: string;
        updatedAt: string;
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
  }, []);

  // Persist threads
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
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    setApiError(null);

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsg: Message = { id: makeId(), text: content, sender: "user", timestamp: new Date() };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    saveThread(currentThreadId, withUser);
    setIsLoading(true);

    try {
      const res = await fetch("/api/basebot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      const data = (await res.json()) as { response?: string; error?: string };
      if (!res.ok || !data.response) {
        throw new Error(data.error || "We could not reach BaseBot right now.");
      }

      const botMsg: Message = { id: makeId(), text: data.response, sender: "bot", timestamp: new Date() };
      const withBot = [...withUser, botMsg];
      setMessages(withBot);
      saveThread(currentThreadId, withBot);
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

  return (
    <div className="flex h-dvh bg-gray-50 overflow-hidden">
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

          <button
            onClick={handleNewChat}
            className="hidden md:flex items-center px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-xs font-semibold transition-colors"
          >
            New chat
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {messages.length === 0 ? (
            <EmptyState firstName={firstName} onPrompt={(p) => void handleSend(p)} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {apiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={[
                    "flex gap-3",
                    msg.sender === "user" ? "justify-end" : "justify-start",
                    msg.sender === "system" ? "justify-center" : "",
                  ].join(" ")}
                >
                  {msg.sender === "bot" && <BotAvatar size="sm" />}

                  <div
                    className={[
                      "max-w-[78%] rounded-2xl px-4 py-3",
                      msg.sender === "user"
                        ? "bg-orange-500 text-white rounded-tr-sm"
                        : msg.sender === "system"
                          ? "bg-amber-50 border border-amber-100 text-amber-700 text-xs text-center max-w-sm"
                          : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm",
                    ].join(" ")}
                  >
                    {msg.sender === "user" ? (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    ) : (
                      <MessageContent text={msg.text} />
                    )}
                  </div>
                </div>
              ))}

              {isLoading && <BotResponseSkeleton />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-100 bg-white px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all px-4 py-2.5">
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
                disabled={!input.trim() || isLoading}
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
