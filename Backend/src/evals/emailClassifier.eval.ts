/**
 * Email classifier eval. Run with:
 *   npm run eval:email
 *
 * Hits live Claude — costs a few cents per run. Use whenever you change the
 * model or system prompt for emailAnalyzer.
 *
 * Pass criterion: ≥90% of cases must match `expected`. Below that, exit 1.
 */

import "dotenv/config";
import { analyzeEmail, type DetectedStatus } from "../lib/emailAnalyzer.js";

type Case = {
  name: string;
  university: string;
  from: string;
  subject: string;
  body: string;
  expected: DetectedStatus;
};

const CASES: Case[] = [
  {
    name: "UCT acceptance",
    university: "University of Cape Town",
    from: "admissions@uct.ac.za",
    subject: "Offer of Admission — BSc Computer Science 2027",
    body: "Dear Applicant, We are pleased to offer you a place in the Bachelor of Science (Computer Science) at the University of Cape Town for the 2027 academic year. Please confirm acceptance by 30 November.",
    expected: "accepted",
  },
  {
    name: "Stellenbosch rejection",
    university: "Stellenbosch University",
    from: "admissions@sun.ac.za",
    subject: "Application Outcome — BCom Accounting",
    body: "Thank you for your application. After careful consideration, we regret to inform you that your application has been unsuccessful. We wish you the best in your future studies.",
    expected: "rejected",
  },
  {
    name: "UWC waitlist",
    university: "University of the Western Cape",
    from: "admissions@uwc.ac.za",
    subject: "Reserve list — BA Law",
    body: "You have been placed on the reserve list for BA Law. We will contact you if a space becomes available before registration closes.",
    expected: "waitlisted",
  },
  {
    name: "CPUT documents required",
    university: "Cape Peninsula University of Technology",
    from: "admissions@cput.ac.za",
    subject: "Action required — outstanding documents",
    body: "Your application is currently incomplete. Please upload your final matric results and a certified copy of your ID before 15 January.",
    expected: "in_progress",
  },
  {
    name: "Wits submitted confirmation",
    university: "University of the Witwatersrand",
    from: "noreply@wits.ac.za",
    subject: "Application received",
    body: "Your application to the University of the Witwatersrand has been received and submitted successfully. Your reference number is W12345. You will be notified of the outcome.",
    expected: "submitted",
  },
  {
    name: "Newsletter (irrelevant)",
    university: "University of Cape Town",
    from: "newsletter@uct.ac.za",
    subject: "UCT Open Day 2027 — register now",
    body: "Join us for our annual Open Day on Saturday 5 May. Tour the campus, meet faculty, and learn about our programmes.",
    expected: "unknown",
  },
];

async function main() {
  let pass = 0;
  const failures: { name: string; got: DetectedStatus; expected: DetectedStatus; reason: string }[] = [];

  for (const c of CASES) {
    const r = await analyzeEmail(c.from, c.subject, c.body, c.university);
    const ok = r.status === c.expected;
    if (ok) pass++;
    else failures.push({ name: c.name, got: r.status, expected: c.expected, reason: r.reason });
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}  →  expected=${c.expected}  got=${r.status}  (${r.confidence})`);
  }

  const rate = pass / CASES.length;
  console.log(`\n${pass}/${CASES.length} passed (${(rate * 100).toFixed(0)}%)`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  ${f.name}: got "${f.got}", expected "${f.expected}" — ${f.reason}`);
  }
  if (rate < 0.9) {
    console.error("\nFAIL: pass rate below 90% threshold");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
