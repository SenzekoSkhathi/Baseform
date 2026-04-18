"use client";

import { useState } from "react";
import { ChevronDown, Mail, Bug, RotateCcw, ExternalLink } from "lucide-react";

const FAQS = [
  {
    q: "How is my APS calculated?",
    a: "Baseform uses the standard South African APS system. Each subject mark is converted to a point value (1–7), and your best 6 subjects are summed — excluding Life Orientation. The maximum possible APS is 42.",
  },
  {
    q: "Why does my APS differ from what my school says?",
    a: "Some universities use their own scoring systems alongside APS (e.g. the NBT). Your school may also count LO or use a different scale. Baseform follows the standard NSC APS method.",
  },
  {
    q: "Can I apply directly through Baseform?",
    a: "Not yet — Baseform helps you track and manage your applications, but you must submit them directly to each university. We show you deadlines, requirements, and track your progress in one place.",
  },
  {
    q: "What is the Vault for?",
    a: "The Vault is your personal document store. Upload your ID, matric transcripts, proof of address, motivation letters, and other files so they're always ready when you need to apply.",
  },
  {
    q: "How do bursaries work on Baseform?",
    a: "Baseform lists active South African bursaries with their minimum APS requirements. We filter them based on your score and field of interest. You still apply directly to the bursary provider.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Your data is stored securely on Supabase infrastructure. We never share your personal information with third parties. You can delete all your data at any time from Settings → Privacy.",
  },
  {
    q: "What does 'Rising Scholar', 'Bronze Scholar' etc. mean?",
    a: "These are APS tiers that give you a quick sense of where you stand: Rising (<18), Bronze (18–24), Silver (25–31), Gold (32–37), Platinum (38–42). They're motivational labels, not official classifications.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-1 py-4 text-left"
      >
        <p className="text-sm font-semibold text-gray-800">{q}</p>
        <ChevronDown
          size={16}
          className={["text-gray-400 shrink-0 transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}
        />
      </button>
      {open && (
        <p className="pb-4 px-1 text-sm text-gray-500 leading-relaxed">{a}</p>
      )}
    </li>
  );
}

function restartTour() {
  try {
    localStorage.removeItem("bf_tour_v1");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("bf_tour_v1:")) localStorage.removeItem(key);
    }
  } catch { /* ignore */ }
  window.location.href = "/dashboard";
}

export default function HelpPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-black text-gray-900">Help & Support</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Answers to common questions and ways to get in touch.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <a
          href="mailto:support@baseformapplications.com"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
            <Mail size={17} className="text-orange-500" />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">Email us</p>
            <p className="text-xs text-gray-400">Get a reply within 24h</p>
          </div>
        </a>

        <a
          href="https://github.com/SenzekoSkhathi/Baseform/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <Bug size={17} className="text-red-500" />
          </span>
          <div className="flex items-center gap-1.5">
            <div>
              <p className="text-sm font-bold text-gray-900">Report a bug</p>
              <p className="text-xs text-gray-400">GitHub Issues</p>
            </div>
            <ExternalLink size={11} className="text-gray-300 mb-2.5" />
          </div>
        </a>

        <button
          type="button"
          onClick={restartTour}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors text-left w-full"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <RotateCcw size={17} className="text-blue-500" />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">Restart tour</p>
            <p className="text-xs text-gray-400">Replay the app guide</p>
          </div>
        </button>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Frequently asked questions</h2>
        <ul>
          {FAQS.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </ul>
      </div>
    </div>
  );
}
