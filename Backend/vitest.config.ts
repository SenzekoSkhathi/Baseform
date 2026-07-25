import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    // Some modules (e.g. lib/supabase.ts) throw at import time if their env
    // vars are missing — load .env the same way src/index.ts does so tests
    // that transitively import them can run locally and in CI.
    setupFiles: ["./vitest.setup.ts"],
  },
});
