import { NextResponse } from "next/server";
import sharp from "sharp";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** GET /api/share/card-image - Generates an APS card as an image */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aps = escapeXml(searchParams.get("aps") || "0");
    const rating = escapeXml(searchParams.get("rating") || "N/A");
    const submitted = escapeXml(searchParams.get("submitted") || "0");
    const pending = escapeXml(searchParams.get("pending") || "0");

    // Portrait card is optimized for social sharing posts/stories.
    const svg = `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff7ed" />
            <stop offset="100%" stop-color="#fffbeb" />
          </linearGradient>
          <linearGradient id="apsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb923c" />
            <stop offset="100%" stop-color="#f97316" />
          </linearGradient>
          <style>
            .label { font: 600 32px Arial, Helvetica, sans-serif; fill: #64748b; }
            .value { font: 800 56px Arial, Helvetica, sans-serif; fill: #0f172a; }
            .small { font: 600 28px Arial, Helvetica, sans-serif; fill: #94a3b8; }
          </style>
        </defs>

        <rect width="1080" height="1350" fill="url(#bgGradient)"/>
        <rect x="70" y="70" width="940" height="1210" rx="56" fill="#ffffff" stroke="#fed7aa" stroke-width="4"/>

        <text x="540" y="190" text-anchor="middle" style="font: 800 42px Arial, Helvetica, sans-serif; fill: #f97316; letter-spacing: 1px;">BASEFORM APS CARD</text>
        <text x="540" y="245" text-anchor="middle" class="label">Your Opportunity Report</text>

        <rect x="310" y="305" width="460" height="460" rx="48" fill="url(#apsGradient)"/>
        <text x="540" y="545" text-anchor="middle" style="font: 900 180px Arial, Helvetica, sans-serif; fill: #ffffff;">${aps}</text>
        <text x="540" y="635" text-anchor="middle" style="font: 700 44px Arial, Helvetica, sans-serif; fill: #ffedd5;">APS SCORE</text>

        <text x="140" y="860" class="label">Rating</text>
        <text x="140" y="930" class="value">${rating}</text>

        <line x1="140" y1="980" x2="940" y2="980" stroke="#e2e8f0" stroke-width="3"/>

        <text x="140" y="1060" class="label">Applications Submitted</text>
        <text x="940" y="1060" text-anchor="end" class="value">${submitted}</text>

        <text x="140" y="1150" class="label">Applications In Progress</text>
        <text x="940" y="1150" text-anchor="end" class="value">${pending}</text>

        <text x="540" y="1235" text-anchor="middle" class="small">Calculated from your best 6 subjects (excluding Life Orientation)</text>
      </svg>
    `;

    // Convert SVG to PNG using sharp
    const imageBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    // Return image as PNG with proper headers
    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="aps-card.png"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating APS card image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
