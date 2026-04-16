"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  text: string;
  sender: "user" | "upgrade";
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="8" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="9" cy="13" r="1.2" fill="currentColor" />
  </svg>
);

// ── Bot avatar ────────────────────────────────────────────────────────────────

const BotAvatar = ({ size = "sm" }: { size?: "sm" | "md" }) => {
  const dim = size === "md" ? "w-8 h-8" : "w-7 h-7";
  const imgSize = size === "md" ? 18 : 14;
  const radius = "rounded-xl";
  return (
    <div className={`${dim} ${radius} bg-orange-500 flex items-center justify-center shrink-0`}>
      <Image src="/icon.svg" alt="BaseBot" width={imgSize} height={imgSize} />
    </div>
  );
};

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "What is an APS score and how is it calculated?",
  "Which universities accept an APS of 28 for engineering?",
  "How do I apply for a NSFAS bursary?",
  "What documents do I need for a university application?",
];

// ── Upgrade response card ─────────────────────────────────────────────────────

function UpgradeCard() {
  return (
    <div className="flex w-full items-start gap-3 justify-start">
      <BotAvatar size="sm" />
      <div className="min-w-0 flex-1 py-1">
        <p className="text-sm leading-7 text-gray-800">
          I&apos;d love to help you with that! BaseBot gives you personalised guidance on your APS
          score, programme selection, bursary applications, and university deadlines — all tailored
          to your specific subjects and goals.
        </p>

        <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-500">
              <LockIcon />
            </span>
            <p className="text-sm font-bold text-orange-800">Upgrade to unlock AI guidance</p>
          </div>
          <p className="text-xs text-orange-700 leading-relaxed mb-3">
            Get unlimited conversations with BaseBot, personalised advice based on your profile,
            and smart recommendations across programmes and bursaries.
          </p>
          <Link
            href="/plans"
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            View plans
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
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
        <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-lg">
          Hi {firstName}, how can I help you today?
        </h2>
      </div>

      <div className="w-full max-w-2xl rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-center">
        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Preview mode</p>
        <p className="text-sm text-orange-800">
          You&apos;re on the Free plan. Try a prompt below to see what BaseBot can do — then upgrade to get real answers.
        </p>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function BaseBotPreviewClient({ firstName }: { firstName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isTyping) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: makeId(), text: content, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate a short delay before showing the upgrade response
    setTimeout(() => {
      const upgradeMsg: Message = { id: makeId(), text: "", sender: "upgrade" };
      setMessages((prev) => [...prev, upgradeMsg]);
      setIsTyping(false);
    }, 900);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden overscroll-none bg-gray-50">
      {/* ── Sidebar (static, no threads) ── */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-gray-100">
        {/* Header */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100 shrink-0">
          <BotAvatar size="sm" />
          <span className="font-bold text-gray-900 text-sm">BaseBot</span>
          <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
            Preview
          </span>
        </div>

        {/* Locked threads area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
            <LockIcon />
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Chat history is available on paid plans.
          </p>
          <Link
            href="/plans"
            className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Upgrade to unlock
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-2 py-3 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-xs text-gray-400 font-medium"
          >
            <BackIcon />
            Back to Home
          </Link>
        </div>
      </aside>

      {/* ── Main chat ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <BotAvatar size="sm" />
            <span className="font-bold text-gray-900 text-sm">BaseBot</span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
              Preview
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <MenuIcon />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Link
              href="/plans"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1L7 4.5H10.5L7.8 6.7L8.8 10L5.5 7.9L2.2 10L3.2 6.7L0.5 4.5H4L5.5 1Z" fill="currentColor" />
              </svg>
              Upgrade
            </Link>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {messages.length === 0 ? (
            <EmptyState firstName={firstName} onPrompt={handleSend} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((msg) => {
                if (msg.sender === "upgrade") {
                  return <UpgradeCard key={msg.id} />;
                }

                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-500 px-4 py-3 text-white">
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex w-full gap-3 justify-start" aria-live="polite" aria-busy="true">
                  <BotAvatar size="sm" />
                  <div className="min-w-0 flex-1 px-1 py-1">
                    <div className="space-y-2">
                      <div className="h-3 w-[70%] rounded bg-gray-100 animate-pulse" />
                      <div className="h-3 w-[88%] rounded bg-gray-100 animate-pulse" />
                      <div className="h-3 w-[52%] rounded bg-gray-100 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

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
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 flex items-center justify-center transition-colors shrink-0 mb-0.5"
              >
                <SendIcon />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-300 mt-2">
              This is a preview. Upgrade to get real AI-powered answers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
