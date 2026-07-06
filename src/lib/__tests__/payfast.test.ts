import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import {
  createPayFastParamString,
  createPayFastSignature,
  parsePayFastAmount,
  toPayFastAmount,
  isAmountMatch,
} from "../payfast";

describe("createPayFastParamString", () => {
  it("serializes fields in insertion order with PayFast encoding (spaces as +)", () => {
    const result = createPayFastParamString({
      merchant_id: "10000100",
      item_name: "Essential Plan 2026",
    });
    expect(result).toBe("merchant_id=10000100&item_name=Essential+Plan+2026");
  });

  it("drops empty-string fields", () => {
    const result = createPayFastParamString({
      merchant_id: "10000100",
      custom_str1: "",
      amount: "199.00",
    });
    expect(result).toBe("merchant_id=10000100&amount=199.00");
  });

  it("appends the passphrase last", () => {
    const result = createPayFastParamString({ merchant_id: "10000100" }, "my pass");
    expect(result).toBe("merchant_id=10000100&passphrase=my+pass");
  });

  it("handles a passphrase with no other fields", () => {
    expect(createPayFastParamString({}, "secret")).toBe("passphrase=secret");
  });

  it("percent-encodes reserved characters", () => {
    const result = createPayFastParamString({ item_name: "R100 & more?" });
    expect(result).toBe("item_name=R100+%26+more%3F");
  });
});

describe("createPayFastSignature", () => {
  it("is the md5 hex digest of the param string", () => {
    const fields = { merchant_id: "10000100", amount: "199.00" };
    const expected = createHash("md5")
      .update("merchant_id=10000100&amount=199.00&passphrase=pass")
      .digest("hex");
    expect(createPayFastSignature(fields, "pass")).toBe(expected);
  });

  it("changes when any field value changes", () => {
    const base = createPayFastSignature({ amount: "199.00" }, "pass");
    const tampered = createPayFastSignature({ amount: "1.00" }, "pass");
    expect(tampered).not.toBe(base);
  });
});

describe("amount helpers", () => {
  it("parsePayFastAmount strips currency symbols and junk", () => {
    expect(parsePayFastAmount("R199.00")).toBe(199);
    expect(parsePayFastAmount("199,00".replace(",", "."))).toBe(199);
    expect(parsePayFastAmount("garbage")).toBe(0);
  });

  it("toPayFastAmount always formats to 2 decimals", () => {
    expect(toPayFastAmount("199")).toBe("199.00");
    expect(toPayFastAmount("R 49.5")).toBe("49.50");
  });

  it("isAmountMatch tolerates sub-cent float noise but not real differences", () => {
    expect(isAmountMatch("199.00", "199.000001")).toBe(true);
    expect(isAmountMatch("199.00", "199.01")).toBe(false);
    expect(isAmountMatch("not-a-number", "199.00")).toBe(false);
  });
});
