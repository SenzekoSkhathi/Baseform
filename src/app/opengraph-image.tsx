import { ImageResponse } from "next/og";

// Site-wide OG share card (WhatsApp, Twitter, Facebook link previews).
// Placed at the app root so every page inherits it unless a segment
// provides its own opengraph-image.

export const alt = "Baseform — Your University Application Co-pilot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fff9f2",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="22" fill="#f97316" />
            <rect x="28" y="30" width="28" height="5" rx="2.5" fill="white" />
            <rect x="28" y="43" width="20" height="5" rx="2.5" fill="white" />
            <path
              d="M58 72 L58 44 L52 50 M58 44 L64 50"
              stroke="white"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 900, letterSpacing: -2 }}>
            <span style={{ color: "#111827" }}>base</span>
            <span style={{ color: "#f97316" }}>form</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              fontWeight: 900,
              color: "#111827",
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            <span>Your university application</span>
            <span>co-pilot</span>
          </div>
          <div style={{ fontSize: 32, color: "#4b5563", lineHeight: 1.35 }}>
            Discover universities and bursaries you qualify for, track every
            application, and never miss a deadline.
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#6b7280",
          }}
        >
          <span>baseformapplications.com</span>
          <span
            style={{
              background: "#f97316",
              color: "#ffffff",
              borderRadius: 999,
              padding: "10px 28px",
              fontWeight: 700,
            }}
          >
            For SA Grade 11 &amp; 12 learners
          </span>
        </div>
      </div>
    ),
    size
  );
}
