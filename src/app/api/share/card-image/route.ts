import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { createElement } from "react";

export const runtime = "edge";

function clampNumeric(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

function sanitizeText(value: string | null, fallback: string): string {
  const cleaned = (value ?? "").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 40) : fallback;
}

function sanitizeSubjects(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12)
    .map((item) => item.slice(0, 28));
}

/** GET /api/share/card-image - Generates an APS card as an image */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aps = clampNumeric(searchParams.get("aps"), 0);
    const rating = sanitizeText(searchParams.get("rating"), "N/A");
    const fullName = sanitizeText(searchParams.get("fullName"), "A Baseform Student");
    const grade = sanitizeText(searchParams.get("grade"), "Grade not specified");
    const school = sanitizeText(searchParams.get("school"), "School not specified");
    const subjects = sanitizeSubjects(searchParams.get("subjects"));
    const siteUrl = "https://baseformapplications.com";

    const motivation =
      aps >= 35
        ? "Excellent academic standing. Keep applying with confidence."
        : aps >= 28
        ? "Strong progress. Stay consistent and keep building momentum."
        : aps >= 21
        ? "Solid foundation. Focused effort will open more opportunities."
        : "Every assessment matters. Keep improving one step at a time.";

    return new ImageResponse(
      createElement(
        "div",
        {
          style: {
            width: "1080px",
            height: "1350px",
            display: "flex",
            background: "linear-gradient(145deg, #fff7ed 0%, #fffbeb 100%)",
              padding: "56px",
            boxSizing: "border-box",
            fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          },
        },
        createElement(
          "div",
          {
            style: {
              width: "100%",
              height: "100%",
              borderRadius: "44px",
              border: "3px solid #fed7aa",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              padding: "56px 56px 44px",
              boxSizing: "border-box",
            },
          },
          createElement(
            "div",
            {
              style: {
                fontSize: "36px",
                fontWeight: 800,
                letterSpacing: "1px",
                color: "#f97316",
                textAlign: "center",
              },
            },
            "BASEFORM APS CARD"
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "8px",
                fontSize: "28px",
                fontWeight: 600,
                color: "#64748b",
                textAlign: "center",
              },
            },
            "Academic Opportunity Report"
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "22px",
                width: "100%",
                borderRadius: "22px",
                border: "2px solid #fed7aa",
                background: "#fff7ed",
                padding: "18px 22px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxSizing: "border-box",
              },
            },
            createElement(
              "div",
              {
                style: {
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#334155",
                },
              },
              fullName
            ),
            createElement(
              "div",
              {
                style: {
                  fontSize: "19px",
                  color: "#64748b",
                },
              },
              `${grade} • ${school}`
            )
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "24px",
                width: "100%",
                borderRadius: "30px",
                background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "36px 38px",
                boxSizing: "border-box",
              },
            },
            createElement(
              "div",
              {
                style: {
                  fontSize: "120px",
                  fontWeight: 900,
                  color: "#ffffff",
                  lineHeight: 1,
                },
              },
              String(aps)
            ),
            createElement(
              "div",
              {
                style: {
                  fontSize: "34px",
                  fontWeight: 700,
                  color: "#ffedd5",
                  letterSpacing: "1px",
                },
              },
              "APS SCORE (OUT OF 42)"
            ),
            createElement(
              "div",
              {
                style: {
                  display: "flex",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.22)",
                  padding: "8px 20px",
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#ffffff",
                },
              },
              rating
            )
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "24px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              },
            },
            createElement(
              "div",
              {
                style: {
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "#64748b",
                  width: "100%",
                },
              },
              "Subjects"
            ),
            createElement(
              "div",
              {
                style: {
                  width: "100%",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                },
              },
              ...(subjects.length > 0
                ? subjects.map((subject, index) =>
                    createElement(
                      "div",
                      {
                        key: `${subject}-${index}`,
                        style: {
                          borderRadius: "999px",
                          border: "1.5px solid #e2e8f0",
                          background: "#f8fafc",
                          padding: "8px 14px",
                          fontSize: "20px",
                          fontWeight: 500,
                          color: "#334155",
                          display: "flex",
                        },
                      },
                      subject
                    )
                  )
                : [
                    createElement(
                      "div",
                      {
                        key: "empty-subjects",
                        style: {
                          fontSize: "20px",
                          color: "#94a3b8",
                        },
                      },
                      "No subjects listed"
                    ),
                  ])
            )
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "20px",
                width: "100%",
                flex: 1,
                borderRadius: "24px",
                border: "2px solid #fed7aa",
                background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              },
            },
            createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                },
              },
              createElement(
                "div",
                {
                  style: {
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#374151",
                    textAlign: "center",
                  },
                },
                motivation
              ),
              createElement(
                "div",
                {
                  style: {
                    width: "100%",
                    height: "2px",
                    background: "#fde3c4",
                  },
                }
              ),
              createElement(
                "div",
                {
                  style: {
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#475569",
                  },
                },
                "Recommended next steps"
              ),
              createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  },
                },
                createElement(
                  "div",
                  {
                    style: {
                      fontSize: "19px",
                      color: "#475569",
                    },
                  },
                  "1. Finalise your programme shortlist"
                ),
                createElement(
                  "div",
                  {
                    style: {
                      fontSize: "19px",
                      color: "#475569",
                    },
                  },
                  "2. Track university and bursary deadlines"
                ),
                createElement(
                  "div",
                  {
                    style: {
                      fontSize: "19px",
                      color: "#475569",
                    },
                  },
                  "3. Keep improving subjects with low APS impact"
                )
              )
            ),
            createElement(
              "div",
              {
                style: {
                  marginTop: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "16px",
                  background: "#fff",
                  border: "1.5px solid #fed7aa",
                },
              },
              createElement(
                "div",
                {
                  style: {
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#64748b",
                  },
                },
                "Calculate your APS on Baseform"
              ),
              createElement(
                "div",
                {
                  style: {
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#f97316",
                  },
                },
                siteUrl
              )
            )
          )
        )
      ),
      {
        width: 1080,
        height: 1350,
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
