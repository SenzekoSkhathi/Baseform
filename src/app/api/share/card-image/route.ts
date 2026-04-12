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

/** GET /api/share/card-image - Generates an APS card as an image */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aps = clampNumeric(searchParams.get("aps"), 0);
    const rating = sanitizeText(searchParams.get("rating"), "N/A");
    const submitted = clampNumeric(searchParams.get("submitted"), 0);
    const pending = clampNumeric(searchParams.get("pending"), 0);

    return new ImageResponse(
      createElement(
        "div",
        {
          style: {
            width: "1080px",
            height: "1350px",
            display: "flex",
            background: "linear-gradient(145deg, #fff7ed 0%, #fffbeb 100%)",
            padding: "70px",
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
              borderRadius: "56px",
              border: "4px solid #fed7aa",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "72px 70px 48px",
              boxSizing: "border-box",
            },
          },
          createElement(
            "div",
            {
              style: {
                fontSize: "42px",
                fontWeight: 800,
                letterSpacing: "1px",
                color: "#f97316",
              },
            },
            "BASEFORM APS CARD"
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "10px",
                fontSize: "32px",
                fontWeight: 600,
                color: "#64748b",
              },
            },
            "Your Opportunity Report"
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "48px",
                width: "460px",
                height: "460px",
                borderRadius: "48px",
                background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              },
            },
            createElement(
              "div",
              {
                style: {
                  fontSize: "180px",
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
                  marginTop: "10px",
                  fontSize: "44px",
                  fontWeight: 700,
                  color: "#ffedd5",
                  letterSpacing: "1px",
                },
              },
              "APS SCORE"
            )
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "78px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              },
            },
            createElement(
              "div",
              {
                style: {
                  fontSize: "32px",
                  fontWeight: 600,
                  color: "#64748b",
                  width: "100%",
                },
              },
              "Rating"
            ),
            createElement(
              "div",
              {
                style: {
                  fontSize: "56px",
                  fontWeight: 800,
                  color: "#0f172a",
                  width: "100%",
                },
              },
              rating
            ),
            createElement("div", {
              style: {
                marginTop: "16px",
                width: "100%",
                height: "3px",
                background: "#e2e8f0",
              },
            }),
            createElement(
              "div",
              {
                style: {
                  marginTop: "18px",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              },
              createElement(
                "div",
                {
                  style: {
                    fontSize: "32px",
                    fontWeight: 600,
                    color: "#64748b",
                  },
                },
                "Applications Submitted"
              ),
              createElement(
                "div",
                {
                  style: {
                    fontSize: "56px",
                    fontWeight: 800,
                    color: "#0f172a",
                  },
                },
                String(submitted)
              )
            ),
            createElement(
              "div",
              {
                style: {
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              },
              createElement(
                "div",
                {
                  style: {
                    fontSize: "32px",
                    fontWeight: 600,
                    color: "#64748b",
                  },
                },
                "Applications In Progress"
              ),
              createElement(
                "div",
                {
                  style: {
                    fontSize: "56px",
                    fontWeight: 800,
                    color: "#0f172a",
                  },
                },
                String(pending)
              )
            )
          ),
          createElement(
            "div",
            {
              style: {
                marginTop: "auto",
                fontSize: "28px",
                fontWeight: 600,
                color: "#94a3b8",
                textAlign: "center",
              },
            },
            "Calculated from your best 6 subjects (excluding Life Orientation)"
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
