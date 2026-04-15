"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy, Check, Share2, FileText, Shield,
  Heart, ExternalLink,
} from "lucide-react";

const APP_VERSION = "1.0.0";
const APP_URL = "https://baseformapplications.com";

const TEAM = [
  {
    name: "Senzeko Skhathi Nduli",
    role: "Founder & Developer",
    avatarFrom: "#fb923c",
    avatarTo: "#ea580c",
    initial: "S",
  },
  {
    name: "Ande Melane",
    role: "Co-Founder",
    avatarFrom: "#60a5fa",
    avatarTo: "#2563eb",
    initial: "A",
  },
];

export default function AboutPage() {
  const [copied, setCopied] = useState(false);

  const shareMessage = `I'm using Baseform to manage my university applications and track my APS score. Built for South African Grade 12 learners — check it out:`;

  async function copyLink() {
    await navigator.clipboard.writeText(`${shareMessage}\n${APP_URL}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Baseform — University Applications for SA Grade 12s",
          text: shareMessage,
          url: APP_URL,
        });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  }

  return (
    <div className="space-y-4">
      {/* App identity */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-md">
            <span className="text-xl font-black text-white">B</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900">Baseform</h1>
            <p className="text-xs text-gray-400">Version {APP_VERSION} · Built in South Africa 🇿🇦</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500 leading-relaxed">
          Baseform helps South African Grade 12 learners calculate their APS, discover qualifying university programmes, find bursaries, and manage their applications — all in one place.
        </p>
      </div>

      {/* Share the app */}
      <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Share Baseform</h2>
        <p className="mt-0.5 text-xs text-gray-500 mb-4">
          Know a Grade 12 learner who could use this? Share it with them — it&apos;s free.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={nativeShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
          >
            <Share2 size={14} />
            Share
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-colors"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      {/* Team */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-1.5 mb-4">
          <Heart size={14} className="text-red-400" />
          <h2 className="text-sm font-bold text-gray-900">Built by</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEAM.map(({ name, role, avatarFrom, avatarTo, initial }) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${avatarFrom}, ${avatarTo})` }}
              >
                <span className="text-sm font-black text-white">{initial}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{name}</p>
                <p className="text-xs text-gray-400">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legal */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Legal</h2>
        <ul className="space-y-2">
          <li>
            <Link
              href="/terms"
              target="_blank"
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Terms of Service</span>
              </div>
              <ExternalLink size={13} className="text-gray-300" />
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              target="_blank"
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Privacy Policy</span>
              </div>
              <ExternalLink size={13} className="text-gray-300" />
            </Link>
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-gray-400 text-center">
          © {new Date().getFullYear()} Baseform. All rights reserved.
        </p>
      </div>
    </div>
  );
}
