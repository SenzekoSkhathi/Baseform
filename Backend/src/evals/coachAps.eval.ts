/**
 * BaseBot coach eval. Run with:
 *   npm run eval:coach
 *
 * Hits live Claude. Verifies BaseBot doesn't regress on the load-bearing facts:
 *   - APS scale (excluding Life Orientation, best 6 subjects)
 *   - Western Cape university list
 *   - Plan / credit costs
 *
 * Pass criterion: every case must contain ALL `mustInclude` substrings
 * (case-insensitive) in the reply.
 */

import "dotenv/config";
import { anthropic, AI_MODEL, SYSTEM_PROMPT } from "../lib/ai.js";

type Case = {
  name: string;
  prompt: string;
  mustInclude: string[]; // all must appear (case-insensitive)
  mustNotInclude?: string[];
};

const CASES: Case[] = [
  {
    name: "APS scale",
    prompt: "What APS points do I get for 75% in maths?",
    mustInclude: ["6"],
  },
  {
    name: "Life Orientation excluded",
    prompt: "Does Life Orientation count toward my APS at UCT?",
    mustInclude: ["excluded"],
    mustNotInclude: ["counts"],
  },
  {
    name: "Best 6 subjects",
    prompt: "How many subjects are used to calculate my APS?",
    mustInclude: ["6"],
  },
  {
    name: "Western Cape unis",
    prompt: "Which universities are in the Western Cape?",
    mustInclude: ["UCT", "Stellenbosch"],
  },
  {
    name: "Plan credits",
    prompt: "How many Base Credits do I get on the Essential plan per week?",
    mustInclude: ["60"],
  },
];

async function runOne(c: Case): Promise<{ pass: boolean; reply: string; missing: string[]; forbidden: string[] }> {
  const result = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 400,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: c.prompt }],
  });
  const reply = result.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const lower = reply.toLowerCase();
  const missing = c.mustInclude.filter((s) => !lower.includes(s.toLowerCase()));
  const forbidden = (c.mustNotInclude ?? []).filter((s) => lower.includes(s.toLowerCase()));
  return { pass: missing.length === 0 && forbidden.length === 0, reply, missing, forbidden };
}

async function main() {
  let pass = 0;
  for (const c of CASES) {
    const r = await runOne(c);
    if (r.pass) pass++;
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${c.name}`);
    if (!r.pass) {
      if (r.missing.length) console.log(`  missing: ${r.missing.join(", ")}`);
      if (r.forbidden.length) console.log(`  forbidden: ${r.forbidden.join(", ")}`);
      console.log(`  reply: ${r.reply.slice(0, 200)}...`);
    }
  }
  console.log(`\n${pass}/${CASES.length} passed (${((pass / CASES.length) * 100).toFixed(0)}%)`);
  if (pass < CASES.length) {
    console.error("FAIL: at least one coach eval case regressed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
