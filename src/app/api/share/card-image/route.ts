import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createElement as h } from "react";

export const runtime = "edge";

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

function text(value: string | null, fallback: string, maxLen = 40): string {
  const s = (value ?? "").trim();
  return s.length > 0 ? s.slice(0, maxLen) : fallback;
}

function parseSubjects(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 6)
    .map((s) => s.slice(0, 26));
}

function getTier(aps: number): { label: string; color: string; badgeColor: string } {
  // color = orange shade for progress bar / stats / percentage (shifted darker for light bg readability)
  // badgeColor = tier-representative color for the header badge only
  if (aps >= 38) return { label: "Platinum Scholar", color: "#fb923c", badgeColor: "#9333ea" }; // orange-400 / purple-600
  if (aps >= 32) return { label: "Gold Scholar",     color: "#f97316", badgeColor: "#d97706" }; // orange-500 / amber-600
  if (aps >= 25) return { label: "Silver Scholar",   color: "#ea580c", badgeColor: "#52525b" }; // orange-600 / zinc-600
  if (aps >= 18) return { label: "Bronze Scholar",   color: "#c2410c", badgeColor: "#92400e" }; // orange-700 / amber-800
  return            { label: "Rising Scholar",    color: "#9a3412", badgeColor: "#4b5563" }; // orange-800 / gray-600
}

// ── Image ─────────────────────────────────────────────────────────────────────

/** GET /api/share/card-image */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const aps              = clamp(searchParams.get("aps"), 0);
    const rating           = text(searchParams.get("rating"), "N/A");
    const fullName         = text(searchParams.get("fullName"), "A Baseform Student");
    const grade            = text(searchParams.get("grade"), "Grade 12");
    const school           = text(searchParams.get("school"), "", 50);
    const subjects         = parseSubjects(searchParams.get("subjects"));
    const universities     = clamp(searchParams.get("universities"), 0);
    const programmes       = clamp(searchParams.get("programmes"), 0);
    const funding          = clamp(searchParams.get("funding"), 0);

    const tier   = getTier(aps);
    const apsPct = Math.round((aps / 42) * 100);

    // Progress bar fill width (out of 860px inner bar width)
    const BAR_W = 860;
    const fillW = Math.round((aps / 42) * BAR_W);

    // ── Card dimensions ──────────────────────────────────────────────────────
    const W = 1080;
    const H = 1350;
    const PAD = 52;

    return new ImageResponse(
      h(
        "div",
        {
          style: {
            width: `${W}px`,
            height: `${H}px`,
            display: "flex",
            flexDirection: "column",
            padding: `${PAD}px`,
            boxSizing: "border-box",
            background: `linear-gradient(160deg, ${tier.color}12 0%, #ffffff 22%, #fafafa 100%)`,
            fontFamily: "sans-serif",
          },
        },

          // ── Header row ───────────────────────────────────────────────────
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              },
            },

            // Wordmark
            h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                },
              },
              h("div", {
                style: {
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#f97316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 900,
                  color: "#ffffff",
                },
              }, "B"),
              h("div", {
                style: {
                  fontSize: "20px",
                  fontWeight: 700,
                  letterSpacing: "4px",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                },
              }, "Baseform"),
            ),

            // Tier badge — uses badgeColor (tier-specific) not the main orange
            h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "999px",
                  border: `1.5px solid ${tier.badgeColor}33`,
                  background: `${tier.badgeColor}0f`,
                  padding: "8px 20px",
                },
              },
              h("div", {
                style: {
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: tier.badgeColor,
                },
              }),
              h("div", {
                style: {
                  fontSize: "22px",
                  fontWeight: 700,
                  color: tier.badgeColor,
                },
              }, tier.label),
            ),
          ),

          // ── Name block ───────────────────────────────────────────────────
          h(
            "div",
            {
              style: {
                marginTop: "40px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              },
            },
            h("div", {
              style: {
                fontSize: "52px",
                fontWeight: 900,
                color: "#111827",
                lineHeight: 1.1,
              },
            }, fullName),
            h("div", {
              style: {
                fontSize: "26px",
                color: "#9ca3af",
                fontWeight: 500,
              },
            }, school ? `${grade} · ${school}` : grade),
          ),

          // ── Score section ────────────────────────────────────────────────
          h(
            "div",
            {
              style: {
                marginTop: "48px",
                width: "100%",
                borderRadius: "28px",
                background: `${tier.color}08`,
                border: `1.5px solid ${tier.color}20`,
                padding: "44px 48px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxSizing: "border-box",
              },
            },

            // Big APS number
            h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "12px",
                },
              },
              h("div", {
                style: {
                  fontSize: "180px",
                  fontWeight: 900,
                  color: "#111827",
                  lineHeight: 1,
                },
              }, String(aps)),
              h("div", {
                style: {
                  fontSize: "36px",
                  color: "#d1d5db",
                  fontWeight: 600,
                  paddingBottom: "28px",
                },
              }, "/ 42"),
            ),

            // Progress bar
            h(
              "div",
              {
                style: {
                  marginTop: "24px",
                  width: `${BAR_W}px`,
                  height: "14px",
                  borderRadius: "999px",
                  background: "#f3f4f6",
                  overflow: "hidden",
                  display: "flex",
                },
              },
              h("div", {
                style: {
                  width: `${fillW}px`,
                  height: "100%",
                  borderRadius: "999px",
                  background: `linear-gradient(90deg, ${tier.color}bb, ${tier.color})`,
                },
              }),
            ),

            // Percentage + Rating row
            h(
              "div",
              {
                style: {
                  marginTop: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                },
              },
              h("div", {
                style: {
                  fontSize: "30px",
                  fontWeight: 700,
                  color: tier.color,
                },
              }, `${apsPct}%`),
              h("div", {
                style: {
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#d1d5db",
                },
              }),
              h("div", {
                style: {
                  fontSize: "30px",
                  fontWeight: 700,
                  color: tier.color,
                },
              }, rating),
            ),
          ),

          // ── Stats row ────────────────────────────────────────────────────
          h(
            "div",
            {
              style: {
                marginTop: "32px",
                width: "100%",
                display: "flex",
                gap: "16px",
              },
            },

            ...[
              { label: "Universities", value: universities > 0 ? `${universities}+` : "—" },
              { label: "Funding",      value: funding > 0      ? `${funding}+`      : "—" },
              { label: "Programmes",   value: programmes > 0   ? `${programmes}+`   : "—" },
            ].map(({ label, value }) =>
              h(
                "div",
                {
                  key: label,
                  style: {
                    flex: 1,
                    borderRadius: "20px",
                    border: "1.5px solid #e5e7eb",
                    background: "#f9fafb",
                    padding: "20px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  },
                },
                h("div", {
                  style: {
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#9ca3af",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  },
                }, label),
                h("div", {
                  style: {
                    fontSize: "34px",
                    fontWeight: 900,
                    color: tier.color,
                    lineHeight: 1,
                  },
                }, value),
              )
            ),
          ),

          // ── Subject grid ─────────────────────────────────────────────────
          // NOTE: Satori does not support flexWrap or calc() — subjects are
          // rendered as explicit pairs of rows to avoid both.
          ...(subjects.length > 0
            ? [
                h("div", {
                  key: "subjects-label",
                  style: {
                    marginTop: "36px",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#d1d5db",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  },
                }, "Subject Breakdown"),
                h(
                  "div",
                  {
                    key: "subjects-rows",
                    style: {
                      marginTop: "14px",
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    },
                  },
                  ...Array.from({ length: Math.ceil(subjects.length / 2) }, (_, rowIdx) => {
                    const pair = subjects.slice(rowIdx * 2, rowIdx * 2 + 2);
                    return h(
                      "div",
                      {
                        key: `row-${rowIdx}`,
                        style: { display: "flex", gap: "12px", width: "100%" },
                      },
                      ...pair.map((subject, j) =>
                        h(
                          "div",
                          {
                            key: `${rowIdx}-${j}`,
                            style: {
                              flex: 1,
                              borderRadius: "16px",
                              border: "1.5px solid #e5e7eb",
                              background: "#f9fafb",
                              padding: "16px 20px",
                              display: "flex",
                              alignItems: "center",
                            },
                          },
                          h("div", {
                            style: {
                              fontSize: "22px",
                              fontWeight: 600,
                              color: "#374151",
                            },
                          }, subject),
                        )
                      ),
                    );
                  }),
                ),
              ]
            : []),

          // ── Footer ───────────────────────────────────────────────────────
          h(
            "div",
            {
              style: {
                marginTop: "auto",
                paddingTop: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                borderTop: "1px solid #e5e7eb",
              },
            },
            h("div", {
              style: {
                fontSize: "22px",
                color: "#d1d5db",
                fontWeight: 500,
              },
            }, "Calculate your APS free"),
            h("div", {
              style: {
                fontSize: "22px",
                fontWeight: 700,
                color: "#f97316",
              },
            }, "baseformapplications.com"),
          ),
      ),
      {
        width: W,
        height: H,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'inline; filename="aps-card.png"',
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error generating APS card image:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
