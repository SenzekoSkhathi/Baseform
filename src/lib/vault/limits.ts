// Per-tier vault storage ceiling in bytes. Shared by the usage UI and the
// upload handler so the numbers can never drift.
export const VAULT_LIMITS_BYTES: Record<string, number> = {
  free: 25 * 1024 * 1024,         // 25 MB — enough for a few IDs/transcripts
  essential: 100 * 1024 * 1024,   // 100 MB
  pro: 500 * 1024 * 1024,         // 500 MB
  ultra: 1024 * 1024 * 1024,      // 1 GB
};

export function vaultLimitForTier(tier: string): number {
  return VAULT_LIMITS_BYTES[tier] ?? VAULT_LIMITS_BYTES.free;
}

// Upper bound for a single file, regardless of tier.
export const VAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
