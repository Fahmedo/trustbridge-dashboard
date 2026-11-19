/**
 * Non-test fixtures for the API-key rotation drill (#693).
 *
 * Accuracy note: `src/lib/api-key-crypto.ts` generates `tb_…` keys and stores
 * only a SHA-256 hex digest. There is NO ciphertext and NO wrapping key today.
 * "Versions" and "wrapping keys" below model a future migration/drill only;
 * every value is fake and must never be used as a credential.
 */

/** Fake, pattern-shaped key; not a credential. */
export const FAKE_RAW_API_KEY = "tb_" + "FAKE".repeat(10) + "FAK";
export const FAKE_LEGACY_DIGEST = "fake-legacy-sha256-digest-0001";
export const FAKE_CURRENT_DIGEST = "fake-current-versioned-digest-0001";

export interface KeyVersionFixture {
  version: string;
  algorithm: string;
  storedAs: string;
  implementedToday: boolean;
}

export const API_KEY_VERSION_FIXTURES: readonly KeyVersionFixture[] = [
  {
    version: "digest-v1",
    algorithm: "sha256(raw) → hex",
    storedAs: "ApiKey.keyHash",
    implementedToday: true,
  },
  {
    version: "digest-v2",
    algorithm: "versioned/domain-separated digest (hypothetical)",
    storedAs: "ApiKey.keyHashV2 (hypothetical column)",
    implementedToday: false,
  },
];

export interface DualReadCase {
  name: string;
  legacyMatch: string | null;
  currentMatch: string | null;
  outcome: "accept" | "reject";
  reason?: string;
  action: string;
}

/** Decision table for a digest-version migration with a dual-read window. */
export const DUAL_READ_DECISION_TABLE: readonly DualReadCase[] = [
  {
    name: "legacy digest only",
    legacyMatch: "key-001",
    currentMatch: null,
    outcome: "accept",
    action: "Authenticate from the legacy row; opportunistically write digest-v2 on success.",
  },
  {
    name: "current digest only",
    legacyMatch: null,
    currentMatch: "key-001",
    outcome: "accept",
    action: "Authenticate normally; no rewrite needed.",
  },
  {
    name: "both digests resolve to the same key",
    legacyMatch: "key-001",
    currentMatch: "key-001",
    outcome: "accept",
    action: "Authenticate once, preferring the current row; clear the legacy digest after the window.",
  },
  {
    name: "digests resolve to different keys",
    legacyMatch: "key-001",
    currentMatch: "key-999",
    outcome: "reject",
    reason: "ambiguous_key_version",
    action: "Fail closed, emit an alert, and do not rewrite either row.",
  },
  {
    name: "no digest matches",
    legacyMatch: null,
    currentMatch: null,
    outcome: "reject",
    reason: "invalid_api_key",
    action: "Return 401; write api_key.use_rejected with reason invalid_api_key.",
  },
  {
    name: "matching row is revoked or expired",
    legacyMatch: "key-002",
    currentMatch: null,
    outcome: "reject",
    reason: "revoked_or_expired",
    action: "Keep existing lifecycle audit reasons; never rewrap a non-active key.",
  },
];

/** Future design only — models a zero-downtime wrapping-key rewrap drill. */
export const WRAPPING_KEY_ROTATION_FIXTURE = {
  activeKeyId: "wrap-v1 (hypothetical)",
  nextKeyId: "wrap-v2 (hypothetical)",
  dualReadKeyIds: ["wrap-v1", "wrap-v2"],
  drillSteps: [
    "Deploy decrypt with both wrap-v1 and wrap-v2; encrypt new ciphertext with wrap-v2 only.",
    "Rewrap active rows in bounded batches, recording the key id used for each row.",
    "Verify every active row decrypts under wrap-v2 and no row still reports wrap-v1.",
    "Remove wrap-v1 from the read set only after a full soak window.",
  ],
  rollback: [
    "Keep wrap-v1 in the read set until the soak window ends.",
    "If rewrap fails mid-batch, leave unrewrapped rows readable under wrap-v1 and retry.",
    "Never delete a wrapping key while any row still references its id.",
  ],
} as const;

export const ROTATION_FAILURE_MODES = [
  {
    mode: "partial rewrap",
    symptom: "some rows still reference the old version",
    mitigation: "dual-read keeps them usable; resume the batch from the last committed id",
  },
  {
    mode: "old version removed too early",
    symptom: "valid keys return 401 with invalid_api_key",
    mitigation: "restore the old version to the read set from secret storage, then re-run the batch",
  },
  {
    mode: "ambiguous dual-read match",
    symptom: "two different key ids match one raw key",
    mitigation: "fail closed, alert operators, do not rewrite either row",
  },
] as const;
