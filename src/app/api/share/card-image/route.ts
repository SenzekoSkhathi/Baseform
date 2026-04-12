import { NextResponse } from "next/server";
import sharp from "sharp";

/** GET /api/share/card-image - Generates an APS card as an image */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aps = searchParams.get("aps") || "0";
    const rating = searchParams.get("rating") || "N/A";
    const submitted = searchParams.get("submitted") || "0";
    const pending = searchParams.get("pending") || "0";

    // Create SVG representation of the APS card
    const svg = `
      <svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fff9f2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fffbf5;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <rect width="600" height="300" fill="url(#bgGradient)"/>
        
        <!-- Border -->
        <rect x="20" y="20" width="560" height="260" fill="white" stroke="#fed7aa" stroke-width="2" rx="24"/>
        
        <!-- APS Box -->
        <rect x="40" y="40" width="100" height="100" fill="#f97316" rx="16"/>
        <text x="90" y="75" font-size="48" font-weight="900" fill="white" text-anchor="middle" font-family="system-ui">${aps}</text>
        <text x="90" y="130" font-size="12" font-weight="600" fill="#fed7aa" text-anchor="middle" font-family="system-ui">APS</text>
        
        <!-- Rating -->
        <text x="180" y="75" font-size="32" font-weight="900" fill="#1f2937" font-family="system-ui">${rating}</text>
        <text x="180" y="100" font-size="12" fill="#6b7280" font-family="system-ui">Score out of 42</text>
        
        <!-- Applications Stats -->
        <text x="180" y="135" font-size="13" font-weight="700" fill="#16a34a" font-family="system-ui">${submitted} submitted</text>
        <text x="180" y="155" font-size="13" fill="#9ca3af" font-family="system-ui">${pending} in progress</text>
        
        <!-- Footer -->
        <text x="300" y="260" font-size="12" fill="#9ca3af" text-anchor="middle" font-family="system-ui">Baseform · Your Opportunity Report</text>
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
