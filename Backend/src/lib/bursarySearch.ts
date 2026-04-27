/**
 * Bursary search via Postgres full-text search.
 * Wraps the search_bursaries_fts RPC and returns shaped results suitable
 * both for tool-use and citation display in the chat UI.
 *
 * Why FTS, not embeddings: keeps Baseform on a single AI vendor (Anthropic)
 * and avoids any third-party embedding API. The trade-off is weaker recall
 * on conceptual queries, which we mitigate by having Claude rephrase the
 * student's question into precise search terms when it calls this tool.
 */

import { supabaseAdmin } from "./supabase.js";
import { cache } from "./cache.js";
import { createHash } from "node:crypto";
import { createLogger } from "./logger.js";

const log = createLogger("bursary-search");

export type BursaryHit = {
  id: number;
  title: string;
  provider: string | null;
  description: string | null;
  funding_value: string | null;
  amount_per_year: number | null;
  minimum_aps: number | null;
  closing_date: string | null;
  detail_page_url: string | null;
  application_url: string | null;
  application_instructions: string | null;
  eligibility_requirements: string | null;
  fields_of_study: string[] | null;
  provinces_eligible: string[] | null;
  similarity: number;
};

type SearchOpts = {
  matchCount?: number;
  province?: string;
  field?: string;
};

const QUERY_CACHE_TTL_SECONDS = 60 * 60; // 1 hour — stable for a session

function cacheKey(query: string, opts: SearchOpts): string {
  const h = createHash("sha256");
  h.update(query.trim().toLowerCase());
  h.update("|");
  h.update(JSON.stringify(opts));
  return `bursary-search:fts:v1:${h.digest("hex")}`;
}

export async function searchBursaries(query: string, opts: SearchOpts = {}): Promise<BursaryHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const key = cacheKey(trimmed, opts);
  const cached = await cache.get<BursaryHit[]>(key);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin.rpc("search_bursaries_fts", {
    query: trimmed,
    match_count: opts.matchCount ?? 5,
    province_filter: opts.province ?? null,
    field_filter: opts.field ?? null,
  });

  if (error) {
    log.error("search_bursaries_fts RPC failed", { error: error.message });
    return [];
  }

  const hits = (data ?? []) as BursaryHit[];
  await cache.set(key, hits, QUERY_CACHE_TTL_SECONDS);
  return hits;
}
