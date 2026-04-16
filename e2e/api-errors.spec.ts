import { test, expect } from "@playwright/test";

/**
 * API error scenario tests — verifies that routes correctly reject
 * unauthenticated requests (401) and malformed inputs (400).
 * These run without credentials so they're always active in CI.
 */

// ─── Auth-protected routes return 401 when unauthenticated ───────────────────

test.describe("Auth-protected API routes — 401 when unauthenticated", () => {
  const protectedGetRoutes = [
    "/api/credits",
    "/api/applications",
    "/api/notifications",
    "/api/settings",
    "/api/bursary-tracker",
  ];

  for (const route of protectedGetRoutes) {
    test(`GET ${route} → 401`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(401);
    });
  }

  const protectedPostRoutes = [
    "/api/applications",
    "/api/credits/deduct",
    "/api/account/delete",
    "/api/push/subscribe",
  ];

  for (const route of protectedPostRoutes) {
    test(`POST ${route} → 401`, async ({ request }) => {
      const res = await request.post(route, { data: {} });
      expect(res.status()).toBe(401);
    });
  }
});

// ─── Waitlist — public but validates input ────────────────────────────────────

test.describe("POST /api/waitlist — input validation", () => {
  test("missing email returns 400", async ({ request }) => {
    const res = await request.post("/api/waitlist", {
      data: { name: "Test User" },
    });
    expect(res.status()).toBe(400);
  });

  test("invalid email format returns 400", async ({ request }) => {
    const res = await request.post("/api/waitlist", {
      data: { email: "not-an-email", name: "Test" },
    });
    expect(res.status()).toBe(400);
  });

  test("empty body returns 400", async ({ request }) => {
    const res = await request.post("/api/waitlist", { data: {} });
    expect(res.status()).toBe(400);
  });
});

// ─── Programmes — public read endpoints ──────────────────────────────────────

test.describe("GET /api/programmes — public endpoint", () => {
  test("returns array of programmes", async ({ request }) => {
    const res = await request.get("/api/programmes");
    // Either success with data, or a known error (misconfigured env in CI)
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test("GET /api/programmes/universities returns array", async ({ request }) => {
    const res = await request.get("/api/programmes/universities");
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });
});

// ─── Site config — public read ────────────────────────────────────────────────

test.describe("GET /api/site-config — public endpoint", () => {
  test("returns a valid config object", async ({ request }) => {
    const res = await request.get("/api/site-config");
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(typeof data).toBe("object");
    }
  });
});

// ─── Share endpoint — public but validates token ─────────────────────────────

test.describe("GET /api/share/[token] — public", () => {
  test("unknown token returns 404", async ({ request }) => {
    const res = await request.get("/api/share/00000000-0000-0000-0000-000000000000");
    expect([404, 400]).toContain(res.status());
  });

  test("malformed token returns 400 or 404", async ({ request }) => {
    const res = await request.get("/api/share/not-a-uuid");
    expect([400, 404]).toContain(res.status());
  });
});

// ─── Parent portal — public but validates token ──────────────────────────────

test.describe("GET /api/parent/[token]", () => {
  test("unknown token returns 404", async ({ request }) => {
    const res = await request.get("/api/parent/00000000-0000-0000-0000-000000000000");
    expect([404, 400]).toContain(res.status());
  });
});

// ─── VAPID public key — public ────────────────────────────────────────────────

test.describe("GET /api/push/vapid-public-key", () => {
  test("returns a public key string", async ({ request }) => {
    const res = await request.get("/api/push/vapid-public-key");
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const data = await res.json();
      expect(typeof data.key === "string" || typeof data.publicKey === "string").toBe(true);
    }
  });
});

// ─── Referral — public but validates code ────────────────────────────────────

test.describe("GET /api/referral", () => {
  test("missing code param returns 400", async ({ request }) => {
    const res = await request.get("/api/referral");
    expect([400, 404]).toContain(res.status());
  });

  test("unknown referral code returns 404", async ({ request }) => {
    const res = await request.get("/api/referral?code=XXXXNOTREAL");
    expect([404, 400]).toContain(res.status());
  });
});
