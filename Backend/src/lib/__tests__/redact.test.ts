import { describe, it, expect } from "vitest";
import { redactPII } from "../redact.js";

describe("redactPII", () => {
  it("redacts SA ID numbers", () => {
    expect(redactPII("My ID is 9201015800087")).toBe("My ID is [sa-id-redacted]");
  });

  it("redacts email addresses", () => {
    expect(redactPII("Email me at student@example.com please")).toBe(
      "Email me at [email-redacted] please"
    );
  });

  it("redacts SA phone numbers", () => {
    expect(redactPII("Call 0823456789")).toBe("Call [phone-redacted]");
    expect(redactPII("Call +27823456789")).toBe("Call [phone-redacted]");
  });

  it("redacts card-like number sequences", () => {
    expect(redactPII("4111 1111 1111 1111 is mine")).toBe(
      "[card-number-redacted] is mine"
    );
  });

  it("leaves normal text untouched", () => {
    expect(redactPII("My APS is 35 and I want to study at UCT")).toBe(
      "My APS is 35 and I want to study at UCT"
    );
  });

  it("handles empty input", () => {
    expect(redactPII("")).toBe("");
  });
});
