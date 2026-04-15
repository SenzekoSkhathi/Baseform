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

function getTier(aps: number): { label: string; color: string } {
  if (aps >= 38) return { label: "Platinum Scholar", color: "#c084fc" };
  if (aps >= 32) return { label: "Gold Scholar",     color: "#fbbf24" };
  if (aps >= 25) return { label: "Silver Scholar",   color: "#94a3b8" };
  if (aps >= 18) return { label: "Bronze Scholar",   color: "#f97316" };
  return            { label: "Rising Scholar",    color: "#6b7280" };
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
    const programmes       = clamp(searchParams.get("programmes"), 0);
    const funding          = clamp(searchParams.get("funding"), 0);

    const tier   = getTier(aps);
    const apsPct = Math.round((aps / 42) * 100);

    // Progress bar fill width (out of 860px inner bar width)
    const BAR_W    = 860;
    const fillW    = Math.round((aps / 42) * BAR_W);

    // ── Card dimensions ──────────────────────────────────────────────────────
    const W = 1080;
    const H = 1350;
    const PAD = 52;

    return new ImageResponse(
      h(
        // Page background
        "div",
        {
          style: {
            width: `${W}px`,
            height: `${H}px`,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0c0a09",
            overflow: "hidden",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif",
          },
        },

        // Atmosphere glow — linear-gradient (radial-gradient is not supported by Satori)
        h("div", {
          style: {
            position: "absolute",
            top: "0px",
            left: "0px",
            width: "100%",
            height: "480px",
            background: `linear-gradient(to bottom, ${tier.color}22 0%, transparent 100%)`,
          },
        }),

        // Card — explicit height so content fills the frame and footer anchors to bottom
        h(
          "div",
          {
            style: {
              position: "relative",
              width: `${W - PAD * 2}px`,
              height: `${H - PAD * 2}px`,
              borderRadius: "44px",
              border: "1.5px solid #1e1e1e",
              background: "#111111",
              display: "flex",
              flexDirection: "column",
              padding: "52px",
              boxSizing: "border-box",
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
                  color: "#4b5563",
                  textTransform: "uppercase",
                },
              }, "Baseform"),
            ),

            // Tier badge
            h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "999px",
                  border: `1.5px solid ${tier.color}44`,
                  background: `${tier.color}18`,
                  padding: "8px 20px",
                },
              },
              h("div", {
                style: {
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: tier.color,
                },
              }),
              h("div", {
                style: {
                  fontSize: "22px",
                  fontWeight: 700,
                  color: tier.color,
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
                color: "#ffffff",
                lineHeight: 1.1,
              },
            }, fullName),
            h("div", {
              style: {
                fontSize: "26px",
                color: "#4b5563",
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
                background: `${tier.color}0f`,
                border: `1.5px solid ${tier.color}22`,
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
                  color: "#ffffff",
                  lineHeight: 1,
                },
              }, String(aps)),
              h("div", {
                style: {
                  fontSize: "36px",
                  color: "#4b5563",
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
                  background: "#1e1e1e",
                  overflow: "hidden",
                  display: "flex",
                },
              },
              h("div", {
                style: {
                  width: `${fillW}px`,
                  height: "100%",
                  borderRadius: "999px",
                  background: `linear-gradient(90deg, ${tier.color}cc, ${tier.color})`,
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
                  background: "#374151",
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
              { label: "Programmes", value: programmes > 0 ? `${programmes}+` : "—" },
              { label: "Funding",    value: funding > 0    ? `${funding}+`    : "—" },
              { label: "APS Score",  value: `${aps} / 42` },
            ].map(({ label, value }) =>
              h(
                "div",
                {
                  key: label,
                  style: {
                    flex: 1,
                    borderRadius: "20px",
                    border: "1.5px solid #1e1e1e",
                    background: "#0f0f0f",
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
                    color: "#4b5563",
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
          ...(subjects.length > 0
            ? [
                h("div", {
                  key: "subjects-label",
                  style: {
                    marginTop: "36px",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#374151",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  },
                }, "Subject Breakdown"),
                h(
                  "div",
                  {
                    key: "subjects-grid",
                    style: {
                      marginTop: "14px",
                      width: "100%",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                    },
                  },
                  ...subjects.map((subject, i) =>
                    h(
                      "div",
                      {
                        key: `${subject}-${i}`,
                        style: {
                          width: "calc(50% - 6px)",
                          borderRadius: "16px",
                          border: "1.5px solid #1e1e1e",
                          background: "#0f0f0f",
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          boxSizing: "border-box",
                        },
                      },
                      h("div", {
                        style: {
                          fontSize: "22px",
                          fontWeight: 600,
                          color: "#d1d5db",
                        },
                      }, subject),
                    )
                  ),
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
                borderTop: "1px solid #1a1a1a",
              },
            },
            h("div", {
              style: {
                fontSize: "22px",
                color: "#374151",
                fontWeight: 500,
              },
            }, "Calculate your APS free"),
            h("div", {
              style: {
                fontSize: "22px",
                fontWeight: 700,
                color: "#f97316",
              },
            }, "baseform.co.za"),
          ),
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
