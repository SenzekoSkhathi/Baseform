/**
 * Run:  npx tsx scripts/previewEmails.ts
 *
 * Writes two HTML files to /tmp (or the project root on Windows) and
 * opens them in your default browser so you can see exactly how the
 * emails will look before sending any real mail.
 */

import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { buildDeadlineEmail, buildGuardianEmail } from "../src/lib/emailSender.js";

// ── Sample data — edit these to match your real data ────────────────────────

const deadline = buildDeadlineEmail({
  firstName:      "Senze",
  universityName: "University of Cape Town",
  closingDate:    "2026-09-30",
  daysLeft:       7,
  programmeCount: 2,
  appStatus:      "planning",
  appUrl:         "http://localhost:3000/dashboard/detail/1",
});

const guardian = buildGuardianEmail({
  guardianName:   "Mrs Dlamini",
  studentName:    "Senze",
  universityName: "University of the Western Cape",
  programmeName:  "Bachelor of Commerce",
  newStatus:      "submitted",
  closingDate:    "2026-09-30",
  appUrl:         "http://localhost:3000/dashboard/detail/2",
});

// ── Write and open ───────────────────────────────────────────────────────────

const outDir = process.cwd();

const deadlinePath = join(outDir, "preview_deadline.html");
const guardianPath = join(outDir, "preview_guardian.html");

writeFileSync(deadlinePath, deadline.html, "utf8");
writeFileSync(guardianPath, guardian.html, "utf8");

console.log(`\n✓ Deadline email  → ${deadlinePath}`);
console.log(`  Subject: ${deadline.subject}`);
console.log(`\n✓ Guardian email  → ${guardianPath}`);
console.log(`  Subject: ${guardian.subject}`);

// Open in browser (Windows: start, Mac: open, Linux: xdg-open)
try {
  if (process.platform === "win32") {
    execSync(`cmd /c start "" "${deadlinePath}"`);
    execSync(`cmd /c start "" "${guardianPath}"`);
  } else {
    const open = process.platform === "darwin" ? "open" : "xdg-open";
    execSync(`${open} "${deadlinePath}"`);
    execSync(`${open} "${guardianPath}"`);
  }
  console.log("\nOpened in browser.");
} catch {
  console.log("\nCould not auto-open — open the files above manually.");
}
