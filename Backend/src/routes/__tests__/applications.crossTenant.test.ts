import { describe, it, expect, vi, beforeEach } from "vitest";
// vitest hoists vi.mock() calls above all imports in this file, so the
// static import below still resolves to the mocked modules.
import applications from "../applications.js";

// Regression test for cross-tenant isolation: student B must never be able to
// read/modify/delete student A's applications, even by guessing/enumerating
// the row id. This exercises the real route handlers (applications.ts) with
// a fake in-memory Supabase table standing in for `supabaseAdmin`, and a fake
// `requireAuth` standing in for real JWT verification — so it's a genuine
// check of the ownership-scoping logic (`.eq("student_id", user.id)`), not
// just a smoke test.

let currentUser = { id: "student-a", email: "a@test.com" };

vi.mock("../../middleware/auth.js", () => ({
  requireAuth: async (ctx: any, next: any) => {
    ctx.set("user", currentUser);
    await next();
  },
}));

type Row = { id: string; student_id: string; status: string; notes: string | null; updated_at: string };

let table: Row[];

function makeChain(name: string) {
  if (name !== "applications") throw new Error(`unexpected table in test: ${name}`);

  const filters: [string, unknown][] = [];
  let op: "select" | "update" | "delete" = "select";
  let patch: Record<string, unknown> = {};

  const matches = () => table.filter((row) => filters.every(([col, val]) => (row as any)[col] === val));

  const resolve = () => {
    const rows = matches();
    if (op === "update") {
      rows.forEach((row) => Object.assign(row, patch));
      return { data: rows[0] ?? null, error: null };
    }
    if (op === "delete") {
      for (const row of rows) table.splice(table.indexOf(row), 1);
      return { error: null };
    }
    return { data: rows, error: null };
  };

  const chain: any = {
    eq: (col: string, val: unknown) => {
      filters.push([col, val]);
      return chain;
    },
    select: () => chain,
    single: () => Promise.resolve(resolve()),
    update: (p: Record<string, unknown>) => {
      op = "update";
      patch = p;
      return chain;
    },
    delete: () => {
      op = "delete";
      return chain;
    },
    // supabase-js query builders are thenable; DELETE is awaited directly
    // without a terminal .select().single(), so the chain must be too.
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
  };
  return chain;
}

vi.mock("../../lib/supabase.js", () => ({
  supabaseAdmin: { from: (t: string) => makeChain(t) },
}));

beforeEach(() => {
  table = [
    { id: "app-1", student_id: "student-a", status: "planning", notes: null, updated_at: "" },
  ];
});

describe("applications cross-tenant isolation", () => {
  it("owner can update their own application", async () => {
    currentUser = { id: "student-a", email: "a@test.com" };
    const res = await applications.request("/app-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "submitted" }),
    });
    expect(res.status).toBe(200);
    expect(table[0].status).toBe("submitted");
  });

  it("a different student cannot update another student's application", async () => {
    currentUser = { id: "student-b", email: "b@test.com" };
    const res = await applications.request("/app-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    expect(res.status).toBe(404);
    expect(table[0].status).toBe("planning"); // unchanged
  });

  it("a different student cannot delete another student's application", async () => {
    currentUser = { id: "student-b", email: "b@test.com" };
    await applications.request("/app-1", { method: "DELETE" });
    expect(table).toHaveLength(1); // still present
  });

  it("the owner can delete their own application", async () => {
    currentUser = { id: "student-a", email: "a@test.com" };
    await applications.request("/app-1", { method: "DELETE" });
    expect(table).toHaveLength(0);
  });
});
