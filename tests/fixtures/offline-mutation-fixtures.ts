/**
 * Non-test fixtures for the offline-mutation-disable contract (#690).
 *
 * These describe the observable states an E2E/component scenario must assert.
 * They are deliberately free of real addresses or credentials: the "G…"
 * address below is a fake, pattern-shaped value used only to prove the shape
 * of a queued mutation. See docs/PWA.md and docs/E2E_TESTING.md.
 */

export interface MutationButtonFixture {
  /** Accessible name used to locate the control in a UI scenario. */
  label: string;
  /** Native `disabled` state expected in this network state. */
  disabled: boolean;
  /** Endpoint the button would POST to when enabled. */
  mutationEndpoint: string;
}

export interface OfflineMutationStateFixture {
  name: string;
  navigatorOnLine: boolean;
  bannerVisible: boolean;
  /** Whether a new mutation may be started in this state. */
  mutationsAllowed: boolean;
  buttons: readonly MutationButtonFixture[];
}

const CRITICAL_MUTATION_BUTTONS = [
  {
    label: "Re-check all",
    mutationEndpoint: "POST /api/contributors",
  },
  {
    label: "Email nudge",
    mutationEndpoint: "POST /api/notifications/email-nudge",
  },
  {
    label: "Re-check <username> via Horizon",
    mutationEndpoint: "POST /api/contributors/:id",
  },
] as const;

/** Fake, pattern-shaped Stellar address; not a real account. */
export const FAKE_QUEUED_ADDRESS = "G" + "FAKE".repeat(13) + "FAK";

/**
 * Canonical state table. `banner` is the existing `data-testid="offline-banner"`
 * hook; buttons are located by accessible name until dedicated test ids land.
 */
export const OFFLINE_MUTATION_STATES: readonly OfflineMutationStateFixture[] = [
  {
    name: "offline",
    navigatorOnLine: false,
    bannerVisible: true,
    mutationsAllowed: false,
    buttons: CRITICAL_MUTATION_BUTTONS.map((button) => ({
      ...button,
      disabled: true,
    })),
  },
  {
    name: "online",
    navigatorOnLine: true,
    bannerVisible: false,
    mutationsAllowed: true,
    buttons: CRITICAL_MUTATION_BUTTONS.map((button) => ({
      ...button,
      disabled: false,
    })),
  },
];

/** Reconnect edge case: banner clears before the flush finishes. */
export const RECONNECT_SCENARIO = {
  name: "reconnect-flush",
  events: ["offline", "online"] as const,
  queuedEntry: {
    address: FAKE_QUEUED_ADDRESS,
    idempotencyKey: "fake-idempotency-key-0001",
    replayedInFifoOrder: true,
  },
  bannerVisibleAfterOnline: false,
  entryRemovedAfter2xx: true,
  entryRetainedOnNetworkError: true,
} as const;

/** Failure path: a mutation started online must not be silently replayed offline. */
export const MID_FLIGHT_DISCONNECT_SCENARIO = {
  name: "mid-flight-disconnect",
  inFlightMutation: "POST /api/contributors",
  newMutationsAllowedWhileOffline: false,
  partialPrivilegedStateAllowed: false,
  bannerVisible: true,
} as const;
