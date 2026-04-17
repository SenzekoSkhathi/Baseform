import { createHash } from "crypto";
import type { NextRequest } from "next/server";

const SANDBOX_PROCESS_URL = "https://sandbox.payfast.co.za/eng/process";
const SANDBOX_VALIDATE_URL = "https://sandbox.payfast.co.za/eng/query/validate";
const SANDBOX_ONSITE_URL = "https://sandbox.payfast.co.za/onsite/process";
const SANDBOX_ENGINE_URL = "https://sandbox.payfast.co.za/onsite/engine.js";
const SANDBOX_API_URL = "https://api.payfast.co.za"; // PayFast uses same API host; sandbox mode toggled via testing header
const LIVE_PROCESS_URL = "https://www.payfast.co.za/eng/process";
const LIVE_VALIDATE_URL = "https://www.payfast.co.za/eng/query/validate";
const LIVE_ONSITE_URL = "https://www.payfast.co.za/onsite/process";
const LIVE_ENGINE_URL = "https://www.payfast.co.za/onsite/engine.js";
const LIVE_API_URL = "https://api.payfast.co.za";

export type PayFastMode = "sandbox" | "live";

export type PayFastConfig = {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  mode: PayFastMode;
};

export function getPayFastConfig(): PayFastConfig {
  const merchantId = String(process.env.PAYFAST_MERCHANT_ID ?? "").trim();
  const merchantKey = String(process.env.PAYFAST_MERCHANT_KEY ?? "").trim();
  const passphrase = String(process.env.PAYFAST_PASSPHRASE ?? "").trim();
  const sandboxRaw = process.env.PAYFAST_SANDBOX || process.env.NEXT_PUBLIC_PAYFAST_SANDBOX || "true";
  const mode = String(sandboxRaw).toLowerCase() === "false" ? "live" : "sandbox";

  if (!merchantId || !merchantKey) {
    throw new Error("Missing PayFast env vars: PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY are required.");
  }

  return {
    merchantId,
    merchantKey,
    passphrase,
    mode,
  };
}

export function getPayFastProcessUrl(config: PayFastConfig): string {
  return config.mode === "sandbox" ? SANDBOX_PROCESS_URL : LIVE_PROCESS_URL;
}

export function getPayFastValidateUrl(config: PayFastConfig): string {
  return config.mode === "sandbox" ? SANDBOX_VALIDATE_URL : LIVE_VALIDATE_URL;
}

export function getPayFastOnsiteUrl(config: PayFastConfig): string {
  return config.mode === "sandbox" ? SANDBOX_ONSITE_URL : LIVE_ONSITE_URL;
}

export function getPayFastEngineUrl(config: PayFastConfig): string {
  return config.mode === "sandbox" ? SANDBOX_ENGINE_URL : LIVE_ENGINE_URL;
}

function encodeForPayFast(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

export function createPayFastParamString(
  fields: Record<string, string>,
  passphrase?: string
): string {
  const entries = Object.entries(fields).filter(([, value]) => value !== "");
  const serialized = entries
    .map(([key, value]) => `${key}=${encodeForPayFast(value)}`)
    .join("&");

  if (!passphrase) {
    return serialized;
  }

  const encodedPassphrase = encodeForPayFast(passphrase);
  return serialized ? `${serialized}&passphrase=${encodedPassphrase}` : `passphrase=${encodedPassphrase}`;
}

export function createPayFastSignature(
  fields: Record<string, string>,
  passphrase?: string
): string {
  const paramString = createPayFastParamString(fields, passphrase);
  return createHash("md5").update(paramString).digest("hex");
}

export function getBaseUrl(req: NextRequest): string {
  const envBaseUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host") ?? "localhost:3000";
  const protocol = forwardedProto ?? "http";
  return `${protocol}://${host}`;
}

export function parsePayFastAmount(value: string): number {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

export function toPayFastAmount(value: string): string {
  return parsePayFastAmount(value).toFixed(2);
}

export function isAmountMatch(actual: string, expected: string): boolean {
  const actualNumber = Number.parseFloat(actual);
  const expectedNumber = Number.parseFloat(expected);

  if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) {
    return false;
  }

  return Math.abs(actualNumber - expectedNumber) < 0.01;
}

export function getPayFastApiUrl(config: PayFastConfig): string {
  return config.mode === "sandbox" ? SANDBOX_API_URL : LIVE_API_URL;
}

/**
 * Cancel a PayFast recurring subscription.
 * https://developers.payfast.co.za/docs#subscriptions
 * Auth is an md5 signature over timestamped merchant fields (same scheme as ITN).
 */
export async function cancelPayFastSubscription(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const config = getPayFastConfig();
  const timestamp = new Date().toISOString();
  const authFields: Record<string, string> = {
    "merchant-id": config.merchantId,
    version: "v1",
    timestamp,
  };
  const signature = createPayFastSignature(authFields, config.passphrase);

  const url = `${getPayFastApiUrl(config)}/subscriptions/${encodeURIComponent(token)}/cancel${
    config.mode === "sandbox" ? "?testing=true" : ""
  }`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "merchant-id": config.merchantId,
      version: "v1",
      timestamp,
      signature,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `PayFast cancel failed (${res.status}): ${text.slice(0, 200)}` };
  }

  return { ok: true };
}
