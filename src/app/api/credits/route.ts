import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits, getCreditTransactions } from "@/lib/credits";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [credits, transactions] = await Promise.all([
    getUserCredits(session.user.id),
    getCreditTransactions(session.user.id),
  ]);

  return NextResponse.json({ credits, transactions });
}
