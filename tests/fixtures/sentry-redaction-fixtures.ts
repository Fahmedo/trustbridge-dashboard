/**
 * Non-test fixtures for the Sentry PII scrubbing contract (#691).
 *
 * Every value here is deliberately fake and pattern-shaped: no real token,
 * seed, wallet, or email is present. The expected outputs mirror
 * `REDACTION_RULES` / `SENSITIVE_KEYS` in `src/lib/sentry.ts`, which is the
 * single redaction choke point (not `src/lib/error-handling.ts`).
 */

/** 55 fake base32 characters: matches the Stellar G/S pattern, is not a key. */
const FAKE_STELLAR_BODY = "FAKE".repeat(13) + "FAK";
const FAKE_SECRET_SEED = "S" + FAKE_STELLAR_BODY;
const FAKE_PUBLIC_ADDRESS = "G" + FAKE_STELLAR_BODY;
const FAKE_FINE_GRAINED_PAT = "github_pat_" + "FAKE".repeat(8);
const FAKE_CLASSIC_PAT = "ghp_" + "FAKE".repeat(8);

export interface RedactionCase<T> {
  name: string;
  input: T;
  expected: T;
}

export const SENTRY_STRING_REDACTION_CASES: readonly RedactionCase<string>[] = [
  {
    name: "GitHub fine-grained PAT",
    input: `git clone with ${FAKE_FINE_GRAINED_PAT} now`,
    expected: "git clone with [redacted:github-token] now",
  },
  {
    name: "GitHub classic PAT",
    input: `Authorization failed for ${FAKE_CLASSIC_PAT} on repo`,
    expected: "Authorization failed for [redacted:github-token] on repo",
  },
  {
    name: "Stellar secret seed (S…)",
    input: `driver seed=${FAKE_SECRET_SEED} rejected`,
    expected: "driver seed=[redacted:stellar-secret] rejected",
  },
  {
    name: "Stellar public address (G…)",
    input: `address=${FAKE_PUBLIC_ADDRESS} on testnet`,
    expected: "address=[redacted:stellar-address] on testnet",
  },
  {
    name: "credentials embedded in a connection string",
    input: "DATABASE_URL=postgresql://fake-user:fake-pass@db.example.invalid:5432/trustbridge",
    expected:
      "DATABASE_URL=postgresql://[redacted:credentials]@db.example.invalid:5432/trustbridge",
  },
  {
    name: "bearer header value",
    input: "Authorization: Bearer faketokenfaketoken123 for request",
    expected: "Authorization: Bearer [redacted:token] for request",
  },
  {
    name: "token header value (lowercase keyword)",
    input: "x-api-key: token faketokenfaketoken123",
    expected: "x-api-key: token [redacted:token]",
  },
  {
    name: "email address",
    input: "Contact contributor@example.invalid about readiness",
    expected: "Contact [redacted:email] about readiness",
  },
  {
    name: "several PII shapes in one message",
    input: `${FAKE_FINE_GRAINED_PAT} for ${FAKE_PUBLIC_ADDRESS} (contributor@example.invalid)`,
    expected:
      "[redacted:github-token] for [redacted:stellar-address] ([redacted:email])",
  },
];

export const SENTRY_CONTEXT_REDACTION_CASES: readonly RedactionCase<Record<string, unknown>>[] = [
  {
    name: "sensitive keys dropped; values under benign keys scrubbed",
    input: {
      apiKey: "tb_FAKE_KEY_DO_NOT_USE",
      access_token: "fake-access-value",
      Authorization: "Bearer faketokenfaketoken123",
      note: `Review ${FAKE_PUBLIC_ADDRESS}`,
      nested: { email: "contributor@example.invalid" },
    },
    expected: {
      apiKey: "[redacted]",
      access_token: "[redacted]",
      Authorization: "[redacted]",
      note: "Review [redacted:stellar-address]",
      nested: { email: "[redacted:email]" },
    },
  },
  {
    name: "depth cap (root is depth 0; level 7 is truncated)",
    input: {
      a: { b: { c: { d: { e: { f: { g: "should never be reported" } } } } } },
    },
    expected: {
      a: { b: { c: { d: { e: { f: { g: "[redacted:max-depth]" } } } } } },
    },
  },
];

/** Error instances are cloned, never mutated, before their strings are scrubbed. */
export const SENTRY_ERROR_REDACTION_CASE = {
  name: "error message and stack scrubbed on a clone",
  message: `horizon rejected ${FAKE_PUBLIC_ADDRESS}`,
  expectedMessage: "horizon rejected [redacted:stellar-address]",
  originalMessageMustRemainUnchanged: true,
} as const;
