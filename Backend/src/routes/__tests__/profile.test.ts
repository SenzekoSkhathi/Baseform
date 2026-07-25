import { describe, it, expect } from "vitest";
import { pickProfileUpdates, PROFILE_PATCH_ALLOWED_FIELDS } from "../profile";

describe("pickProfileUpdates", () => {
  it("never includes tier, regardless of what the client sends", () => {
    const updates = pickProfileUpdates({ full_name: "Thabo", tier: "admin" });
    expect(updates).not.toHaveProperty("tier");
    expect(updates).toEqual({ full_name: "Thabo" });
  });

  it("rejects any field not on the whitelist (e.g. role, id, email)", () => {
    const updates = pickProfileUpdates({
      full_name: "Thabo",
      role: "admin",
      id: "someone-elses-uuid",
      email: "new@example.com",
    });
    expect(updates).toEqual({ full_name: "Thabo" });
  });

  it("passes through every legitimate field a student can edit", () => {
    const body = Object.fromEntries(
      PROFILE_PATCH_ALLOWED_FIELDS.map((key) => [key, `value-${key}`])
    );
    expect(pickProfileUpdates(body)).toEqual(body);
  });

  it("returns an empty object when nothing whitelisted is present", () => {
    expect(pickProfileUpdates({ tier: "admin", role: "admin" })).toEqual({});
  });

  it("PROFILE_PATCH_ALLOWED_FIELDS never contains tier or role", () => {
    expect(PROFILE_PATCH_ALLOWED_FIELDS).not.toContain("tier");
    expect(PROFILE_PATCH_ALLOWED_FIELDS).not.toContain("role");
  });
});
