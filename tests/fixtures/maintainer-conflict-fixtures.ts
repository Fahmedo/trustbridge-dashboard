/**
 * Non-test fixtures for `GET /api/maintainer/conflicts` (#692).
 *
 * The address is fake and pattern-shaped; no real wallet is represented.
 * Dates are ISO strings because that is how `NextResponse.json()` serializes
 * the `Date` values returned by `listRegistrationConflicts()`.
 */

/** One wallet, two different users attempting to claim it. */
export const TWO_USERS_ONE_WALLET = {
  attemptedAddress: "G" + "FAKE".repeat(13) + "FAK",
  claimants: [
    { userId: "user-alice", claimedAt: "2026-11-10T09:00:00.000Z" },
    { userId: "user-carol", claimedAt: "2026-11-10T09:00:00.000Z" },
  ],
  rightfulOwnerId: "user-bob",
} as const;

export interface ConflictFixture {
  id: string;
  attemptedAddress: string;
  attemptedUserId: string;
  existingUserId: string;
  createdAt: string;
  maintainerOrgId: string;
}

/**
 * `conflict-a` and `conflict-b` share a `createdAt` timestamp on purpose:
 * the API's tie-break is `id` ascending, so pagination stays stable.
 */
export const CONFLICT_FIXTURES: readonly ConflictFixture[] = [
  {
    id: "conflict-a",
    attemptedAddress: TWO_USERS_ONE_WALLET.attemptedAddress,
    attemptedUserId: "user-alice",
    existingUserId: TWO_USERS_ONE_WALLET.rightfulOwnerId,
    createdAt: "2026-11-10T09:00:00.000Z",
    maintainerOrgId: "org-demo",
  },
  {
    id: "conflict-b",
    attemptedAddress: TWO_USERS_ONE_WALLET.attemptedAddress,
    attemptedUserId: "user-carol",
    existingUserId: TWO_USERS_ONE_WALLET.rightfulOwnerId,
    createdAt: "2026-11-10T09:00:00.000Z",
    maintainerOrgId: "org-demo",
  },
  {
    id: "conflict-c",
    attemptedAddress: "G" + "OTHER".repeat(11),
    attemptedUserId: "user-dana",
    existingUserId: "user-bob",
    createdAt: "2026-11-09T12:00:00.000Z",
    maintainerOrgId: "org-demo",
  },
  {
    id: "conflict-d",
    attemptedAddress: "G" + "FAKE".repeat(10) + "OTHER".repeat(3),
    attemptedUserId: "user-erin",
    existingUserId: "user-bob",
    createdAt: "2026-11-08T08:00:00.000Z",
    maintainerOrgId: "org-demo",
  },
];

/** Canonical order: createdAt DESC, then id ASC for ties. */
export const EXPECTED_STABLE_ORDER = [
  "conflict-a",
  "conflict-b",
  "conflict-c",
  "conflict-d",
] as const;

export interface ConflictPaginationCase {
  name: string;
  query: string;
  expectedIds: readonly string[];
  expectedPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const CONFLICT_PAGINATION_CASES: readonly ConflictPaginationCase[] = [
  {
    name: "defaults",
    query: "",
    expectedIds: EXPECTED_STABLE_ORDER,
    expectedPagination: { page: 1, pageSize: 25, total: 4, totalPages: 1 },
  },
  {
    name: "first page of two",
    query: "?page=1&pageSize=2",
    expectedIds: ["conflict-a", "conflict-b"],
    expectedPagination: { page: 1, pageSize: 2, total: 4, totalPages: 2 },
  },
  {
    name: "second page of two",
    query: "?page=2&pageSize=2",
    expectedIds: ["conflict-c", "conflict-d"],
    expectedPagination: { page: 2, pageSize: 2, total: 4, totalPages: 2 },
  },
  {
    name: "page past the end is empty, not an error",
    query: "?page=3&pageSize=2",
    expectedIds: [],
    expectedPagination: { page: 3, pageSize: 2, total: 4, totalPages: 2 },
  },
  {
    name: "oversized pageSize is clamped to 100",
    query: "?pageSize=1000",
    expectedIds: EXPECTED_STABLE_ORDER,
    expectedPagination: { page: 1, pageSize: 100, total: 4, totalPages: 1 },
  },
  {
    name: "invalid values fall back to defaults",
    query: "?page=0&pageSize=abc",
    expectedIds: EXPECTED_STABLE_ORDER,
    expectedPagination: { page: 1, pageSize: 25, total: 4, totalPages: 1 },
  },
];
