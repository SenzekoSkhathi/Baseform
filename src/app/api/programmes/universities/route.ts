import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("universities")
      .select("id, name, abbreviation, province, city")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch universities" },
        { status: 500 }
      );
    }

    const unique = new Map<string, { id: string; name: string; abbreviation: string | null; province: string | null; city: string | null }>();
    for (const uni of data || []) {
      const key = (uni.abbreviation || uni.name).trim().toLowerCase();
      if (!unique.has(key)) unique.set(key, uni);
    }

    return NextResponse.json(Array.from(unique.values()), {
      headers: {
        // Universities list changes rarely — cache for 5 min, serve stale for 10 min.
        // Critical for users on slow SA mobile data (avoids repeat round-trips).
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
