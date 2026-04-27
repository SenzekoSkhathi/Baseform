/**
 * Records AI usage to ai_coach_logs with retry. Used for credit billing,
 * so failures must not be silently dropped — we retry then log.error if we
 * still cannot persist.
 */

import { supabaseAdmin } from "./supabase.js";
import { withRetry } from "./retry.js";
import { createLogger } from "./logger.js";

const log = createLogger("ai-usage");

type Entry = {
  student_id: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  model: string;
};

export async function recordUsage(entry: Entry): Promise<void> {
  try {
    await withRetry(
      async () => {
        const { error } = await supabaseAdmin.from("ai_coach_logs").insert(entry);
        if (error) throw new Error(error.message);
      },
      { retries: 3, label: "ai_coach_logs.insert" }
    );
  } catch (err) {
    log.error("Failed to record AI usage after retries", {
      student_id: entry.student_id,
      model: entry.model,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
